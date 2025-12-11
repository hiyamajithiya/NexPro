"""
Django signals for automatic Google Tasks synchronization.
Triggers sync when WorkInstance tasks are created, updated, or deleted.
"""
import logging
from django.db.models.signals import post_save, pre_delete
from django.dispatch import receiver
from django.utils import timezone

logger = logging.getLogger(__name__)


@receiver(post_save, sender='core.WorkInstance')
def sync_workinstance_to_google(sender, instance, created, **kwargs):
    """
    Auto-sync task to Google Tasks when created or updated in NexPro.

    Triggers on:
    - Task creation (especially when assigned to employee)
    - Task updates (status, due_date, remarks changes)

    Only syncs if:
    - Task is assigned to an employee
    - Employee has Google Tasks enabled
    - Organization sync settings allow it
    """
    from core.models import GoogleConnection, GoogleSyncSettings, GoogleTaskMapping
    from core.services.google_tasks_service import GoogleTasksService

    # Skip if no employee assigned
    if not instance.assigned_to:
        return

    try:
        # Check if employee has Google Tasks connected
        try:
            google_connection = GoogleConnection.objects.get(
                user=instance.assigned_to,
                status='CONNECTED',
                tasks_enabled=True
            )
        except GoogleConnection.DoesNotExist:
            # Employee doesn't have Google Tasks enabled, skip sync
            return

        # Check organization sync settings
        try:
            sync_settings = GoogleSyncSettings.objects.get(
                organization=instance.organization
            )

            # Check if task sync is enabled
            if not sync_settings.sync_tasks_to_google:
                return

            # Check filters
            if sync_settings.sync_only_assigned_tasks:
                # Already handled by checking instance.assigned_to above
                pass

            # Check work type filter
            if sync_settings.sync_work_types.exists():
                work_type = instance.client_work.work_type
                if work_type not in sync_settings.sync_work_types.all():
                    return

        except GoogleSyncSettings.DoesNotExist:
            # No sync settings, use defaults (sync enabled)
            pass

        # Skip completed tasks if configured
        if instance.status == 'COMPLETED':
            # Still sync to mark as completed in Google
            pass

        # Perform the sync
        tasks_service = GoogleTasksService(google_connection)

        # Trigger notification for newly assigned tasks
        trigger_notification = created and instance.assigned_to

        tasks_service.sync_task_to_google(
            work_instance=instance,
            sync_settings=sync_settings if 'sync_settings' in locals() else None
        )

        logger.info(
            f"Auto-synced WorkInstance {instance.id} to Google Tasks "
            f"for user {instance.assigned_to.username}"
        )

    except Exception as e:
        # Log error but don't block the save operation
        logger.error(
            f"Error auto-syncing WorkInstance {instance.id} to Google: {str(e)}",
            exc_info=True
        )


@receiver(pre_delete, sender='core.WorkInstance')
def delete_workinstance_from_google(sender, instance, **kwargs):
    """
    Delete task from Google Tasks when deleted in NexPro.

    Only deletes if:
    - Task was synced to Google (has GoogleTaskMapping)
    - Employee still has Google Tasks enabled
    """
    from core.models import GoogleConnection, GoogleTaskMapping
    from core.services.google_tasks_service import GoogleTasksService

    # Skip if no employee assigned
    if not instance.assigned_to:
        return

    try:
        # Check if task was synced to Google
        try:
            mapping = GoogleTaskMapping.objects.get(
                work_instance=instance,
                user=instance.assigned_to
            )
        except GoogleTaskMapping.DoesNotExist:
            # Task was never synced to Google, nothing to delete
            return

        # Check if employee still has Google Tasks connected
        try:
            google_connection = GoogleConnection.objects.get(
                user=instance.assigned_to,
                status='CONNECTED',
                tasks_enabled=True
            )
        except GoogleConnection.DoesNotExist:
            # Employee disconnected Google Tasks, just delete the mapping
            mapping.delete()
            return

        # Delete from Google Tasks
        tasks_service = GoogleTasksService(google_connection)
        tasks_service.delete_task_from_google(instance)

        logger.info(
            f"Auto-deleted WorkInstance {instance.id} from Google Tasks "
            f"for user {instance.assigned_to.username}"
        )

    except Exception as e:
        # Log error but don't block the delete operation
        logger.error(
            f"Error auto-deleting WorkInstance {instance.id} from Google: {str(e)}",
            exc_info=True
        )
