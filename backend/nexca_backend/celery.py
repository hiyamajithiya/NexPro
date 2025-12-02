import os
from celery import Celery
from celery.schedules import crontab

# Set the default Django settings module for the 'celery' program.
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'nexca_backend.settings')

app = Celery('nexca_backend')

# Using a string here means the worker doesn't have to serialize
# the configuration object to child processes.
app.config_from_object('django.conf:settings', namespace='CELERY')

# Load task modules from all registered Django apps.
app.autodiscover_tasks()

# Configure Celery Beat schedule
app.conf.beat_schedule = {
    'send-pending-reminders-every-10-minutes': {
        'task': 'core.tasks.send_pending_reminders',
        'schedule': crontab(minute='*/10'),  # Run every 10 minutes
    },
    'mark-overdue-tasks-daily': {
        'task': 'core.tasks.mark_overdue_tasks',
        'schedule': crontab(hour=0, minute=30),  # Run daily at 12:30 AM
    },
}

@app.task(bind=True)
def debug_task(self):
    print(f'Request: {self.request!r}')
