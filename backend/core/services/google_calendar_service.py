"""
Google Calendar Sync Service for NexPro
Handles synchronization between NexPro tasks and Google Calendar events.
"""

import logging
from datetime import datetime, date, timedelta
from django.utils import timezone
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

from .google_oauth_service import GoogleOAuthService

logger = logging.getLogger(__name__)


class GoogleCalendarService:
    """
    Service for syncing NexPro WorkInstances with Google Calendar.
    Creates calendar events with reminders based on admin settings.
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
        Get authenticated Google Calendar service.
        """
        if not self.service:
            self.credentials = GoogleOAuthService.get_credentials_from_connection(self.google_connection)
            if not self.credentials:
                raise ValueError("Failed to get valid credentials")
            self.service = build('calendar', 'v3', credentials=self.credentials)
        return self.service

    def get_calendar_id(self):
        """
        Get the calendar ID to use for sync.
        Returns user's primary calendar or the configured one.
        """
        if self.google_connection.calendar_id:
            return self.google_connection.calendar_id
        return 'primary'  # Use primary calendar by default

    def get_calendars(self):
        """
        Get list of user's calendars.
        """
        service = self._get_service()

        try:
            results = service.calendarList().list().execute()
            return results.get('items', [])
        except HttpError as e:
            logger.error(f"Error fetching calendars: {str(e)}")
            return []

    def sync_task_to_calendar(self, work_instance, sync_settings=None):
        """
        Sync a NexPro WorkInstance to Google Calendar.
        Creates or updates the corresponding calendar event with reminders.
        """
        from core.models import GoogleCalendarMapping, GoogleSyncLog, GoogleSyncSettings

        service = self._get_service()
        calendar_id = self.get_calendar_id()

        # Get sync settings for reminder configuration
        if sync_settings is None:
            try:
                sync_settings = GoogleSyncSettings.objects.get(
                    organization=self.google_connection.organization
                )
            except GoogleSyncSettings.DoesNotExist:
                sync_settings = None

        # Build event data
        event_data = self._build_calendar_event_data(work_instance, sync_settings)

        try:
            # Check if we have an existing mapping
            try:
                mapping = GoogleCalendarMapping.objects.get(
                    work_instance=work_instance,
                    user=self.google_connection.user
                )
                # Update existing event
                google_event = service.events().update(
                    calendarId=calendar_id,
                    eventId=mapping.google_event_id,
                    body=event_data
                ).execute()

                mapping.nexpro_updated_at = work_instance.updated_at
                mapping.google_updated_at = google_event.get('updated')
                mapping.save()

                # Log the sync
                GoogleSyncLog.objects.create(
                    organization=work_instance.organization,
                    user=self.google_connection.user,
                    sync_type='CALENDAR_TO_GOOGLE',
                    status='SUCCESS',
                    work_instance=work_instance,
                    google_event_id=google_event['id'],
                    details=f"Updated event: {event_data.get('summary')}"
                )

                logger.info(f"Updated Calendar Event {google_event['id']} for WorkInstance {work_instance.id}")

            except GoogleCalendarMapping.DoesNotExist:
                # Create new event
                google_event = service.events().insert(
                    calendarId=calendar_id,
                    body=event_data
                ).execute()

                mapping = GoogleCalendarMapping.objects.create(
                    organization=work_instance.organization,
                    work_instance=work_instance,
                    user=self.google_connection.user,
                    google_event_id=google_event['id'],
                    google_calendar_id=calendar_id,
                    nexpro_updated_at=work_instance.updated_at,
                    google_updated_at=google_event.get('updated')
                )

                # Log the sync
                GoogleSyncLog.objects.create(
                    organization=work_instance.organization,
                    user=self.google_connection.user,
                    sync_type='CALENDAR_TO_GOOGLE',
                    status='SUCCESS',
                    work_instance=work_instance,
                    google_event_id=google_event['id'],
                    details=f"Created event: {event_data.get('summary')}"
                )

                logger.info(f"Created Calendar Event {google_event['id']} for WorkInstance {work_instance.id}")

            # Update last sync time
            self.google_connection.last_sync_at = timezone.now()
            self.google_connection.save(update_fields=['last_sync_at'])

            return mapping

        except HttpError as e:
            logger.error(f"Error syncing task to Calendar: {str(e)}")

            # Log the error
            GoogleSyncLog.objects.create(
                organization=work_instance.organization,
                user=self.google_connection.user,
                sync_type='CALENDAR_TO_GOOGLE',
                status='FAILED',
                work_instance=work_instance,
                error_message=str(e)
            )
            raise

    def sync_event_from_calendar(self, google_event_id, calendar_id=None):
        """
        Sync changes from Google Calendar back to NexPro.
        Used for two-way sync.
        """
        from core.models import GoogleCalendarMapping, GoogleSyncLog

        service = self._get_service()
        calendar_id = calendar_id or self.get_calendar_id()

        try:
            # Get the Google Event
            google_event = service.events().get(
                calendarId=calendar_id,
                eventId=google_event_id
            ).execute()

            # Find the mapping
            try:
                mapping = GoogleCalendarMapping.objects.get(
                    google_event_id=google_event_id,
                    user=self.google_connection.user
                )
            except GoogleCalendarMapping.DoesNotExist:
                logger.warning(f"No mapping found for Calendar Event {google_event_id}")
                return None

            work_instance = mapping.work_instance

            # Check for conflicts
            google_updated = google_event.get('updated')
            if google_updated:
                google_updated_dt = datetime.fromisoformat(google_updated.replace('Z', '+00:00'))

                if mapping.nexpro_updated_at and mapping.nexpro_updated_at > google_updated_dt:
                    logger.info(f"Skipping sync from Calendar - NexPro has newer changes")
                    return None

            # Update due date from event
            start = google_event.get('start', {})
            if start.get('date'):
                new_due_date = datetime.strptime(start['date'], '%Y-%m-%d').date()
                work_instance.due_date = new_due_date
            elif start.get('dateTime'):
                new_due_date = datetime.fromisoformat(start['dateTime'].replace('Z', '+00:00')).date()
                work_instance.due_date = new_due_date

            # Check if event was cancelled/deleted
            if google_event.get('status') == 'cancelled':
                # Don't delete the task, just log it
                GoogleSyncLog.objects.create(
                    organization=work_instance.organization,
                    user=self.google_connection.user,
                    sync_type='CALENDAR_FROM_GOOGLE',
                    status='SKIPPED',
                    work_instance=work_instance,
                    google_event_id=google_event_id,
                    details="Event was cancelled in Google Calendar"
                )
                return None

            work_instance.save()

            # Update mapping
            mapping.google_updated_at = google_updated
            mapping.save()

            # Log the sync
            GoogleSyncLog.objects.create(
                organization=work_instance.organization,
                user=self.google_connection.user,
                sync_type='CALENDAR_FROM_GOOGLE',
                status='SUCCESS',
                work_instance=work_instance,
                google_event_id=google_event_id,
                details=f"Synced from Calendar: due_date={work_instance.due_date}"
            )

            logger.info(f"Synced Calendar Event {google_event_id} to WorkInstance {work_instance.id}")
            return work_instance

        except HttpError as e:
            logger.error(f"Error syncing event from Calendar: {str(e)}")
            raise

    def delete_event_from_calendar(self, work_instance):
        """
        Delete a calendar event when task is deleted or completed.
        """
        from core.models import GoogleCalendarMapping, GoogleSyncLog

        try:
            mapping = GoogleCalendarMapping.objects.get(
                work_instance=work_instance,
                user=self.google_connection.user
            )
        except GoogleCalendarMapping.DoesNotExist:
            return  # No mapping, nothing to delete

        service = self._get_service()

        try:
            service.events().delete(
                calendarId=mapping.google_calendar_id,
                eventId=mapping.google_event_id
            ).execute()

            # Log the deletion
            GoogleSyncLog.objects.create(
                organization=work_instance.organization,
                user=self.google_connection.user,
                sync_type='CALENDAR_TO_GOOGLE',
                status='SUCCESS',
                details=f"Deleted Calendar Event {mapping.google_event_id}"
            )

            # Delete the mapping
            mapping.delete()

            logger.info(f"Deleted Calendar Event for WorkInstance {work_instance.id}")

        except HttpError as e:
            if e.resp.status != 404 and e.resp.status != 410:  # Ignore if already deleted
                logger.error(f"Error deleting event from Calendar: {str(e)}")
                raise

    def sync_all_tasks(self, work_instances=None):
        """
        Sync all tasks for the connected user to Calendar.
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

            if sync_settings:
                if sync_settings.sync_only_assigned_tasks:
                    queryset = queryset.filter(assigned_to=user)

                if sync_settings.sync_work_types.exists():
                    work_type_ids = sync_settings.sync_work_types.values_list('id', flat=True)
                    queryset = queryset.filter(client_work__work_type_id__in=work_type_ids)

            # Only sync non-completed tasks with future due dates
            work_instances = queryset.exclude(status='COMPLETED').filter(
                due_date__gte=timezone.now().date()
            )

        synced_count = 0
        error_count = 0

        for work_instance in work_instances:
            try:
                self.sync_task_to_calendar(work_instance, sync_settings)
                synced_count += 1
            except Exception as e:
                logger.error(f"Error syncing WorkInstance {work_instance.id} to Calendar: {str(e)}")
                error_count += 1

        logger.info(f"Calendar bulk sync completed: {synced_count} synced, {error_count} errors")
        return synced_count, error_count

    def _build_calendar_event_data(self, work_instance, sync_settings=None):
        """
        Build Google Calendar event data from a NexPro WorkInstance.
        """
        client_work = work_instance.client_work
        client = client_work.client
        work_type = client_work.work_type

        # Build summary (title)
        summary = f"[NexPro] {client.client_name} - {work_type.work_name}"
        if work_instance.period_label:
            summary += f" ({work_instance.period_label})"

        # Build description
        description_parts = [
            f"📋 Task Details",
            f"━━━━━━━━━━━━━━━━━━━━",
            f"Client: {client.client_name}",
            f"Work Type: {work_type.work_name}",
            f"Period: {work_instance.period_label}",
            f"Status: {work_instance.get_status_display()}",
            f"Due Date: {work_instance.due_date.strftime('%B %d, %Y')}",
        ]

        if work_instance.assigned_to:
            description_parts.append(f"Assigned to: {work_instance.assigned_to.get_full_name() or work_instance.assigned_to.email}")

        if work_instance.remarks:
            description_parts.append(f"\n📝 Remarks:\n{work_instance.remarks}")

        description_parts.append(f"\n━━━━━━━━━━━━━━━━━━━━")
        description_parts.append(f"[NexPro Task ID: {work_instance.id}]")

        description = "\n".join(description_parts)

        # Build event data
        event_data = {
            'summary': summary[:1024],
            'description': description,
            'start': {
                'date': work_instance.due_date.strftime('%Y-%m-%d'),
            },
            'end': {
                'date': work_instance.due_date.strftime('%Y-%m-%d'),
            },
            'transparency': 'transparent',  # Show as free
        }

        # Add color based on status
        color_map = {
            'NOT_STARTED': '8',     # Gray
            'STARTED': '5',         # Yellow
            'PAUSED': '6',          # Orange
            'COMPLETED': '10',      # Green
            'OVERDUE': '11',        # Red
        }
        event_data['colorId'] = color_map.get(work_instance.status, '8')

        # Add reminders based on sync settings
        reminders = []
        if sync_settings:
            reminder_minutes = sync_settings.get_reminder_minutes_list()

            for minutes in reminder_minutes:
                if sync_settings.reminder_method_popup:
                    reminders.append({
                        'method': 'popup',
                        'minutes': minutes
                    })
                if sync_settings.reminder_method_email:
                    reminders.append({
                        'method': 'email',
                        'minutes': minutes
                    })
        else:
            # Default reminders: 1 day and 1 hour before
            reminders = [
                {'method': 'popup', 'minutes': 1440},
                {'method': 'popup', 'minutes': 60},
                {'method': 'email', 'minutes': 1440},
            ]

        event_data['reminders'] = {
            'useDefault': False,
            'overrides': reminders[:5]  # Google allows max 5 reminders
        }

        return event_data

    def get_upcoming_events(self, days=7):
        """
        Get upcoming events from Google Calendar.
        """
        service = self._get_service()
        calendar_id = self.get_calendar_id()

        now = datetime.utcnow().isoformat() + 'Z'
        end = (datetime.utcnow() + timedelta(days=days)).isoformat() + 'Z'

        try:
            results = service.events().list(
                calendarId=calendar_id,
                timeMin=now,
                timeMax=end,
                singleEvents=True,
                orderBy='startTime'
            ).execute()

            return results.get('items', [])

        except HttpError as e:
            logger.error(f"Error fetching upcoming events: {str(e)}")
            return []
