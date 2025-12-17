from celery import shared_task
from django.utils import timezone
from datetime import timedelta
from .models import ReminderInstance, WorkInstance
from .services.email_service import EmailService
from .services.task_service import TaskAutomationService


@shared_task
def send_pending_reminders():
    """
    Celery task to send pending reminder emails
    Runs periodically (every 10 minutes as configured in celery.py)

    IMPORTANT: For reminders with frequency (DAILY, WEEKLY, etc.), we only send
    ONE reminder per task per day, even if multiple reminders are scheduled.
    This prevents sending multiple emails when catching up on past-due reminders.
    """
    current_time = timezone.now()
    today = current_time.date()

    # Fetch pending reminders that are due (scheduled_at <= now)
    pending_reminders = ReminderInstance.objects.filter(
        send_status='PENDING',
        scheduled_at__lte=current_time
    ).select_related(
        'work_instance__client_work__client',
        'work_instance__client_work__work_type',
        'reminder_rule__email_template',
        'organization'
    ).order_by('scheduled_at')  # Process oldest first

    sent_count = 0
    failed_count = 0
    skipped_count = 0

    # Track which task+recipient combinations we've already sent to today
    # This prevents sending multiple "catch-up" reminders in one day
    sent_today = set()

    for reminder in pending_reminders:
        work_instance = reminder.work_instance

        # Skip if work is already completed
        if work_instance.status == 'COMPLETED':
            reminder.send_status = 'CANCELLED'
            reminder.save()
            continue

        # Create a unique key for this task + recipient type combination
        task_recipient_key = (work_instance.id, reminder.recipient_type, reminder.email_to)

        # Check if we've already sent a reminder for this task+recipient today
        if task_recipient_key in sent_today:
            # Skip this reminder - already sent one today for this task
            # Mark older (past-due) reminders as SKIPPED to avoid re-processing
            if reminder.scheduled_at.date() < today:
                reminder.send_status = 'SKIPPED'
                reminder.save()
            skipped_count += 1
            continue

        # Also check database for any reminder sent today for this task+recipient
        already_sent_today = ReminderInstance.objects.filter(
            work_instance=work_instance,
            recipient_type=reminder.recipient_type,
            email_to=reminder.email_to,
            send_status='SENT',
            sent_at__date=today
        ).exists()

        if already_sent_today:
            # Already sent today - skip and mark old ones as SKIPPED
            if reminder.scheduled_at.date() < today:
                reminder.send_status = 'SKIPPED'
                reminder.save()
            skipped_count += 1
            continue

        # Send email
        success, error_message = EmailService.send_reminder_email(reminder)

        if success:
            reminder.send_status = 'SENT'
            reminder.sent_at = current_time
            reminder.error_message = None
            sent_count += 1

            # Mark that we've sent to this task+recipient today
            sent_today.add(task_recipient_key)

            # Handle repeating reminders (for rule-based reminders with repeat_if_pending)
            if reminder.reminder_rule and reminder.reminder_rule.repeat_if_pending:
                if reminder.repeat_count < reminder.reminder_rule.max_repeats:
                    # Create next repeat instance
                    next_scheduled = current_time + timedelta(
                        days=reminder.reminder_rule.repeat_interval
                    )
                    ReminderInstance.objects.create(
                        organization=reminder.organization,
                        work_instance=work_instance,
                        reminder_rule=reminder.reminder_rule,
                        recipient_type=reminder.recipient_type,
                        scheduled_at=next_scheduled,
                        email_to=reminder.email_to,
                        send_status='PENDING',
                        repeat_count=reminder.repeat_count + 1
                    )
        else:
            reminder.send_status = 'FAILED'
            reminder.error_message = error_message
            failed_count += 1

        reminder.last_attempt_at = current_time
        reminder.save()

    return {
        'sent': sent_count,
        'failed': failed_count,
        'skipped': skipped_count,
        'total_processed': sent_count + failed_count + skipped_count
    }


@shared_task
def mark_overdue_tasks():
    """
    Celery task to mark tasks as overdue
    Runs daily at 12:30 AM as configured in celery.py
    """
    count = TaskAutomationService.mark_overdue_tasks()
    return {'overdue_count': count}


@shared_task
def auto_start_tasks():
    """
    Celery task to auto-start tasks on their reminder start day.
    Runs daily at 6:00 AM as configured in celery.py.

    For auto-driven task categories, it will:
    1. Find all NOT_STARTED tasks where today >= reminder start day
    2. Change their status to STARTED
    3. Set the started_on date

    Returns:
        dict: Statistics about the auto-start operation
    """
    import logging
    from datetime import date

    logger = logging.getLogger(__name__)
    today = date.today()

    logger.info(f"Starting auto-start tasks processing for {today}")

    # Find all NOT_STARTED tasks for auto-driven work types
    not_started_tasks = WorkInstance.objects.filter(
        status='NOT_STARTED',
        client_work__work_type__is_auto_driven=True,
        client_work__work_type__auto_start_on_creation=True,
        client_work__work_type__is_active=True
    ).select_related(
        'client_work__client',
        'client_work__work_type',
        'organization'
    )

    total_started = 0
    total_skipped = 0
    total_errors = 0

    for task in not_started_tasks:
        try:
            work_type = task.client_work.work_type
            client = task.client_work.client

            # Get reminder start day from work type configuration
            reminder_start_day = work_type.client_reminder_start_day if work_type.enable_client_reminders else 1

            # Calculate the reminder start date for this task's period
            period_start = task.period_start
            if not period_start:
                logger.warning(
                    f"Skipping task {task.id} ({client.client_name} - {task.period_label}): "
                    f"No period_start date"
                )
                total_skipped += 1
                continue

            try:
                # Handle months with fewer days
                reminder_start_date = period_start.replace(day=min(reminder_start_day, 28))
            except ValueError:
                reminder_start_date = period_start.replace(day=28)

            # Check if today is on or after the reminder start date
            if today >= reminder_start_date:
                # Update task status to STARTED
                task.status = 'STARTED'
                task.started_on = today
                task.save(update_fields=['status', 'started_on'])

                logger.info(
                    f"Auto-started task: {client.client_name} - {work_type.work_name} - "
                    f"{task.period_label} (Reminder start: {reminder_start_date})"
                )
                total_started += 1
            else:
                days_until = (reminder_start_date - today).days
                logger.debug(
                    f"Task pending: {client.client_name} - {work_type.work_name} - "
                    f"{task.period_label} starts in {days_until} days"
                )
                total_skipped += 1

        except Exception as e:
            total_errors += 1
            logger.error(f"Error auto-starting task {task.id}: {str(e)}", exc_info=True)

    result = {
        'total_started': total_started,
        'total_skipped': total_skipped,
        'total_errors': total_errors,
        'date': str(today)
    }

    logger.info(f"Auto-start tasks completed: {result}")
    return result


@shared_task
def test_email_task(email_to):
    """
    Test task to verify email configuration
    """
    from django.core.mail import send_mail
    from django.conf import settings

    try:
        send_mail(
            subject='NexPro Test Email',
            message='This is a test email from NexPro application.',
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[email_to],
            fail_silently=False,
        )
        return {'status': 'success', 'email': email_to}
    except Exception as e:
        return {'status': 'failed', 'error': str(e)}


@shared_task
def sync_google_tasks_to_nexpro():
    """
    Celery task to sync changes from Google Tasks back to NexPro.
    Runs periodically (every 5 minutes as configured in celery.py)

    For each user with Google Tasks enabled:
    1. Fetch all tasks from their Google Task list
    2. Compare with GoogleTaskMapping records
    3. Identify tasks updated in Google (newer google_updated_at)
    4. Update corresponding NexPro WorkInstances
    5. Log all operations

    Returns:
        dict: Statistics about the sync operation
    """
    import logging
    from django.utils import timezone
    from datetime import datetime
    from .models import GoogleConnection, GoogleTaskMapping, GoogleSyncLog
    from .services.google_tasks_service import GoogleTasksService

    logger = logging.getLogger(__name__)
    logger.info("Starting periodic Google Tasks → NexPro sync")

    # Statistics
    total_users = 0
    total_tasks_checked = 0
    total_tasks_updated = 0
    total_tasks_skipped = 0
    total_errors = 0

    # Get all users with active Google Tasks connection
    active_connections = GoogleConnection.objects.filter(
        status='CONNECTED',
        tasks_enabled=True
    ).select_related('user')

    total_users = active_connections.count()
    logger.info(f"Found {total_users} users with active Google Tasks connection")

    for google_connection in active_connections:
        user = google_connection.user
        logger.info(f"Syncing Google Tasks for user: {user.username}")

        try:
            # Initialize Google Tasks service
            tasks_service = GoogleTasksService(google_connection)

            # Fetch all tasks from Google
            google_tasks = tasks_service.get_all_google_tasks()

            if not google_tasks:
                logger.info(f"No Google Tasks found for user {user.username}")
                continue

            total_tasks_checked += len(google_tasks)
            logger.info(f"Found {len(google_tasks)} tasks in Google Tasks for {user.username}")

            # Process each Google Task
            for google_task in google_tasks:
                google_task_id = google_task.get('id')
                google_updated_str = google_task.get('updated')

                if not google_task_id or not google_updated_str:
                    continue

                try:
                    # Check if we have a mapping for this task
                    try:
                        mapping = GoogleTaskMapping.objects.get(
                            google_task_id=google_task_id,
                            user=user
                        )
                    except GoogleTaskMapping.DoesNotExist:
                        # No mapping found - this task wasn't created from NexPro
                        # Skip it (we only sync tasks that originated from NexPro)
                        continue

                    # Parse Google's updated timestamp
                    google_updated_dt = datetime.fromisoformat(
                        google_updated_str.replace('Z', '+00:00')
                    )

                    # Check if Google has newer changes than our last sync
                    if mapping.google_updated_at:
                        stored_google_updated = mapping.google_updated_at
                        if hasattr(stored_google_updated, 'tzinfo') and stored_google_updated.tzinfo is None:
                            # Make it timezone-aware
                            stored_google_updated = timezone.make_aware(stored_google_updated)

                        if google_updated_dt <= stored_google_updated:
                            # No new changes in Google, skip
                            total_tasks_skipped += 1
                            continue

                    # Also check if NexPro was updated more recently
                    if mapping.nexpro_updated_at:
                        nexpro_updated = mapping.nexpro_updated_at
                        if hasattr(nexpro_updated, 'tzinfo') and nexpro_updated.tzinfo is None:
                            nexpro_updated = timezone.make_aware(nexpro_updated)

                        if nexpro_updated > google_updated_dt:
                            # NexPro has newer changes, don't overwrite
                            logger.info(
                                f"Skipping task {google_task_id}: "
                                f"NexPro updated more recently"
                            )
                            total_tasks_skipped += 1
                            continue

                    # Sync the task from Google to NexPro
                    logger.info(f"Syncing task {google_task_id} from Google to NexPro")
                    work_instance = tasks_service.sync_task_from_google(
                        google_task_id=google_task_id,
                        tasklist_id=google_connection.tasks_list_id
                    )

                    if work_instance:
                        total_tasks_updated += 1
                        logger.info(
                            f"Successfully synced task {google_task_id} "
                            f"to WorkInstance {work_instance.id}"
                        )

                except Exception as task_error:
                    total_errors += 1
                    logger.error(
                        f"Error syncing task {google_task_id} for user {user.username}: "
                        f"{str(task_error)}",
                        exc_info=True
                    )
                    # Log the error but continue with other tasks
                    try:
                        GoogleSyncLog.objects.create(
                            organization=google_connection.user.organization,
                            user=user,
                            sync_type='TASK_FROM_GOOGLE',
                            status='FAILED',
                            google_task_id=google_task_id,
                            error_message=str(task_error)
                        )
                    except Exception:
                        pass

        except Exception as user_error:
            total_errors += 1
            logger.error(
                f"Error syncing Google Tasks for user {user.username}: {str(user_error)}",
                exc_info=True
            )
            # Continue with next user

    # Return statistics
    result = {
        'total_users': total_users,
        'total_tasks_checked': total_tasks_checked,
        'total_tasks_updated': total_tasks_updated,
        'total_tasks_skipped': total_tasks_skipped,
        'total_errors': total_errors,
        'timestamp': timezone.now().isoformat()
    }

    logger.info(f"Google Tasks sync completed: {result}")
    return result
