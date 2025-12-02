"""
Management command to mark tasks as overdue when past due date.
Run this command via a scheduled task (cron/Windows Task Scheduler) for automatic updates.

Usage:
    python manage.py update_overdue_tasks
"""

from django.core.management.base import BaseCommand
from core.services.task_service import TaskAutomationService


class Command(BaseCommand):
    help = 'Mark tasks as overdue if past due date and not completed'

    def handle(self, *args, **options):
        count = TaskAutomationService.mark_overdue_tasks()

        if count > 0:
            self.stdout.write(
                self.style.SUCCESS(f'Successfully marked {count} task(s) as overdue')
            )
        else:
            self.stdout.write(
                self.style.SUCCESS('No tasks needed to be marked as overdue')
            )
