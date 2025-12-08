from datetime import datetime, timedelta, date
from dateutil.relativedelta import relativedelta
from django.utils import timezone
from ..models import ClientWorkMapping, WorkInstance, ReminderInstance, ReminderRule, Notification, WorkTypeAssignment


class ReminderGenerationService:
    """Service for generating period-based reminders for clients and employees"""

    @staticmethod
    def generate_reminder_dates(start_date, end_date, frequency_type, interval_days=1, weekdays=None):
        """
        Generate a list of dates for reminders based on frequency configuration.

        Args:
            start_date: Start date for reminders
            end_date: End date for reminders (inclusive)
            frequency_type: 'DAILY', 'ALTERNATE_DAYS', 'WEEKLY', or 'CUSTOM'
            interval_days: Days between reminders
            weekdays: Comma-separated weekday numbers for WEEKLY (0=Mon, 6=Sun)

        Returns:
            List of dates
        """
        reminder_dates = []
        current = start_date

        if frequency_type == 'DAILY':
            while current <= end_date:
                reminder_dates.append(current)
                current += timedelta(days=1)

        elif frequency_type == 'ALTERNATE_DAYS':
            while current <= end_date:
                reminder_dates.append(current)
                current += timedelta(days=2)

        elif frequency_type == 'WEEKLY' and weekdays:
            # Parse weekday numbers
            try:
                days = [int(d.strip()) for d in weekdays.split(',')]
            except:
                days = [0, 2, 4]  # Default: Mon, Wed, Fri

            while current <= end_date:
                if current.weekday() in days:
                    reminder_dates.append(current)
                current += timedelta(days=1)

        elif frequency_type == 'CUSTOM':
            while current <= end_date:
                reminder_dates.append(current)
                current += timedelta(days=max(1, interval_days))
        else:
            # Default: daily
            while current <= end_date:
                reminder_dates.append(current)
                current += timedelta(days=1)

        return reminder_dates

    @staticmethod
    def generate_period_reminders_for_instance(work_instance, regenerate=False):
        """
        Generate separate reminders for clients and employees based on WorkType configuration.

        Args:
            work_instance: The WorkInstance to generate reminders for
            regenerate: If True, cancel existing pending reminders first
        """
        work_type = work_instance.client_work.work_type
        client = work_instance.client_work.client

        if regenerate:
            # Cancel existing pending reminders
            ReminderInstance.objects.filter(
                work_instance=work_instance,
                send_status='PENDING'
            ).update(send_status='CANCELLED')

        # Get period dates from task category
        period_dates = work_type.get_period_dates(work_instance.period_start or work_instance.due_date)

        current_time = timezone.now()
        today = current_time.date()

        # Generate CLIENT reminders
        if work_type.enable_client_reminders and client.email:
            client_start = period_dates['client_reminder_start']
            client_end = period_dates['client_reminder_end']

            client_reminder_dates = ReminderGenerationService.generate_reminder_dates(
                start_date=client_start,
                end_date=client_end,
                frequency_type=work_type.client_reminder_frequency_type,
                interval_days=work_type.client_reminder_interval_days,
                weekdays=work_type.client_reminder_weekdays
            )

            for reminder_date in client_reminder_dates:
                # Create reminders for all dates (past, today, and future)
                # Past reminders will be marked as overdue and sent immediately
                scheduled_at = timezone.make_aware(
                    datetime.combine(reminder_date, datetime.min.time().replace(hour=9, minute=0))
                )

                # Avoid duplicate reminders
                if not ReminderInstance.objects.filter(
                    work_instance=work_instance,
                    recipient_type='CLIENT',
                    scheduled_at__date=reminder_date,
                    send_status__in=['PENDING', 'SENT']
                ).exists():
                    ReminderInstance.objects.create(
                        organization=work_instance.organization,
                        work_instance=work_instance,
                        recipient_type='CLIENT',
                        scheduled_at=scheduled_at,
                        email_to=client.email,
                        send_status='PENDING',
                        repeat_count=0
                    )

        # Generate EMPLOYEE reminders
        if work_type.enable_employee_reminders and work_instance.assigned_to:
            employee = work_instance.assigned_to
            employee_email = employee.email
            notification_type = work_type.employee_notification_type  # EMAIL, IN_APP, or BOTH

            # Check employee's notification preferences
            user_wants_email_reminders = getattr(employee, 'notify_email_reminders', True)

            emp_start = period_dates['employee_reminder_start']
            emp_end = period_dates['employee_reminder_end']

            employee_reminder_dates = ReminderGenerationService.generate_reminder_dates(
                start_date=emp_start,
                end_date=emp_end,
                frequency_type=work_type.employee_reminder_frequency_type,
                interval_days=work_type.employee_reminder_interval_days,
                weekdays=work_type.employee_reminder_weekdays
            )

            for reminder_date in employee_reminder_dates:
                # Create reminders for all dates (past, today, and future)
                # Past reminders will be marked as overdue and sent immediately
                scheduled_at = timezone.make_aware(
                    datetime.combine(reminder_date, datetime.min.time().replace(hour=9, minute=0))
                )

                # Create EMAIL reminder if notification type includes email AND user wants email reminders
                if notification_type in ['EMAIL', 'BOTH'] and employee_email and user_wants_email_reminders:
                    # Avoid duplicate email reminders
                    if not ReminderInstance.objects.filter(
                        work_instance=work_instance,
                        recipient_type='EMPLOYEE',
                        scheduled_at__date=reminder_date,
                        send_status__in=['PENDING', 'SENT']
                    ).exists():
                        ReminderInstance.objects.create(
                            organization=work_instance.organization,
                            work_instance=work_instance,
                            recipient_type='EMPLOYEE',
                            scheduled_at=scheduled_at,
                            email_to=employee_email,
                            send_status='PENDING',
                            repeat_count=0
                        )

                # Create IN-APP notification if notification type includes in-app
                if notification_type in ['IN_APP', 'BOTH']:
                    # Avoid duplicate in-app notifications
                    if not Notification.objects.filter(
                        work_instance=work_instance,
                        user=employee,
                        notification_type='REMINDER',
                        created_at__date=reminder_date
                    ).exists():
                        # Create notification (will be shown immediately when date arrives)
                        client_name = work_instance.client_work.client.client_name
                        work_name = work_type.work_name
                        period = work_instance.period_label
                        days_left = (work_instance.due_date - reminder_date).days

                        Notification.objects.create(
                            organization=work_instance.organization,
                            user=employee,
                            notification_type='REMINDER',
                            title=f"Reminder: {work_name} - {client_name}",
                            message=f"Task '{work_name}' for {client_name} ({period}) is due in {days_left} day(s). Due date: {work_instance.due_date.strftime('%d %b %Y')}",
                            priority='MEDIUM' if days_left > 3 else 'HIGH',
                            work_instance=work_instance,
                            action_url=f"/tasks?work_instance={work_instance.id}"
                        )

    @staticmethod
    def cancel_reminders_for_completed_task(work_instance):
        """
        Cancel all pending reminders when a task is completed.
        Mark them as SKIPPED so we know why they were cancelled.
        """
        cancelled_count = ReminderInstance.objects.filter(
            work_instance=work_instance,
            send_status='PENDING'
        ).update(send_status='SKIPPED')

        return cancelled_count

    @staticmethod
    def get_reminder_schedule_preview(work_type, reference_date=None):
        """
        Get a preview of the reminder schedule for a task category.
        Useful for showing users when reminders will be sent.
        """
        if reference_date is None:
            reference_date = date.today()

        period_dates = work_type.get_period_dates(reference_date)

        preview = {
            'period_start': period_dates['period_start'],
            'period_end': period_dates['period_end'],
            'due_date': period_dates['due_date'],
            'client_reminders': [],
            'employee_reminders': []
        }

        if work_type.enable_client_reminders:
            preview['client_reminders'] = ReminderGenerationService.generate_reminder_dates(
                start_date=period_dates['client_reminder_start'],
                end_date=period_dates['client_reminder_end'],
                frequency_type=work_type.client_reminder_frequency_type,
                interval_days=work_type.client_reminder_interval_days,
                weekdays=work_type.client_reminder_weekdays
            )

        if work_type.enable_employee_reminders:
            preview['employee_reminders'] = ReminderGenerationService.generate_reminder_dates(
                start_date=period_dates['employee_reminder_start'],
                end_date=period_dates['employee_reminder_end'],
                frequency_type=work_type.employee_reminder_frequency_type,
                interval_days=work_type.employee_reminder_interval_days,
                weekdays=work_type.employee_reminder_weekdays
            )

        return preview


class TaskAutomationService:
    """Service for automatic task creation and management"""

    @staticmethod
    def calculate_next_period_and_due_date(frequency, current_period_label=None, current_due_date=None, due_date_day=20):
        """
        Calculate the next period label and due date based on frequency
        Returns: (period_label, period_start, period_end, due_date)
        """
        today = timezone.now().date()

        if frequency == 'MONTHLY':
            if current_due_date:
                next_start = current_due_date + timedelta(days=1)
                next_month = next_start + relativedelta(months=1)
                next_due = next_month.replace(day=min(due_date_day, 28))  # Use configured due date day
            else:
                next_start = today.replace(day=1)
                next_due = (next_start + relativedelta(months=1)).replace(day=min(due_date_day, 28))

            period_label = next_start.strftime('%b %Y')  # e.g., "Apr 2025"
            period_end = (next_start + relativedelta(months=1)) - timedelta(days=1)

        elif frequency == 'QUARTERLY':
            if current_due_date:
                next_start = current_due_date + timedelta(days=1)
                next_quarter = next_start + relativedelta(months=3)
                next_due = next_quarter.replace(day=min(due_date_day, 28))
            else:
                # Determine current quarter
                current_month = today.month
                quarter_start_month = ((current_month - 1) // 3) * 3 + 1
                next_start = today.replace(month=quarter_start_month, day=1)
                next_due = (next_start + relativedelta(months=3)).replace(day=min(due_date_day, 28))

            quarter_num = ((next_start.month - 1) // 3) + 1
            period_label = f"Q{quarter_num} {next_start.year}"
            period_end = (next_start + relativedelta(months=3)) - timedelta(days=1)

        elif frequency == 'YEARLY':
            if current_due_date:
                next_start = current_due_date + timedelta(days=1)
                next_year = next_start + relativedelta(years=1)
                next_due = next_year.replace(month=7, day=31)  # Example: July 31st
            else:
                next_start = today.replace(month=4, day=1)  # Financial year starts April
                next_due = (next_start + relativedelta(years=1)).replace(month=7, day=31)

            fy_start_year = next_start.year if next_start.month >= 4 else next_start.year - 1
            fy_end_year = fy_start_year + 1
            period_label = f"FY {fy_start_year}-{str(fy_end_year)[2:]}"
            period_end = next_start.replace(year=fy_end_year, month=3, day=31)

        else:  # ONE_TIME
            next_start = today
            next_due = today + timedelta(days=30)
            period_label = f"One-time {today.year}"
            period_end = next_due

        return period_label, next_start, period_end, next_due

    @staticmethod
    def calculate_period_from_date(frequency, start_date, due_date_day=20):
        """
        Calculate period label and due date based on a specific start date.
        Used when creating the first task from a user-specified start date.

        Args:
            frequency: Task frequency (MONTHLY, QUARTERLY, YEARLY)
            start_date: The date to calculate the period from (date object or string)
            due_date_day: Day of month for due date

        Returns: (period_label, period_start, period_end, due_date)
        """
        from datetime import datetime

        # Convert string to date if needed
        if isinstance(start_date, str):
            start_date = datetime.strptime(start_date, '%Y-%m-%d').date()

        if frequency == 'MONTHLY':
            # For monthly, the period is the month containing start_date
            period_start = start_date.replace(day=1)
            period_end = (period_start + relativedelta(months=1)) - timedelta(days=1)
            due_date = (period_start + relativedelta(months=1)).replace(day=min(due_date_day, 28))
            period_label = period_start.strftime('%b %Y')

        elif frequency == 'QUARTERLY':
            # Determine which quarter the start_date falls into
            quarter = (start_date.month - 1) // 3 + 1
            quarter_start_month = (quarter - 1) * 3 + 1
            period_start = start_date.replace(month=quarter_start_month, day=1)
            period_end = (period_start + relativedelta(months=3)) - timedelta(days=1)
            due_date = (period_start + relativedelta(months=3)).replace(day=min(due_date_day, 28))
            period_label = f"Q{quarter} {period_start.year}"

        elif frequency == 'YEARLY':
            # Yearly tasks - fiscal year starting from April
            if start_date.month >= 4:
                fy_start_year = start_date.year
            else:
                fy_start_year = start_date.year - 1

            period_start = datetime(fy_start_year, 4, 1).date()
            period_end = datetime(fy_start_year + 1, 3, 31).date()
            due_date = datetime(fy_start_year + 1, 4, min(due_date_day, 30)).date()
            period_label = f"FY {fy_start_year}-{str(fy_start_year + 1)[-2:]}"

        else:
            # Default: treat as current period
            period_start = start_date.replace(day=1)
            period_end = (period_start + relativedelta(months=1)) - timedelta(days=1)
            due_date = (period_start + relativedelta(months=1)).replace(day=min(due_date_day, 28))
            period_label = period_start.strftime('%b %Y')

        return period_label, period_start, period_end, due_date

    @staticmethod
    def create_work_instance(client_work_mapping, start_date=None):
        """
        Create a new work instance for a client work mapping.
        For auto-driven task categories, the task is automatically started.

        Args:
            client_work_mapping: The ClientWorkMapping instance
            start_date: Optional date to calculate the first period from (for new mappings)
        """
        frequency = client_work_mapping.effective_frequency
        work_type = client_work_mapping.work_type
        due_date_day = work_type.due_date_day

        # Check if there's a most recent instance to calculate from
        latest_instance = WorkInstance.objects.filter(
            client_work=client_work_mapping
        ).order_by('-due_date').first()

        if latest_instance:
            period_label, period_start, period_end, due_date = \
                TaskAutomationService.calculate_next_period_and_due_date(
                    frequency,
                    latest_instance.period_label,
                    latest_instance.due_date,
                    due_date_day
                )
        else:
            # First instance - use start_date if provided
            if start_date:
                # Calculate period based on the provided start date
                period_label, period_start, period_end, due_date = \
                    TaskAutomationService.calculate_period_from_date(
                        frequency,
                        start_date,
                        due_date_day
                    )
            else:
                # Default to current period
                period_label, period_start, period_end, due_date = \
                    TaskAutomationService.calculate_next_period_and_due_date(frequency, due_date_day=due_date_day)

        # Determine assigned employee:
        # 1. First check if there's a WorkTypeAssignment for this task category
        # 2. Fall back to previous instance's assignee
        # Note: For auto-driven tasks, assignment is optional
        assigned_to = None

        # Check WorkTypeAssignment
        assignment = WorkTypeAssignment.objects.filter(
            work_type=work_type,
            organization=client_work_mapping.organization,
            is_active=True
        ).select_related('employee').first()

        if assignment:
            assigned_to = assignment.employee
        elif latest_instance:
            assigned_to = latest_instance.assigned_to

        # Determine initial status based on task category configuration
        # Auto-driven task categories start automatically
        initial_status = 'NOT_STARTED'
        started_on = None
        if work_type.is_auto_driven and work_type.auto_start_on_creation:
            initial_status = 'STARTED'
            started_on = timezone.now().date()

        # Create the work instance
        work_instance = WorkInstance.objects.create(
            client_work=client_work_mapping,
            period_label=period_label,
            period_start=period_start,
            period_end=period_end,
            due_date=due_date,
            status=initial_status,
            started_on=started_on,
            assigned_to=assigned_to,
            organization=client_work_mapping.organization
        )

        # Generate reminders for this instance
        TaskAutomationService.generate_reminders_for_instance(work_instance)

        return work_instance

    @staticmethod
    def generate_reminders_for_instance(work_instance):
        """
        Generate reminder instances for a work instance.
        Uses the new ReminderGenerationService to create separate client/employee reminders.
        Also generates rule-based reminders for backward compatibility.
        """
        # Generate period-based reminders (new approach)
        ReminderGenerationService.generate_period_reminders_for_instance(work_instance)

        # Also generate rule-based reminders for backward compatibility
        work_type = work_instance.client_work.work_type
        active_rules = ReminderRule.objects.filter(
            work_type=work_type,
            is_active=True
        )

        current_time = timezone.now()
        client_email = work_instance.client_work.client.email
        employee_email = work_instance.assigned_to.email if work_instance.assigned_to else None

        for rule in active_rules:
            # Calculate scheduled time
            scheduled_date = work_instance.due_date + timedelta(days=rule.offset_days)
            scheduled_at = timezone.make_aware(
                datetime.combine(scheduled_date, datetime.min.time().replace(hour=9, minute=0))
            )

            # Only create reminder if it's in the future
            if scheduled_at >= current_time:
                # Determine recipients based on rule's recipient_type
                recipients = []
                if rule.recipient_type in ['CLIENT', 'BOTH'] and client_email:
                    recipients.append(('CLIENT', client_email))
                if rule.recipient_type in ['EMPLOYEE', 'BOTH'] and employee_email:
                    recipients.append(('EMPLOYEE', employee_email))

                for recipient_type, email in recipients:
                    # Avoid duplicate reminders
                    if not ReminderInstance.objects.filter(
                        work_instance=work_instance,
                        reminder_rule=rule,
                        recipient_type=recipient_type,
                        email_to=email,
                        send_status__in=['PENDING', 'SENT']
                    ).exists():
                        ReminderInstance.objects.create(
                            organization=work_instance.organization,
                            work_instance=work_instance,
                            reminder_rule=rule,
                            recipient_type=recipient_type,
                            scheduled_at=scheduled_at,
                            email_to=email,
                            send_status='PENDING',
                            repeat_count=0
                        )

    @staticmethod
    def complete_work_instance(work_instance):
        """
        Mark a work instance as completed and perform cleanup.
        Cancels all pending reminders and marks them as SKIPPED.
        Note: Next instances are created automatically by the scheduled task generation command.
        """
        work_instance.status = 'COMPLETED'
        work_instance.completed_on = timezone.now().date()
        work_instance.save()

        # Cancel all pending reminders using the new service
        ReminderGenerationService.cancel_reminders_for_completed_task(work_instance)

    @staticmethod
    def update_due_date(work_instance, new_due_date):
        """
        Update due date and regenerate reminders
        """
        # Cancel existing future reminders
        ReminderInstance.objects.filter(
            work_instance=work_instance,
            send_status='PENDING',
            scheduled_at__gt=timezone.now()
        ).update(send_status='CANCELLED')

        # Update due date
        work_instance.due_date = new_due_date
        work_instance.save()

        # Regenerate reminders using the new service
        ReminderGenerationService.generate_period_reminders_for_instance(work_instance, regenerate=True)

    @staticmethod
    def mark_overdue_tasks():
        """
        Mark tasks as overdue if past due date and not completed.
        Also pauses timers for tasks that become overdue.
        """
        today = timezone.now().date()
        overdue_instances = WorkInstance.objects.filter(
            due_date__lt=today,
            status__in=['NOT_STARTED', 'STARTED', 'PAUSED']
        )

        # For each instance that becomes overdue, pause the timer if running
        for instance in overdue_instances:
            if instance.is_timer_running:
                instance.pause_timer()

        count = overdue_instances.update(status='OVERDUE')
        return count

    @staticmethod
    def check_and_update_overdue_status():
        """
        Check all tasks and update overdue status.
        Called on API requests to ensure status is always accurate.
        Returns the count of newly marked overdue tasks.
        """
        return TaskAutomationService.mark_overdue_tasks()
