# Email Configuration Guide - NexCA

## Overview

NexCA uses email to send automated reminders to clients about upcoming compliance tasks. This guide will help you configure email settings to enable reminder functionality.

## Current Configuration

By default, NexCA is configured with **Console Email Backend** for development purposes. This means emails are printed to the console instead of being sent.

To send actual emails, you need to configure SMTP settings.

## Configuration Steps

### 1. Choose an Email Provider

**Recommended: Gmail** (Most common and easy to set up)

Other options:
- Outlook/Office 365
- SendGrid
- Amazon SES
- Any SMTP server

### 2. For Gmail Users

#### Step 2.1: Enable 2-Factor Authentication

1. Go to your Google Account settings
2. Navigate to Security
3. Enable 2-Step Verification

#### Step 2.2: Generate App Password

1. Go to https://myaccount.google.com/apppasswords
2. Select app: "Mail"
3. Select device: "Other (Custom name)"
4. Enter name: "NexCA"
5. Click "Generate"
6. **Copy the 16-character password** (you'll need this)

### 3. Update Backend Configuration

Edit the file: `backend/.env`

```env
# Email Settings
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-16-char-app-password
```

**Replace:**
- `your-email@gmail.com` with your Gmail address
- `your-16-char-app-password` with the app password generated in Step 2.2

### 4. For Other Email Providers

#### Outlook/Office 365
```env
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp-mail.outlook.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-email@outlook.com
EMAIL_HOST_PASSWORD=your-password
```

#### Custom SMTP Server
```env
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=your-smtp-host.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-email@domain.com
EMAIL_HOST_PASSWORD=your-password
```

### 5. Restart the Backend Server

After updating the `.env` file:

1. Stop the backend server (Ctrl+C in the terminal)
2. Restart it:
   ```bash
   cd backend
   python manage.py runserver
   ```

### 6. Test Email Configuration

1. Open the NexCA application
2. Go to **Settings** page
3. Scroll to **Email Configuration** section
4. Enter your email address in the test field
5. Click **Send Test Email**
6. Check your inbox for the test email

## Verifying Configuration

### In the Frontend (Settings Page)

You should see:
- ✅ "Email is properly configured and ready to send reminders" (green alert)
- Email Backend: `django.core.mail.backends.smtp.EmailBackend`
- From Email: Your configured email address

### Test Commands

You can also test from the command line:

```bash
cd backend
python manage.py shell
```

Then run:
```python
from core.services.email_service import EmailService
success, error = EmailService.send_test_email('your-email@example.com')
print(f"Success: {success}, Error: {error}")
exit()
```

## Sending Reminder Emails

### Manual Sending

To manually send all pending reminder emails:

```bash
cd backend
python manage.py send_reminder_emails
```

### Dry Run (Test without sending)

```bash
python manage.py send_reminder_emails --dry-run
```

### Force Send a Specific Reminder

```bash
python manage.py send_reminder_emails --force-send=<reminder_id>
```

### Automated Sending (Recommended)

Set up Windows Task Scheduler to run the command every hour:

1. **Program**: `C:\Users\[YourUsername]\AppData\Local\Programs\Python\Python314\python.exe`
2. **Arguments**: `manage.py send_reminder_emails`
3. **Start in**: `D:\ADMIN\Documents\HMC AI\NexCA\backend`
4. **Trigger**: Every 1 hour

## How Reminder Emails Work

### 1. Email Templates

Create email templates in the **Templates** page:
- Map templates to work types
- Use placeholders like `{{client_name}}`, `{{due_date}}`, etc.

### 2. Reminder Rules

Configure reminder rules:
- Set how many days before/after due date to send
- Choose email template to use
- Configure reminder frequency (daily, alternate days, weekly)

### 3. Automatic Sending

When the `send_reminder_emails` command runs:
1. Checks all pending reminders that are due
2. Sends emails using the configured template
3. Updates reminder status to SENT or FAILED
4. Logs all activities

## Troubleshooting

### Issue: "Failed to send test email"

**Possible causes:**
1. Incorrect email/password in `.env`
2. App password not generated (for Gmail)
3. Firewall blocking SMTP port 587
4. 2FA not enabled (for Gmail)

**Solution:**
- Double-check credentials in `.env`
- Ensure app password is correct
- Try port 465 with `EMAIL_USE_SSL=True`

### Issue: "Email sends but not received"

**Possible causes:**
1. Email went to spam folder
2. Recipient email address incorrect
3. Sender email not verified

**Solution:**
- Check spam/junk folder
- Verify recipient email address
- Add sender to safe senders list

### Issue: "Authentication failed"

For Gmail:
- Ensure 2FA is enabled
- Generate new app password
- Use app password, not regular password

For Outlook:
- Enable "Less secure app access" if required
- Use app-specific password

## Security Best Practices

1. **Never commit `.env` file to Git**
   - Already in `.gitignore`
   - Contains sensitive credentials

2. **Use App Passwords**
   - Don't use your main email password
   - Generate app-specific passwords

3. **Limit Access**
   - Only share `.env` file with authorized team members
   - Store credentials securely

4. **Regular Rotation**
   - Change app passwords periodically
   - Update `.env` file after changes

## Email Template Placeholders

Available placeholders for email templates:

- `{{client_name}}` - Client name
- `{{work_name}}` - Work type name
- `{{due_date}}` - Task due date
- `{{period_label}}` - Period (e.g., "Jan 2025")
- `{{PAN}}` - Client PAN number
- `{{GSTIN}}` - Client GSTIN
- `{{statutory_form}}` - Form name (e.g., "GSTR-1")
- `{{firm_name}}` - Your firm name

## Example Email Template

**Subject:**
```
Reminder: {{work_name}} for {{client_name}} - Due {{due_date}}
```

**Body:**
```
Dear {{client_name}},

This is a friendly reminder that your {{work_name}} ({{statutory_form}}) for the period {{period_label}} is due on {{due_date}}.

Client Details:
- PAN: {{PAN}}
- GSTIN: {{GSTIN}}

Please ensure timely submission to avoid penalties.

Best regards,
{{firm_name}}
```

## Support

For issues with email configuration:
1. Check backend console for error messages
2. Verify `.env` file settings
3. Test with the command line first
4. Check email provider's documentation

---

**Last Updated**: November 2025
**Version**: 1.0
