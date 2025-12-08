"""
Django management command to auto-start tasks on their reminder start day.
This command should be run daily via cron/scheduler.

For auto-driven tasks, it will:
1. Find all NOT_STARTED tasks where today >= reminder start day
2. Change their status to STARTED
3. Set the started_on date
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import date
from core.models import WorkInstance


class Command(BaseCommand):
    help = 'Auto-start tasks on their reminder start day (for auto-driven task categories)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Perform a dry run without making changes',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        today = date.today()

        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN MODE - No changes will be made'))

        self.stdout.write(f'\n{"=" * 60}')
        self.stdout.write(f'Auto-Start Tasks Processing - {today}')
        self.stdout.write(f'{"=" * 60}\n')

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

        if not not_started_tasks.exists():
            self.stdout.write(self.style.WARNING('No NOT_STARTED auto-driven tasks found.'))
            return

        total_started = 0
        total_skipped = 0

        for task in not_started_tasks:
            work_type = task.client_work.work_type
            client = task.client_work.client

            # Get reminder start day from work type configuration
            reminder_start_day = work_type.client_reminder_start_day if work_type.enable_client_reminders else 1

            # Calculate the reminder start date for this task's period
            period_start = task.period_start
            if not period_start:
                self.stdout.write(
                    self.style.WARNING(
                        f'  [SKIP] {client.client_name} - {task.period_label}: No period_start date'
                    )
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
                if dry_run:
                    self.stdout.write(
                        self.style.SUCCESS(
                            f'  [DRY RUN] Would start: {client.client_name} - {work_type.work_name} - {task.period_label} '
                            f'(Reminder start: {reminder_start_date})'
                        )
                    )
                else:
                    # Update task status to STARTED
                    task.status = 'STARTED'
                    task.started_on = today
                    task.save(update_fields=['status', 'started_on'])

                    self.stdout.write(
                        self.style.SUCCESS(
                            f'  [STARTED] {client.client_name} - {work_type.work_name} - {task.period_label} '
                            f'(Reminder start: {reminder_start_date})'
                        )
                    )
                total_started += 1
            else:
                self.stdout.write(
                    f'  [PENDING] {client.client_name} - {work_type.work_name} - {task.period_label}: '
                    f'Starts on {reminder_start_date} ({(reminder_start_date - today).days} days)'
                )
                total_skipped += 1

        # Summary
        self.stdout.write(f'\n{"=" * 60}')
        self.stdout.write('SUMMARY:')
        self.stdout.write(f'  Total started: {total_started}')
        self.stdout.write(f'  Total pending/skipped: {total_skipped}')
        self.stdout.write(f'{"=" * 60}\n')
