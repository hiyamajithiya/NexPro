# NexCA Setup Guide

## Quick Start (Development)

### Step 1: Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create virtual environment (Windows)
python -m venv venv
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy and configure environment variables
copy .env.example .env
# Edit .env with your settings (see below)

# Generate Fernet encryption key
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
# Copy the output and add it to .env as FERNET_KEY

# Create PostgreSQL database
# Option 1: Using psql
psql -U postgres
CREATE DATABASE nexca_db;
\q

# Run migrations
python manage.py makemigrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Start Django server
python manage.py runserver
```

### Step 2: Start Celery (separate terminals)

Terminal 2 - Celery Worker:
```bash
cd backend
venv\Scripts\activate
celery -A nexca_backend worker -l info --pool=solo
```

Terminal 3 - Celery Beat:
```bash
cd backend
venv\Scripts\activate
celery -A nexca_backend beat -l info
```

### Step 3: Frontend Setup

Terminal 4:
```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start React development server
npm start
```

## Environment Configuration

### Backend .env File

```env
# Django Settings
SECRET_KEY=your-very-secret-key-here-change-this
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# Database Settings (PostgreSQL)
DB_NAME=nexca_db
DB_USER=postgres
DB_PASSWORD=your_postgres_password
DB_HOST=localhost
DB_PORT=5432

# Email Settings (Gmail example)
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-gmail-app-password

# For Gmail App Password:
# 1. Go to Google Account > Security
# 2. Enable 2-Step Verification
# 3. Go to App Passwords
# 4. Generate password for "Mail"
# 5. Use that password here

# Celery Settings
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0

# Encryption Key (Generate using command above)
FERNET_KEY=your-generated-fernet-key

# CORS Settings
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

# Firm Settings
FIRM_NAME=Your CA Firm Name
```

## Testing the Setup

### 1. Access Django Admin
- URL: http://localhost:8000/admin
- Login with superuser credentials
- Create sample data:
  - Add a Client
  - Add a Work Type (e.g., GST Return, Monthly)
  - Add Email Template
  - Add Reminder Rule

### 2. Access React Frontend
- URL: http://localhost:3000
- Login with superuser credentials
- Explore Dashboard

### 3. Test API
```bash
# Get JWT token
curl -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"your_password"}'

# Use token for authenticated requests
curl -X GET http://localhost:8000/api/clients/ \
  -H "Authorization: Bearer your_access_token"
```

### 4. Test Email Sending
```python
# Django shell
python manage.py shell

from core.tasks import test_email_task
test_email_task.delay('recipient@example.com')
```

## Creating Sample Data

### Via Django Admin
1. Go to http://localhost:8000/admin
2. Create:
   - **Client**: client_code="C001", client_name="ABC Pvt Ltd", email="client@example.com"
   - **Work Type**: work_name="GST Return", statutory_form="GSTR-3B", frequency="Monthly"
   - **Email Template**: Create template for the work type
   - **Reminder Rule**: offset_days=-7, reminder_type="Document Reminder"
   - **Client Work Mapping**: Assign work type to client

### Via Django Shell
```python
python manage.py shell

from core.models import Client, WorkType, ClientWorkMapping, EmailTemplate, ReminderRule
from django.contrib.auth import get_user_model

User = get_user_model()

# Create client
client = Client.objects.create(
    client_code="C001",
    client_name="ABC Private Limited",
    PAN="ABCDE1234F",
    GSTIN="29ABCDE1234F1Z5",
    email="abc@example.com",
    mobile="9876543210",
    category="COMPANY",
    status="ACTIVE"
)

# Create work type
work_type = WorkType.objects.create(
    work_name="GST Return",
    statutory_form="GSTR-3B",
    default_frequency="MONTHLY",
    description="Monthly GST Return filing",
    is_active=True
)

# Create email template
template = EmailTemplate.objects.create(
    work_type=work_type,
    template_name="GST Document Reminder - 7 Days Before",
    subject_template="GST Return for {{period_label}} - Documents Required",
    body_template="""
Dear {{client_name}},

This is a reminder for GST Return ({{statutory_form}}) filing for the period {{period_label}}.

Due Date: {{due_date}}

Please provide the required documents at your earliest convenience.

Best regards,
{{firm_name}}
    """,
    is_active=True
)

# Create reminder rule
rule = ReminderRule.objects.create(
    work_type=work_type,
    offset_days=-7,  # 7 days before due date
    reminder_type="DOCUMENT_REMINDER",
    email_template=template,
    repeat_if_pending=True,
    repeat_interval=3,
    max_repeats=2,
    is_active=True
)

# Assign work to client (this will auto-create first task)
mapping = ClientWorkMapping.objects.create(
    client=client,
    work_type=work_type,
    start_from_period="Apr 2025",
    active=True
)

print(f"Created: {client}")
print(f"Created: {work_type}")
print(f"Created mapping and first task will be auto-generated")
```

## Troubleshooting

### Redis Connection Error
**Error**: `Error 10061: No connection could be made`
**Solution**:
- Install Redis for Windows: https://github.com/microsoftarchive/redis/releases
- Or use WSL and install Redis there
- Or use Docker: `docker run -d -p 6379:6379 redis`

### PostgreSQL Connection Error
**Error**: `FATAL: database "nexca_db" does not exist`
**Solution**:
```bash
psql -U postgres
CREATE DATABASE nexca_db;
\q
```

### Celery not starting on Windows
**Solution**: Use `--pool=solo` flag:
```bash
celery -A nexca_backend worker -l info --pool=solo
```

### Email not sending
**Solutions**:
1. For Gmail: Use App Password, not regular password
2. Check EMAIL_HOST, EMAIL_PORT, EMAIL_USE_TLS
3. Test SMTP connection:
```python
from django.core.mail import send_mail
send_mail('Test', 'Test message', 'from@example.com', ['to@example.com'])
```

### CORS Errors
**Solution**:
- Ensure `CORS_ALLOWED_ORIGINS` in .env includes frontend URL
- Check `corsheaders` middleware is enabled in settings.py

## Next Steps

1. **Customize Email Templates**: Create templates for different work types
2. **Add Users**: Create staff members with different roles
3. **Configure Reminder Rules**: Set up reminder schedules for each work type
4. **Import Clients**: Bulk import client data
5. **Set Due Date Logic**: Customize due date calculation in `task_service.py`
6. **Production Deployment**: Follow production deployment guide in README.md

## Monitoring

### Check Celery Tasks
```bash
# Monitor Celery worker
celery -A nexca_backend inspect active

# Check scheduled tasks
celery -A nexca_backend inspect scheduled
```

### View Logs
```bash
# Django logs
tail -f /path/to/logs/django.log

# Celery logs
tail -f /path/to/logs/celery.log
```

## Support

For issues and questions, refer to README.md or contact the development team.
