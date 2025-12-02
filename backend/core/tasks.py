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
    """
    current_time = timezone.now()

    # Fetch pending reminders that are due
    pending_reminders = ReminderInstance.objects.filter(
        send_status='PENDING',
        scheduled_at__lte=current_time
    ).select_related(
        'work_instance__client_work__client',
        'work_instance__client_work__work_type',
        'reminder_rule__email_template'
    )

    sent_count = 0
    failed_count = 0

    for reminder in pending_reminders:
        work_instance = reminder.work_instance

        # Skip if work is already completed
        if work_instance.status == 'COMPLETED':
            reminder.send_status = 'CANCELLED'
            reminder.save()
            continue

        # Send email
        success, error_message = EmailService.send_reminder_email(reminder)

        if success:
            reminder.send_status = 'SENT'
            reminder.sent_at = current_time
            reminder.error_message = None
            sent_count += 1

            # Handle repeating reminders
            if reminder.reminder_rule.repeat_if_pending:
                if reminder.repeat_count < reminder.reminder_rule.max_repeats:
                    # Create next repeat instance
                    next_scheduled = current_time + timedelta(
                        days=reminder.reminder_rule.repeat_interval
                    )
                    ReminderInstance.objects.create(
                        work_instance=work_instance,
                        reminder_rule=reminder.reminder_rule,
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
        'total_processed': sent_count + failed_count
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
