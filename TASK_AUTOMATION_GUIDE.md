# Task Automation Guide - NexCA

## Overview

NexCA includes an automated task generation system that creates work instances (tasks) for all active clients based on their assigned work types and frequencies (Monthly, Quarterly, Yearly).

## How It Works

### Automatic Task Generation

When you assign a work type to a client, the system:
1. Creates the **first** work instance immediately
2. Subsequent work instances are created automatically by running the `generate_work_instances` command

The system will automatically generate tasks for:
- **Monthly** work types: Creates tasks for upcoming months
- **Quarterly** work types: Creates tasks for upcoming quarters
- **Yearly** work types: Creates tasks for upcoming years
- **One-time** work types: Creates only one task

### Manual Task Generation

You can manually generate upcoming tasks using the command line:

```bash
cd backend
python manage.py generate_work_instances
```

#### Command Options

- `--lookforward-months=N`: Generate tasks for the next N months (default: 3)
  ```bash
  python manage.py generate_work_instances --lookforward-months=6
  ```

- `--dry-run`: Test the command without actually creating tasks
  ```bash
  python manage.py generate_work_instances --dry-run
  ```

### Quick Start Script

For convenience, a batch script is provided:

```bash
cd backend
generate_tasks.bat
```

This will generate tasks for the next 6 months.

## Setting Up Automated Scheduling

To ensure tasks are generated automatically, you need to schedule the command to run regularly.

### Option 1: Windows Task Scheduler (Recommended)

1. **Open Task Scheduler**
   - Press `Win + R`, type `taskschd.msc`, and press Enter

2. **Create Basic Task**
   - Click "Create Basic Task" in the right panel
   - Name: "NexCA Task Generation"
   - Description: "Automatically generate upcoming work instances"

3. **Set Trigger**
   - Trigger: Daily
   - Start: Tomorrow at 6:00 AM
   - Recur every: 1 day

4. **Set Action**
   - Action: Start a program
   - Program/script: `C:\Users\[YourUsername]\AppData\Local\Programs\Python\Python314\python.exe`
   - Add arguments: `manage.py generate_work_instances --lookforward-months=6`
   - Start in: `D:\ADMIN\Documents\HMC AI\NexCA\backend`

5. **Finish**
   - Review settings and click Finish

### Option 2: Python Scheduler (APScheduler)

If you want to run the scheduler as part of your Django application:

1. Install APScheduler:
   ```bash
   pip install apscheduler
   ```

2. The scheduler can be integrated into your Django app (contact support for implementation)

### Option 3: Manual Execution

Run the batch script manually whenever needed:
```bash
D:\ADMIN\Documents\HMC AI\NexCA\backend\generate_tasks.bat
```

## How Tasks Are Created

### Example: Monthly Work Type

If you assign "GSTR 1 Filing" (Monthly) to a client in November 2025:

1. **Immediate**: Task for December 2025 created
2. **When command runs**: Tasks created for:
   - January 2026
   - February 2026
   - March 2026
   - April 2026
   - May 2026

### Example: Quarterly Work Type

If you assign "TDS Return" (Quarterly) to a client:

1. **Immediate**: Task for Q1 2025-26 created
2. **When command runs**: Tasks created for:
   - Q2 2025-26
   - Q3 2025-26
   - Q4 2025-26

### Example: Yearly Work Type

If you assign "Income Tax Return" (Yearly) to a client:

1. **Immediate**: Task for FY 2025-26 created
2. **When command runs**: Task for FY 2026-27 created (if within lookforward period)

## Best Practices

1. **Run Daily**: Schedule the command to run at least once daily (preferably early morning)

2. **Lookforward Period**: Use 3-6 months lookforward to ensure tasks are always available
   - Too short: Tasks might not be created in time
   - Too long: Creates unnecessary future tasks

3. **Monitor Regularly**: Check the command output to ensure tasks are being created

4. **After Adding Clients**: Manually run the command after adding new clients or work types

## Task Due Dates

Tasks are created with due dates based on the work type configuration:
- Each work type has a "Due Date Day" setting (1-31)
- Monthly tasks: Due on the configured day of each month
- Quarterly tasks: Due on the configured day after the quarter ends
- Yearly tasks: Typically July 31st for financial year tasks

## Overdue Tasks

The command also automatically marks tasks as OVERDUE if:
- The due date has passed
- The task status is NOT_STARTED, STARTED, or IN_PROGRESS

## Troubleshooting

### Tasks Not Being Created

1. Check if the client work mapping is active
2. Verify the work type frequency is set correctly
3. Run the command manually with `--dry-run` to see what would be created
4. Check if tasks already exist (command won't create duplicates)

### Too Many Tasks Created

- Reduce the `--lookforward-months` value
- Check for duplicate work type assignments

### Command Fails

1. Ensure Django environment is properly set up
2. Check database connectivity
3. Verify all migrations are applied: `python manage.py migrate`

## Support

For issues or questions about task automation, contact your system administrator.

---

**Last Updated**: November 2025
**Version**: 1.0
