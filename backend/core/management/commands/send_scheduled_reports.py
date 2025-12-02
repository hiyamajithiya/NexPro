"""
Management command to send scheduled reports based on configuration.
Run this command via a scheduled task (cron/Windows Task Scheduler) at regular intervals.

Recommended schedule: Run hourly to check for reports that need to be sent.

Usage:
    python manage.py send_scheduled_reports

For daily execution at 9 AM:
    - Windows Task Scheduler: Run at 9:00 AM daily
    - Linux cron: 0 9 * * * cd /path/to/project && python manage.py send_scheduled_reports
"""

from datetime import datetime, time
from django.core.management.base import BaseCommand
from django.utils import timezone
from core.models import ReportConfiguration
from core.services.report_service import ReportService


class Command(BaseCommand):
    help = 'Send scheduled reports based on report configurations'

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force send all active reports regardless of schedule',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show which reports would be sent without actually sending them',
        )
        parser.add_argument(
            '--report-id',
            type=int,
            help='Send only a specific report by ID',
        )

    def handle(self, *args, **options):
        force = options.get('force', False)
        dry_run = options.get('dry_run', False)
        report_id = options.get('report_id')

        # Get active report configurations
        configs = ReportConfiguration.objects.filter(is_active=True)

        if report_id:
            configs = configs.filter(id=report_id)

        if not configs.exists():
            self.stdout.write(
                self.style.WARNING('No active report configurations found')
            )
            return

        current_time = timezone.now()
        current_hour = current_time.hour
        reports_sent = 0
        reports_failed = 0

        for config in configs:
            should_send = False

            if force:
                should_send = True
                reason = "Forced send"
            else:
                # Check if report should be sent based on schedule
                config_hour = config.send_time.hour if config.send_time else 9

                # Only process if current hour matches configured send time
                if current_hour == config_hour:
                    if ReportService.should_send_report_today(config):
                        should_send = True
                        reason = f"Scheduled {config.get_frequency_display()} report"
                    else:
                        reason = f"Not scheduled for today ({config.get_frequency_display()})"
                else:
                    reason = f"Wrong hour (configured: {config_hour}:00, current: {current_hour}:00)"

            if should_send:
                if dry_run:
                    self.stdout.write(
                        self.style.SUCCESS(
                            f'[DRY RUN] Would send: {config.name} ({config.organization.name}) - {reason}'
                        )
                    )
                    self.stdout.write(f'  Recipients: {", ".join(config.get_recipient_list())}')
                    reports_sent += 1
                else:
                    self.stdout.write(f'Sending: {config.name} ({config.organization.name})...')

                    try:
                        success, error = ReportService.generate_and_send_report(config)

                        if success:
                            reports_sent += 1
                            self.stdout.write(
                                self.style.SUCCESS(
                                    f'  SUCCESS: Sent to {", ".join(config.get_recipient_list())}'
                                )
                            )
                        else:
                            reports_failed += 1
                            self.stdout.write(
                                self.style.ERROR(f'  FAILED: {error}')
                            )

                    except Exception as e:
                        reports_failed += 1
                        self.stdout.write(
                            self.style.ERROR(f'  ERROR: {str(e)}')
                        )
            else:
                if options.get('verbosity', 1) > 1:
                    self.stdout.write(
                        self.style.WARNING(
                            f'Skipping: {config.name} ({config.organization.name}) - {reason}'
                        )
                    )

        # Summary
        self.stdout.write('')
        if dry_run:
            self.stdout.write(
                self.style.SUCCESS(f'DRY RUN: {reports_sent} report(s) would be sent')
            )
        else:
            if reports_sent > 0:
                self.stdout.write(
                    self.style.SUCCESS(f'Successfully sent {reports_sent} report(s)')
                )
            if reports_failed > 0:
                self.stdout.write(
                    self.style.ERROR(f'Failed to send {reports_failed} report(s)')
                )
            if reports_sent == 0 and reports_failed == 0:
                self.stdout.write(
                    self.style.SUCCESS('No reports were due to be sent')
                )
