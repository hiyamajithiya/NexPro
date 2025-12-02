# NexCA - Chartered Accountant Office Management System

A comprehensive web application for managing CA office operations including client management, recurring compliance work, automated task generation, email reminders, and secure credential storage.

## Features

### Core Features
- **Client Management**: Store and manage client information (PAN, GSTIN, contact details)
- **Work Type Configuration**: Define work types (GST Return, ITR, TDS, Audit, etc.) with frequencies
- **Automatic Task Generation**: Auto-create recurring tasks based on monthly/quarterly/yearly schedules
- **Status Tracking**: Track work status from Not Started → In Progress → Completed
- **Staff Assignment**: Assign tasks to team members
- **Secure Credential Vault**: Encrypted storage for client portal credentials
- **Email Reminders**: Automated email reminders to clients before/after due dates
- **Auto-Repeat Reminders**: Repeat reminders for pending work

### Advanced Features ✨ NEW
- **📅 Calendar View**: Interactive calendar with color-coded tasks, multiple views (Month/Week/Day/Agenda), and advanced filtering
- **📊 Reports & Analytics**: Comprehensive reporting with 5 report types, visual charts, advanced filtering, and CSV export
  - Task Summary Report
  - Client Summary Report
  - Work Type Summary Report
  - Staff Productivity Report
  - Status Analysis Report
- **Dashboard**: Real-time overview with KPIs and upcoming tasks

> See [FEATURES.md](FEATURES.md) for detailed documentation on Calendar View and Reports.

## Tech Stack

### Backend
- **Framework**: Django + Django REST Framework
- **Database**: PostgreSQL
- **Task Queue**: Celery + Celery Beat + Redis
- **Authentication**: JWT (Simple JWT)
- **Encryption**: Cryptography (Fernet AES-256)

### Frontend
- **Framework**: React 18
- **UI Library**: Material-UI (MUI)
- **Routing**: React Router v6
- **HTTP Client**: Axios
- **Form Handling**: React Hook Form

## Project Structure

```
NexCA/
├── backend/
│   ├── core/
│   │   ├── models.py              # Database models
│   │   ├── serializers.py         # DRF serializers
│   │   ├── views.py               # API viewsets
│   │   ├── admin.py               # Django admin configuration
│   │   ├── tasks.py               # Celery tasks
│   │   ├── urls.py                # API routes
│   │   └── services/
│   │       ├── task_service.py    # Task automation logic
│   │       └── email_service.py   # Email rendering & sending
│   ├── nexca_backend/
│   │   ├── settings.py            # Django settings
│   │   ├── celery.py              # Celery configuration
│   │   └── urls.py                # Main URL configuration
│   ├── requirements.txt           # Python dependencies
│   └── .env.example               # Environment variables template
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   └── Layout.js          # Main layout component
│   │   ├── pages/
│   │   │   ├── Login.js
│   │   │   ├── Dashboard.js
│   │   │   ├── Clients.js
│   │   │   ├── Tasks.js
│   │   │   └── ...
│   │   ├── services/
│   │   │   └── api.js             # API service layer
│   │   ├── App.js
│   │   └── index.js
│   └── package.json
└── README.md
```

## Installation & Setup

### Prerequisites

- Python 3.8+
- Node.js 16+
- PostgreSQL 12+
- Redis

### Backend Setup

1. **Clone the repository**
```bash
cd NexCA/backend
```

2. **Create and activate virtual environment**
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. **Install dependencies**
```bash
pip install -r requirements.txt
```

4. **Configure environment variables**
```bash
cp .env.example .env
```

Edit `.env` file with your configuration:
```env
SECRET_KEY=your-secret-key-here
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

DB_NAME=nexca_db
DB_USER=postgres
DB_PASSWORD=your-db-password
DB_HOST=localhost
DB_PORT=5432

EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password

CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0

# Generate Fernet key using:
# python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
FERNET_KEY=your-fernet-encryption-key

FIRM_NAME=Your CA Firm Name
```

5. **Create PostgreSQL database**
```bash
psql -U postgres
CREATE DATABASE nexca_db;
```

6. **Run migrations**
```bash
python manage.py makemigrations
python manage.py migrate
```

7. **Create superuser**
```bash
python manage.py createsuperuser
```

8. **Run development server**
```bash
python manage.py runserver
```

9. **Start Celery worker (in a new terminal)**
```bash
celery -A nexca_backend worker -l info
```

10. **Start Celery Beat scheduler (in another terminal)**
```bash
celery -A nexca_backend beat -l info
```

### Frontend Setup

1. **Navigate to frontend directory**
```bash
cd NexCA/frontend
```

2. **Install dependencies**
```bash
npm install
```

3. **Create environment file** (optional)
```bash
# Create .env file in frontend directory
REACT_APP_API_URL=http://localhost:8000/api
```

4. **Start development server**
```bash
npm start
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000/api
- Django Admin: http://localhost:8000/admin

## API Endpoints

### Authentication
- `POST /api/auth/login/` - Login (returns JWT tokens)
- `POST /api/auth/refresh/` - Refresh access token

### Clients
- `GET /api/clients/` - List all clients
- `POST /api/clients/` - Create client
- `GET /api/clients/{id}/` - Get client details
- `PUT /api/clients/{id}/` - Update client
- `DELETE /api/clients/{id}/` - Delete client
- `GET /api/clients/{id}/works/` - Get client's work mappings
- `GET /api/clients/{id}/tasks/` - Get client's tasks

### Work Types
- `GET /api/work-types/` - List work types
- `POST /api/work-types/` - Create work type
- `GET /api/work-types/{id}/` - Get work type
- `PUT /api/work-types/{id}/` - Update work type

### Tasks (Work Instances)
- `GET /api/tasks/` - List all tasks
- `POST /api/tasks/` - Create task
- `GET /api/tasks/{id}/` - Get task details
- `PUT /api/tasks/{id}/` - Update task
- `POST /api/tasks/{id}/complete/` - Mark task as completed
- `POST /api/tasks/{id}/update_due_date/` - Update due date
- `GET /api/tasks/{id}/reminders/` - Get task reminders

### Credentials
- `GET /api/credentials/` - List credentials
- `POST /api/credentials/` - Create credential
- `GET /api/credentials/{id}/?reveal_password=true` - Get credential (reveal password)
- `PUT /api/credentials/{id}/` - Update credential

### Email Templates
- `GET /api/email-templates/` - List templates
- `POST /api/email-templates/` - Create template

### Reminder Rules
- `GET /api/reminder-rules/` - List reminder rules
- `POST /api/reminder-rules/` - Create reminder rule

### Dashboard
- `GET /api/dashboard/summary/` - Get dashboard statistics
- `GET /api/dashboard/upcoming_tasks/` - Get upcoming tasks

## Database Models

### Client
- client_code (unique)
- client_name
- PAN, GSTIN
- email, mobile
- category (Individual/Firm/Company/Trust)
- status (Active/Inactive)

### WorkType
- work_name (e.g., GST Return, ITR)
- statutory_form (e.g., GSTR-3B, ITR-3)
- default_frequency (Monthly/Quarterly/Yearly)
- is_active

### ClientWorkMapping
- client → Client
- work_type → WorkType
- freq_override (optional frequency override)
- start_from_period
- active

### WorkInstance
- client_work → ClientWorkMapping
- period_label (e.g., "Apr 2025", "Q1 2025-26")
- due_date
- status (Not Started/Started/In Progress/Completed/Overdue)
- assigned_to → User
- completed_on

### CredentialVault
- client → Client
- portal_type (GST/IncomeTax/TDS/MCA/Bank/Others)
- login_url
- username
- password_enc (Fernet encrypted)
- extra_info

### EmailTemplate
- work_type → WorkType
- template_name
- subject_template
- body_template (supports placeholders)
- is_active

### ReminderRule
- work_type → WorkType
- offset_days (relative to due_date)
- reminder_type (Document/Filing/Overdue)
- email_template → EmailTemplate
- repeat_if_pending, repeat_interval, max_repeats

### ReminderInstance
- work_instance → WorkInstance
- reminder_rule → ReminderRule
- scheduled_at
- send_status (Pending/Sent/Failed/Cancelled)
- repeat_count

## How It Works

### 1. Automatic Task Creation

When a `ClientWorkMapping` is created:
1. System determines frequency (Monthly/Quarterly/Yearly)
2. Calculates next period label and due date
3. Creates first `WorkInstance`
4. Generates reminder instances based on `ReminderRules`

### 2. Task Completion Workflow

When a task is marked as **Completed**:
1. Sets `completed_on` date
2. Cancels all pending reminders
3. Automatically creates next period's task
4. Generates reminders for the new task

### 3. Email Reminder System

Celery Beat runs every 10 minutes:
1. Fetches pending reminders with `scheduled_at <= now`
2. Skips if task is already completed
3. Renders email template with placeholders
4. Sends email via SMTP
5. Creates repeat reminder if configured

### 4. Template Placeholders

Email templates support these placeholders:
- `{{client_name}}` - Client name
- `{{PAN}}` - PAN number
- `{{GSTIN}}` - GSTIN number
- `{{period_label}}` - Period (e.g., "Apr 2025")
- `{{due_date}}` - Due date
- `{{work_name}}` - Work type name
- `{{firm_name}}` - CA firm name

## Security

- **JWT Authentication**: Secure token-based API authentication
- **Password Encryption**: Fernet AES-256 encryption for portal credentials
- **HTTPS**: Required in production
- **Environment Variables**: Sensitive data stored in .env
- **Role-Based Access**: Partner/Manager/Staff/Admin roles
- **CORS**: Configured for frontend-backend communication

## Production Deployment

### Backend (Linux + Gunicorn + Nginx)

1. **Install dependencies**
```bash
pip install gunicorn
```

2. **Collect static files**
```bash
python manage.py collectstatic
```

3. **Run Gunicorn**
```bash
gunicorn nexca_backend.wsgi:application --bind 0.0.0.0:8000
```

4. **Configure Nginx** (example)
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location /api {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location / {
        root /path/to/frontend/build;
        try_files $uri /index.html;
    }
}
```

5. **Setup Celery as systemd service**
Create `/etc/systemd/system/celery.service` and `/etc/systemd/system/celerybeat.service`

### Frontend Build

```bash
cd frontend
npm run build
```

Deploy the `build` folder to your web server.

## Common Tasks

### Generate Encryption Key
```bash
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

### Create Sample Data
```python
python manage.py shell

from core.models import Client, WorkType, ClientWorkMapping
from django.contrib.auth import get_user_model

# Create client
client = Client.objects.create(
    client_code="C001",
    client_name="ABC Pvt Ltd",
    PAN="ABCDE1234F",
    email="abc@example.com",
    category="COMPANY",
    status="ACTIVE"
)

# Create work type
work_type = WorkType.objects.create(
    work_name="GST Return",
    statutory_form="GSTR-3B",
    default_frequency="MONTHLY",
    is_active=True
)

# Assign work to client
ClientWorkMapping.objects.create(
    client=client,
    work_type=work_type,
    start_from_period="Apr 2025",
    active=True
)
```

## Troubleshooting

### Celery not running
- Check Redis is running: `redis-cli ping`
- Verify CELERY_BROKER_URL in .env

### Email not sending
- Check EMAIL_HOST, EMAIL_PORT, EMAIL_HOST_USER, EMAIL_HOST_PASSWORD
- For Gmail, use App Password instead of regular password

### Database connection error
- Verify PostgreSQL is running
- Check DB_NAME, DB_USER, DB_PASSWORD in .env

## License

Proprietary - All rights reserved

## Support

For issues and questions, please contact the development team.
