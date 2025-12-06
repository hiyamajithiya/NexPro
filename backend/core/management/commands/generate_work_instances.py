"""
Django management command to generate upcoming work instances automatically.
This command should be run periodically (e.g., daily via cron or scheduler)
to ensure all active client work mappings have upcoming tasks created.
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from core.models import ClientWorkMapping, WorkInstance
from core.services.task_service import TaskAutomationService


class Command(BaseCommand):
    help = 'Generate upcoming work instances for all active client work mappings'

    def add_arguments(self, parser):
        parser.add_argument(
            '--lookforward-months',
            type=int,
            default=3,
            help='Number of months to look forward and create tasks (default: 3)',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Perform a dry run without creating any work instances',
        )

    def handle(self, *args, **options):
        lookforward_months = options['lookforward_months']
        dry_run = options['dry_run']

        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN MODE - No work instances will be created'))

        # Calculate the cutoff date (today + lookforward months)
        today = timezone.now().date()
        cutoff_date = today + timedelta(days=30 * lookforward_months)

        self.stdout.write(f'Generating work instances from {today} to {cutoff_date}')

        # Get all active client work mappings
        active_mappings = ClientWorkMapping.objects.filter(active=True).select_related(
            'client', 'work_type'
        )

        total_created = 0
        total_mappings = active_mappings.count()

        self.stdout.write(f'Found {total_mappings} active client work mapping(s)')

        for mapping in active_mappings:
            created_count = self.generate_instances_for_mapping(mapping, cutoff_date, dry_run)
            total_created += created_count

            if created_count > 0:
                self.stdout.write(
                    self.style.SUCCESS(
                        f'  [OK] {mapping.client.client_name} - {mapping.work_type.work_name}: '
                        f'Created {created_count} instance(s)'
                    )
                )

        # Mark overdue tasks
        if not dry_run:
            overdue_count = TaskAutomationService.mark_overdue_tasks()
            if overdue_count > 0:
                self.stdout.write(
                    self.style.WARNING(f'Marked {overdue_count} task(s) as overdue')
                )

        self.stdout.write(
            self.style.SUCCESS(
                f'\nCompleted! Total work instances created: {total_created}'
            )
        )

    def generate_instances_for_mapping(self, mapping, cutoff_date, dry_run):
        """
        Generate work instances for a specific mapping up to the cutoff date.
        Returns the number of instances created.
        """
        # Skip ONE_TIME task categories if they already have an instance
        if mapping.effective_frequency == 'ONE_TIME':
            existing_count = WorkInstance.objects.filter(client_work=mapping).count()
            if existing_count > 0:
                return 0

        created_count = 0
        max_iterations = 50  # Safety limit to prevent infinite loops

        for _ in range(max_iterations):
            # Get the latest work instance for this mapping
            latest_instance = WorkInstance.objects.filter(
                client_work=mapping
            ).order_by('-due_date').first()

            # Determine if we need to create a new instance
            if latest_instance:
                # Check if the latest instance's due date is beyond our cutoff
                if latest_instance.due_date >= cutoff_date:
                    break  # We have enough instances
            else:
                # No instances exist, create the first one
                pass

            # Create the next work instance
            if not dry_run:
                new_instance = TaskAutomationService.create_work_instance(mapping)
                created_count += 1

                # Check if the newly created instance is beyond cutoff
                if new_instance.due_date >= cutoff_date:
                    break
            else:
                # In dry run, just simulate creation
                created_count += 1
                break  # Don't loop in dry run

        return created_count
