"""
Django management command to send reminders for auto-driven work types.
This command sends reminders to clients for auto-driven tasks (like GSR-1 document collection)
continuously from reminder_start_date until due_date or task completion.

Should be run daily via cron/scheduler.
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import datetime, date, timedelta
from core.models import WorkInstance, ReminderInstance, WorkType
from core.services.email_service import EmailService


class Command(BaseCommand):
    help = 'Send reminders for auto-driven work types (runs continuously until task is completed)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Perform a dry run without sending emails',
        )
        parser.add_argument(
            '--work-type-id',
            type=int,
            help='Only process a specific work type by ID',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        work_type_id = options.get('work_type_id')

        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN MODE - No emails will be sent'))

        today = date.today()
        now = timezone.now()

        self.stdout.write(f'\n{"=" * 60}')
        self.stdout.write(f'Auto-Driven Reminder Processing - {today}')
        self.stdout.write(f'{"=" * 60}\n')

        # Get all auto-driven work types
        auto_driven_work_types = WorkType.objects.filter(
            is_auto_driven=True,
            is_active=True,
            enable_client_reminders=True
        )

        if work_type_id:
            auto_driven_work_types = auto_driven_work_types.filter(id=work_type_id)

        if not auto_driven_work_types.exists():
            self.stdout.write(self.style.WARNING('No auto-driven work types found.'))
            return

        total_sent = 0
        total_skipped = 0
        total_failed = 0

        for work_type in auto_driven_work_types:
            self.stdout.write(f'\nProcessing: {work_type.work_name}')
            self.stdout.write(f'  Reminder frequency: {work_type.client_reminder_frequency_type}')
            self.stdout.write(f'  Interval: {work_type.client_reminder_interval_days} days')

            # Find all active (non-completed) tasks for this work type
            active_tasks = WorkInstance.objects.filter(
                client_work__work_type=work_type,
                status__in=['NOT_STARTED', 'STARTED', 'PAUSED']
            ).select_related(
                'client_work__client',
                'client_work__work_type',
                'organization'
            )

            if not active_tasks.exists():
                self.stdout.write(f'  No active tasks found')
                continue

            for task in active_tasks:
                client = task.client_work.client
                client_email = client.email

                if not client_email:
                    self.stdout.write(
                        self.style.WARNING(f'  [SKIP] {client.client_name} - No email address')
                    )
                    total_skipped += 1
                    continue

                # Calculate reminder period for this task
                period_dates = work_type.get_period_dates(task.period_start or task.due_date)
                reminder_start = period_dates['client_reminder_start']
                reminder_end = period_dates['client_reminder_end']

                # Check if today is within the reminder period
                if not (reminder_start <= today <= reminder_end):
                    self.stdout.write(
                        f'  [SKIP] {client.client_name} - {task.period_label}: '
                        f'Outside reminder period ({reminder_start} to {reminder_end})'
                    )
                    total_skipped += 1
                    continue

                # Check if we should send a reminder today based on frequency
                should_send = self._should_send_today(
                    start_date=reminder_start,
                    current_date=today,
                    frequency_type=work_type.client_reminder_frequency_type,
                    interval_days=work_type.client_reminder_interval_days,
                    weekdays=work_type.client_reminder_weekdays
                )

                if not should_send:
                    self.stdout.write(
                        f'  [SKIP] {client.client_name} - {task.period_label}: '
                        f'Not a reminder day based on frequency'
                    )
                    total_skipped += 1
                    continue

                # Check if reminder was already sent today
                already_sent = ReminderInstance.objects.filter(
                    work_instance=task,
                    recipient_type='CLIENT',
                    scheduled_at__date=today,
                    send_status='SENT'
                ).exists()

                if already_sent:
                    self.stdout.write(
                        f'  [SKIP] {client.client_name} - {task.period_label}: '
                        f'Already sent today'
                    )
                    total_skipped += 1
                    continue

                # Create or get reminder instance for today (scheduled at 11:00 AM IST)
                reminder, created = ReminderInstance.objects.get_or_create(
                    work_instance=task,
                    recipient_type='CLIENT',
                    scheduled_at__date=today,
                    defaults={
                        'organization': task.organization,
                        'scheduled_at': timezone.make_aware(
                            datetime.combine(today, datetime.min.time().replace(hour=11))
                        ),
                        'email_to': client_email,
                        'send_status': 'PENDING',
                        'repeat_count': 0
                    }
                )

                if reminder.send_status == 'SENT':
                    total_skipped += 1
                    continue

                # Send the reminder
                if dry_run:
                    self.stdout.write(
                        self.style.SUCCESS(
                            f'  [DRY RUN] Would send to {client_email}: '
                            f'{client.client_name} - {task.period_label}'
                        )
                    )
                    total_sent += 1
                else:
                    success, error = self._send_auto_driven_reminder(task, reminder)

                    if success:
                        reminder.send_status = 'SENT'
                        reminder.sent_at = now
                        reminder.save()

                        self.stdout.write(
                            self.style.SUCCESS(
                                f'  [SENT] {client_email}: {client.client_name} - {task.period_label}'
                            )
                        )
                        total_sent += 1
                    else:
                        reminder.send_status = 'FAILED'
                        reminder.error_message = error[:500] if error else 'Unknown error'
                        reminder.last_attempt_at = now
                        reminder.save()

                        self.stdout.write(
                            self.style.ERROR(
                                f'  [FAILED] {client_email}: {client.client_name} - Error: {error}'
                            )
                        )
                        total_failed += 1

        # Summary
        self.stdout.write(f'\n{"=" * 60}')
        self.stdout.write('SUMMARY:')
        self.stdout.write(f'  Total sent: {total_sent}')
        self.stdout.write(f'  Total skipped: {total_skipped}')
        self.stdout.write(f'  Total failed: {total_failed}')
        self.stdout.write(f'{"=" * 60}\n')

    def _should_send_today(self, start_date, current_date, frequency_type, interval_days, weekdays):
        """
        Determine if a reminder should be sent today based on frequency configuration.
        """
        if frequency_type == 'DAILY':
            return True

        elif frequency_type == 'ALTERNATE_DAYS':
            days_since_start = (current_date - start_date).days
            return days_since_start % 2 == 0

        elif frequency_type == 'WEEKLY':
            if weekdays:
                try:
                    days = [int(d.strip()) for d in weekdays.split(',')]
                    return current_date.weekday() in days
                except:
                    # Default: Mon, Wed, Fri
                    return current_date.weekday() in [0, 2, 4]
            return current_date.weekday() in [0, 2, 4]  # Default: Mon, Wed, Fri

        elif frequency_type == 'CUSTOM':
            days_since_start = (current_date - start_date).days
            return days_since_start % max(1, interval_days) == 0

        return True  # Default: send

    def _send_auto_driven_reminder(self, task, reminder):
        """
        Send an auto-driven reminder email to the client.
        Returns (success: bool, error: str or None)
        """
        from core.models import EmailTemplate

        try:
            client = task.client_work.client
            work_type = task.client_work.work_type
            organization = task.organization
            recipient_type = reminder.recipient_type or 'CLIENT'

            # Prepare email content
            days_until_due = (task.due_date - date.today()).days
            is_overdue = days_until_due < 0
            organization_name = organization.firm_name if organization else 'Your CA Firm'

            # Check for custom email template
            email_template = None
            try:
                email_template = EmailTemplate.objects.filter(
                    work_type=work_type,
                    template_type=recipient_type,
                    is_active=True
                ).first()
            except Exception:
                pass

            if email_template:
                # Build context for template rendering
                context = {
                    'client_name': client.client_name,
                    'PAN': client.PAN or 'N/A',
                    'GSTIN': client.GSTIN or 'N/A',
                    'period_label': task.period_label,
                    'due_date': task.due_date.strftime('%d-%b-%Y'),
                    'work_name': work_type.work_name,
                    'statutory_form': work_type.statutory_form or '',
                    'firm_name': organization_name,
                }
                subject = EmailService.render_template(email_template.subject_template, context)
                body = EmailService.render_template(email_template.body_template, context)
            else:
                # Use default template
                subject = f"Reminder: {work_type.work_name} - Documents Required - {client.client_name}"

                body = f"""Dear {client.client_name},

This is a reminder regarding {work_type.work_name} for the period {task.period_label}.

We kindly request you to submit the required documents at your earliest convenience.

{'⚠️ This task is now OVERDUE. Please submit the documents immediately.' if is_overdue else f'Days Remaining: {days_until_due} day(s)'}

Please ensure all necessary documents are submitted before the due date to avoid any delays or penalties.

If you have already submitted the documents, please inform us so we can update our records.

Best Regards,
{organization_name}"""

            # Prepare task details for the HTML template
            task_details = {
                'work_name': work_type.work_name,
                'period_label': task.period_label,
                'due_date': task.due_date.strftime('%d-%b-%Y'),
                'status': task.get_status_display(),
                'client_name': client.client_name if recipient_type == 'EMPLOYEE' else None,
            }

            # Build professional HTML email
            html_body = EmailService.build_professional_html_email(
                subject=subject,
                body_content=body,
                recipient_type=recipient_type,
                organization_name=organization_name,
                task_details=task_details,
                is_overdue=is_overdue
            )

            # Use the email service to send with HTML (uses organization's email account)
            success, error = EmailService.send_email_for_organization(
                organization=organization,
                to_email=reminder.email_to,
                subject=subject,
                body=body,
                html_body=html_body,
                work_type=work_type
            )

            # Update reminder with rendered content
            reminder.subject_rendered = subject
            reminder.body_rendered = body
            reminder.save(update_fields=['subject_rendered', 'body_rendered'])

            return success, error

        except Exception as e:
            return False, str(e)
