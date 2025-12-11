"""
Google Tasks Sync Service for NexPro
Handles synchronization between NexPro tasks and Google Tasks.
"""

import logging
from datetime import datetime, date
from django.utils import timezone
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

from .google_oauth_service import GoogleOAuthService

logger = logging.getLogger(__name__)


class GoogleTasksService:
    """
    Service for syncing NexPro WorkInstances with Google Tasks.
    Supports two-way sync with conflict detection.
    """

    def __init__(self, google_connection):
        """
        Initialize with a GoogleConnection object.
        """
        self.google_connection = google_connection
        self.credentials = None
        self.service = None

    def _get_service(self):
        """
        Get authenticated Google Tasks service.
        """
        if not self.service:
            self.credentials = GoogleOAuthService.get_credentials_from_connection(self.google_connection)
            if not self.credentials:
                raise ValueError("Failed to get valid credentials")
            self.service = build('tasks', 'v1', credentials=self.credentials)
        return self.service

    def get_or_create_tasklist(self, title='NexPro Tasks'):
        """
        Get or create a task list for NexPro tasks.
        Returns the tasklist ID.
        """
        service = self._get_service()

        try:
            # Check if we already have a tasklist ID stored
            if self.google_connection.tasks_list_id:
                # Verify it still exists
                try:
                    tasklist = service.tasklists().get(
                        tasklist=self.google_connection.tasks_list_id
                    ).execute()
                    return tasklist['id']
                except HttpError as e:
                    if e.resp.status == 404:
                        # Task list was deleted, create a new one
                        self.google_connection.tasks_list_id = None
                    else:
                        raise

            # Look for existing NexPro tasklist
            tasklists = service.tasklists().list().execute()
            for tasklist in tasklists.get('items', []):
                if tasklist.get('title') == title:
                    self.google_connection.tasks_list_id = tasklist['id']
                    self.google_connection.save(update_fields=['tasks_list_id'])
                    return tasklist['id']

            # Create new tasklist
            new_tasklist = service.tasklists().insert(body={'title': title}).execute()
            self.google_connection.tasks_list_id = new_tasklist['id']
            self.google_connection.save(update_fields=['tasks_list_id'])

            logger.info(f"Created new Google Tasks list: {new_tasklist['id']}")
            return new_tasklist['id']

        except HttpError as e:
            logger.error(f"Error getting/creating tasklist: {str(e)}")
            raise

    def sync_task_to_google(self, work_instance, sync_settings=None):
        """
        Sync a NexPro WorkInstance to Google Tasks.
        Creates or updates the corresponding Google Task.
        Returns the GoogleTaskMapping object.
        """
        from core.models import GoogleTaskMapping, GoogleSyncLog

        service = self._get_service()
        tasklist_id = self.get_or_create_tasklist()

        # Build task data
        task_data = self._build_google_task_data(work_instance)

        try:
            # Check if we have an existing mapping
            try:
                mapping = GoogleTaskMapping.objects.get(
                    work_instance=work_instance,
                    user=self.google_connection.user
                )
                # Update existing task
                google_task = service.tasks().update(
                    tasklist=tasklist_id,
                    task=mapping.google_task_id,
                    body=task_data
                ).execute()

                mapping.nexpro_updated_at = work_instance.updated_at
                mapping.google_updated_at = google_task.get('updated')
                mapping.save()

                # Log the sync
                GoogleSyncLog.objects.create(
                    organization=work_instance.organization,
                    user=self.google_connection.user,
                    sync_type='TASK_TO_GOOGLE',
                    status='SUCCESS',
                    work_instance=work_instance,
                    google_task_id=google_task['id'],
                    details=f"Updated task: {task_data.get('title')}"
                )

                logger.info(f"Updated Google Task {google_task['id']} for WorkInstance {work_instance.id}")

            except GoogleTaskMapping.DoesNotExist:
                # Create new task
                google_task = service.tasks().insert(
                    tasklist=tasklist_id,
                    body=task_data
                ).execute()

                mapping = GoogleTaskMapping.objects.create(
                    organization=work_instance.organization,
                    work_instance=work_instance,
                    user=self.google_connection.user,
                    google_task_id=google_task['id'],
                    google_tasklist_id=tasklist_id,
                    nexpro_updated_at=work_instance.updated_at,
                    google_updated_at=google_task.get('updated')
                )

                # Log the sync
                GoogleSyncLog.objects.create(
                    organization=work_instance.organization,
                    user=self.google_connection.user,
                    sync_type='TASK_TO_GOOGLE',
                    status='SUCCESS',
                    work_instance=work_instance,
                    google_task_id=google_task['id'],
                    details=f"Created task: {task_data.get('title')}"
                )

                logger.info(f"Created Google Task {google_task['id']} for WorkInstance {work_instance.id}")

            # Update last sync time
            self.google_connection.last_sync_at = timezone.now()
            self.google_connection.save(update_fields=['last_sync_at'])

            return mapping

        except HttpError as e:
            logger.error(f"Error syncing task to Google: {str(e)}")

            # Log the error
            GoogleSyncLog.objects.create(
                organization=work_instance.organization,
                user=self.google_connection.user,
                sync_type='TASK_TO_GOOGLE',
                status='FAILED',
                work_instance=work_instance,
                error_message=str(e)
            )
            raise

    def sync_task_from_google(self, google_task_id, tasklist_id=None):
        """
        Sync changes from Google Task back to NexPro.
        Used for two-way sync.
        """
        from core.models import GoogleTaskMapping, GoogleSyncLog, WorkInstance

        service = self._get_service()
        tasklist_id = tasklist_id or self.google_connection.tasks_list_id

        if not tasklist_id:
            logger.warning("No tasklist ID available for sync from Google")
            return None

        try:
            # Get the Google Task
            google_task = service.tasks().get(
                tasklist=tasklist_id,
                task=google_task_id
            ).execute()

            # Find the mapping
            try:
                mapping = GoogleTaskMapping.objects.get(
                    google_task_id=google_task_id,
                    user=self.google_connection.user
                )
            except GoogleTaskMapping.DoesNotExist:
                logger.warning(f"No mapping found for Google Task {google_task_id}")
                return None

            work_instance = mapping.work_instance

            # Check for conflicts - if NexPro was updated after Google
            google_updated = google_task.get('updated')
            if google_updated:
                google_updated_dt = datetime.fromisoformat(google_updated.replace('Z', '+00:00'))

                # Only sync if Google has newer changes
                if mapping.nexpro_updated_at and mapping.nexpro_updated_at > google_updated_dt:
                    logger.info(f"Skipping sync from Google - NexPro has newer changes")
                    return None

            # Update NexPro task based on Google Task status
            if google_task.get('status') == 'completed':
                if work_instance.status != 'COMPLETED':
                    work_instance.status = 'COMPLETED'
                    work_instance.completed_on = timezone.now().date()
            elif google_task.get('status') == 'needsAction':
                if work_instance.status == 'COMPLETED':
                    work_instance.status = 'STARTED'
                    work_instance.completed_on = None

            # Update due date if changed
            if google_task.get('due'):
                due_date_str = google_task['due'][:10]  # Get YYYY-MM-DD part
                new_due_date = datetime.strptime(due_date_str, '%Y-%m-%d').date()
                work_instance.due_date = new_due_date

            work_instance.save()

            # Update mapping with current timestamps
            mapping.google_updated_at = google_updated_dt
            mapping.nexpro_updated_at = timezone.now()
            mapping.save()

            # Update connection's last sync time
            self.google_connection.last_sync_at = timezone.now()
            self.google_connection.save(update_fields=['last_sync_at'])

            # Log the sync
            GoogleSyncLog.objects.create(
                organization=work_instance.organization,
                user=self.google_connection.user,
                sync_type='TASK_FROM_GOOGLE',
                status='SUCCESS',
                work_instance=work_instance,
                google_task_id=google_task_id,
                details=f"Synced from Google: status={google_task.get('status')}"
            )

            logger.info(f"Synced Google Task {google_task_id} to WorkInstance {work_instance.id}")
            return work_instance

        except HttpError as e:
            logger.error(f"Error syncing task from Google: {str(e)}")
            raise

    def delete_task_from_google(self, work_instance):
        """
        Delete a task from Google Tasks when deleted in NexPro.
        """
        from core.models import GoogleTaskMapping, GoogleSyncLog

        try:
            mapping = GoogleTaskMapping.objects.get(
                work_instance=work_instance,
                user=self.google_connection.user
            )
        except GoogleTaskMapping.DoesNotExist:
            return  # No mapping, nothing to delete

        service = self._get_service()

        try:
            service.tasks().delete(
                tasklist=mapping.google_tasklist_id,
                task=mapping.google_task_id
            ).execute()

            # Log the deletion
            GoogleSyncLog.objects.create(
                organization=work_instance.organization,
                user=self.google_connection.user,
                sync_type='TASK_TO_GOOGLE',
                status='SUCCESS',
                details=f"Deleted Google Task {mapping.google_task_id}"
            )

            # Delete the mapping
            mapping.delete()

            logger.info(f"Deleted Google Task for WorkInstance {work_instance.id}")

        except HttpError as e:
            if e.resp.status != 404:  # Ignore if already deleted
                logger.error(f"Error deleting task from Google: {str(e)}")
                raise

    def sync_all_tasks(self, work_instances=None):
        """
        Sync all tasks for the connected user.
        If work_instances is None, syncs all assigned tasks.
        """
        from core.models import WorkInstance, GoogleSyncSettings

        user = self.google_connection.user
        organization = self.google_connection.organization

        # Get sync settings
        try:
            sync_settings = GoogleSyncSettings.objects.get(organization=organization)
        except GoogleSyncSettings.DoesNotExist:
            sync_settings = None

        # Get tasks to sync
        if work_instances is None:
            queryset = WorkInstance.objects.filter(organization=organization)

            # Apply filters based on sync settings
            if sync_settings:
                if sync_settings.sync_only_assigned_tasks:
                    queryset = queryset.filter(assigned_to=user)

                if sync_settings.sync_work_types.exists():
                    work_type_ids = sync_settings.sync_work_types.values_list('id', flat=True)
                    queryset = queryset.filter(client_work__work_type_id__in=work_type_ids)

            work_instances = queryset.exclude(status='COMPLETED')

        synced_count = 0
        error_count = 0

        for work_instance in work_instances:
            try:
                self.sync_task_to_google(work_instance, sync_settings)
                synced_count += 1
            except Exception as e:
                logger.error(f"Error syncing WorkInstance {work_instance.id}: {str(e)}")
                error_count += 1

        logger.info(f"Bulk sync completed: {synced_count} synced, {error_count} errors")
        return synced_count, error_count

    def _build_google_task_data(self, work_instance):
        """
        Build Google Task data from a NexPro WorkInstance.
        """
        client_work = work_instance.client_work
        client = client_work.client
        work_type = client_work.work_type

        # Build title
        title = f"{client.client_name} - {work_type.work_name}"
        if work_instance.period_label:
            title += f" ({work_instance.period_label})"

        # Build notes/description
        notes_parts = [
            f"Client: {client.client_name}",
            f"Work Type: {work_type.work_name}",
            f"Period: {work_instance.period_label}",
            f"Status: {work_instance.get_status_display()}",
        ]

        if work_instance.assigned_to:
            notes_parts.append(f"Assigned to: {work_instance.assigned_to.get_full_name() or work_instance.assigned_to.email}")

        if work_instance.remarks:
            notes_parts.append(f"\nRemarks: {work_instance.remarks}")

        notes_parts.append(f"\n[NexPro Task ID: {work_instance.id}]")

        notes = "\n".join(notes_parts)

        # Build task data
        task_data = {
            'title': title[:1024],  # Google Tasks title limit
            'notes': notes[:8192],  # Google Tasks notes limit
        }

        # Add due date in RFC 3339 format
        if work_instance.due_date:
            due_date = work_instance.due_date
            if isinstance(due_date, date):
                task_data['due'] = due_date.strftime('%Y-%m-%dT00:00:00.000Z')

        # Set status
        if work_instance.status == 'COMPLETED':
            task_data['status'] = 'completed'
        else:
            task_data['status'] = 'needsAction'

        return task_data

    def get_all_google_tasks(self):
        """
        Get all tasks from the NexPro tasklist.
        """
        service = self._get_service()
        tasklist_id = self.google_connection.tasks_list_id

        if not tasklist_id:
            return []

        try:
            results = service.tasks().list(
                tasklist=tasklist_id,
                showCompleted=True,
                showHidden=True
            ).execute()

            return results.get('items', [])

        except HttpError as e:
            logger.error(f"Error fetching Google Tasks: {str(e)}")
            return []
