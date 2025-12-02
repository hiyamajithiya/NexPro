"""
Django management command to send scheduled reminder emails.
This command should be run periodically (e.g., every hour via cron or scheduler)
to send all pending reminder emails.
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from core.models import ReminderInstance
from core.services.email_service import EmailService


class Command(BaseCommand):
    help = 'Send all pending reminder emails that are due'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Perform a dry run without sending emails',
        )
        parser.add_argument(
            '--force-send',
            type=int,
            help='Force send a specific reminder by ID (ignores schedule)',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        force_send_id = options.get('force_send')

        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN MODE - No emails will be sent'))

        if force_send_id:
            self.send_specific_reminder(force_send_id, dry_run)
        else:
            self.send_scheduled_reminders(dry_run)

    def send_scheduled_reminders(self, dry_run):
        """Send all reminders that are scheduled to be sent now"""
        now = timezone.now()

        # Get all pending reminders that are due
        pending_reminders = ReminderInstance.objects.filter(
            send_status='PENDING',
            scheduled_at__lte=now
        ).select_related(
            'work_instance__client_work__client',
            'work_instance__client_work__work_type',
            'reminder_rule__email_template'
        ).order_by('scheduled_at')

        total_reminders = pending_reminders.count()
        self.stdout.write(f'Found {total_reminders} pending reminder(s) to send')

        if total_reminders == 0:
            self.stdout.write(self.style.SUCCESS('No reminders to send at this time.'))
            return

        sent_count = 0
        failed_count = 0

        for reminder in pending_reminders:
            if dry_run:
                self.stdout.write(
                    f'  [DRY RUN] Would send: {reminder.work_instance.client_work.client.client_name} - '
                    f'{reminder.work_instance.client_work.work_type.work_name} '
                    f'to {reminder.email_to}'
                )
                sent_count += 1
            else:
                success, error = EmailService.send_reminder_email(reminder)

                if success:
                    # Update reminder status
                    reminder.send_status = 'SENT'
                    reminder.sent_at = timezone.now()
                    reminder.save()

                    self.stdout.write(
                        self.style.SUCCESS(
                            f'  [OK] Sent to {reminder.email_to}: '
                            f'{reminder.work_instance.client_work.client.client_name} - '
                            f'{reminder.work_instance.client_work.work_type.work_name}'
                        )
                    )
                    sent_count += 1
                else:
                    # Update reminder as failed
                    reminder.send_status = 'FAILED'
                    reminder.error_message = error[:500] if error else 'Unknown error'
                    reminder.save()

                    self.stdout.write(
                        self.style.ERROR(
                            f'  [FAILED] {reminder.email_to}: '
                            f'{reminder.work_instance.client_work.client.client_name} - '
                            f'{reminder.work_instance.client_work.work_type.work_name}. '
                            f'Error: {error}'
                        )
                    )
                    failed_count += 1

        # Summary
        self.stdout.write('\n' + '=' * 50)
        if dry_run:
            self.stdout.write(self.style.SUCCESS(f'DRY RUN: Would send {sent_count} email(s)'))
        else:
            self.stdout.write(
                self.style.SUCCESS(f'Successfully sent: {sent_count} email(s)')
            )
            if failed_count > 0:
                self.stdout.write(
                    self.style.ERROR(f'Failed to send: {failed_count} email(s)')
                )
        self.stdout.write('=' * 50)

    def send_specific_reminder(self, reminder_id, dry_run):
        """Force send a specific reminder by ID"""
        try:
            reminder = ReminderInstance.objects.select_related(
                'work_instance__client_work__client',
                'work_instance__client_work__work_type',
                'reminder_rule__email_template'
            ).get(id=reminder_id)

            self.stdout.write(f'Force sending reminder ID: {reminder_id}')
            self.stdout.write(
                f'  Client: {reminder.work_instance.client_work.client.client_name}'
            )
            self.stdout.write(
                f'  Work Type: {reminder.work_instance.client_work.work_type.work_name}'
            )
            self.stdout.write(f'  To: {reminder.email_to}')
            self.stdout.write(f'  Status: {reminder.send_status}')

            if dry_run:
                self.stdout.write(self.style.WARNING('\nDRY RUN - Email not sent'))
                return

            success, error = EmailService.send_reminder_email(reminder)

            if success:
                reminder.send_status = 'SENT'
                reminder.sent_at = timezone.now()
                reminder.save()
                self.stdout.write(self.style.SUCCESS('\nEmail sent successfully!'))
            else:
                reminder.send_status = 'FAILED'
                reminder.error_message = error[:500] if error else 'Unknown error'
                reminder.save()
                self.stdout.write(self.style.ERROR(f'\nFailed to send email: {error}'))

        except ReminderInstance.DoesNotExist:
            self.stdout.write(
                self.style.ERROR(f'Reminder with ID {reminder_id} not found')
            )
