from django.core.mail import send_mail, get_connection
from django.conf import settings
from datetime import datetime
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.utils import make_msgid
import re
import logging
import uuid

logger = logging.getLogger(__name__)


class EmailService:
    """Service for rendering and sending emails"""

    # ==========================================================================
    # Email Tracking Support
    # ==========================================================================

    @staticmethod
    def generate_tracking_id():
        """Generate a unique tracking ID for an email"""
        return str(uuid.uuid4()).replace('-', '')

    @staticmethod
    def add_tracking_headers(msg, tracking_id, organization_id=None):
        """
        Add tracking headers to an email message.

        Headers added:
        - X-NexPro-Tracking-ID: Unique tracking ID for this email
        - X-NexPro-Org-ID: Organization ID (if applicable)
        - Message-ID: Standard message ID (if not already set)

        Args:
            msg: MIMEMultipart message object
            tracking_id: Unique tracking ID
            organization_id: Optional organization ID

        Returns:
            str: The Message-ID that was set/used
        """
        # Add custom tracking header
        msg['X-NexPro-Tracking-ID'] = tracking_id

        # Add organization ID if provided
        if organization_id:
            msg['X-NexPro-Org-ID'] = str(organization_id)

        # Generate and set Message-ID if not already set
        if 'Message-ID' not in msg:
            domain = settings.DEFAULT_FROM_EMAIL.split('@')[-1] if '@' in settings.DEFAULT_FROM_EMAIL else 'nexpro.local'
            message_id = make_msgid(idstring=tracking_id[:8], domain=domain)
            msg['Message-ID'] = message_id
        else:
            message_id = msg['Message-ID']

        return message_id

    @staticmethod
    def log_email(organization, from_email, to_email, subject, tracking_id,
                  email_type='OTHER', provider='SMTP', message_id=None,
                  work_instance=None, reminder_instance=None, client=None,
                  user=None, cc_emails='', bcc_emails='', metadata=None):
        """
        Log an email to the EmailLog model.

        Returns: EmailLog instance or None if logging fails
        """
        try:
            from core.models import EmailLog

            email_log = EmailLog.objects.create(
                organization=organization,
                tracking_id=tracking_id,
                message_id=message_id,
                from_email=from_email,
                to_email=to_email,
                cc_emails=cc_emails,
                bcc_emails=bcc_emails,
                subject=subject,
                email_type=email_type,
                provider=provider,
                work_instance=work_instance,
                reminder_instance=reminder_instance,
                client=client,
                user=user,
                status='PENDING',
                metadata=metadata or {}
            )
            return email_log
        except Exception as e:
            logger.error(f"Failed to log email: {str(e)}")
            return None

    # ==========================================================================
    # Email Provider Support (SendGrid, SES, SMTP)
    # ==========================================================================

    @staticmethod
    def send_via_sendgrid(to_email, subject, body, from_email, from_name=None, html_body=None):
        """
        Send email via SendGrid API.
        Returns: (success: bool, error_message: str or None)
        """
        try:
            from sendgrid import SendGridAPIClient
            from sendgrid.helpers.mail import Mail, Email, To, Content, HtmlContent
        except ImportError:
            return False, "SendGrid library not installed. Run: pip install sendgrid"

        from core.models import PlatformSettings
        platform_settings = PlatformSettings.get_settings()

        if not platform_settings.sendgrid_api_key:
            return False, "SendGrid API key not configured"

        try:
            # Create the email message
            from_email_obj = Email(from_email, from_name) if from_name else Email(from_email)
            to_email_obj = To(to_email)
            plain_content = Content("text/plain", body)

            message = Mail(
                from_email=from_email_obj,
                to_emails=to_email_obj,
                subject=subject,
                plain_text_content=plain_content
            )

            # Add HTML content if provided
            if html_body:
                message.add_content(Content("text/html", html_body))

            # Send via SendGrid API
            sg = SendGridAPIClient(platform_settings.sendgrid_api_key)
            response = sg.send(message)

            if response.status_code in [200, 201, 202]:
                return True, None
            else:
                return False, f"SendGrid returned status {response.status_code}"

        except Exception as e:
            logger.error(f"SendGrid error: {str(e)}")
            return False, str(e)

    @staticmethod
    def send_via_ses(to_email, subject, body, from_email, from_name=None, html_body=None):
        """
        Send email via Amazon SES.
        Returns: (success: bool, error_message: str or None)
        """
        try:
            import boto3
            from botocore.exceptions import ClientError
        except ImportError:
            return False, "boto3 library not installed. Run: pip install boto3"

        from core.models import PlatformSettings
        platform_settings = PlatformSettings.get_settings()

        if not platform_settings.aws_access_key_id or not platform_settings.aws_secret_access_key:
            return False, "AWS credentials not configured"

        try:
            # Create SES client
            client = boto3.client(
                'ses',
                region_name=platform_settings.aws_region or 'us-east-1',
                aws_access_key_id=platform_settings.aws_access_key_id,
                aws_secret_access_key=platform_settings.aws_secret_access_key
            )

            # Prepare sender
            sender = f"{from_name} <{from_email}>" if from_name else from_email

            # Build email body
            body_content = {'Text': {'Charset': 'UTF-8', 'Data': body}}
            if html_body:
                body_content['Html'] = {'Charset': 'UTF-8', 'Data': html_body}

            # Send email
            response = client.send_email(
                Destination={'ToAddresses': [to_email]},
                Message={
                    'Subject': {'Charset': 'UTF-8', 'Data': subject},
                    'Body': body_content
                },
                Source=sender
            )

            return True, None

        except Exception as e:
            logger.error(f"Amazon SES error: {str(e)}")
            return False, str(e)

    @staticmethod
    def send_email_with_provider(to_email, subject, body, from_email=None, from_name=None, html_body=None, organization=None):
        """
        Send email using the configured email provider (SMTP, SendGrid, or SES).
        Includes rate limiting check.
        Returns: (success: bool, error_message: str or None)
        """
        from core.models import PlatformSettings, EmailUsageLog

        platform_settings = PlatformSettings.get_settings()

        # Check rate limits
        can_send, limit_error = EmailUsageLog.increment_count(organization)
        if not can_send:
            logger.warning(f"Email rate limit reached: {limit_error}")
            return False, limit_error

        # Default from email/name from platform settings
        if not from_email:
            from_email = platform_settings.smtp_from_email or platform_settings.smtp_username
        if not from_name:
            from_name = platform_settings.smtp_from_name or platform_settings.platform_name

        provider = platform_settings.email_provider

        if provider == 'SENDGRID':
            return EmailService.send_via_sendgrid(to_email, subject, body, from_email, from_name, html_body)
        elif provider == 'SES':
            return EmailService.send_via_ses(to_email, subject, body, from_email, from_name, html_body)
        else:
            # Default to SMTP
            return EmailService.send_email_via_platform_smtp(to_email, subject, body, html_body)

    @staticmethod
    def get_platform_smtp_settings():
        """
        Get platform-level SMTP settings from PlatformSettings model.
        Returns: dict with SMTP configuration or None if not configured
        """
        from core.models import PlatformSettings

        try:
            platform_settings = PlatformSettings.get_settings()

            if not platform_settings.smtp_enabled:
                return None

            if not all([
                platform_settings.smtp_host,
                platform_settings.smtp_username,
                platform_settings.smtp_password
            ]):
                return None

            return {
                'host': platform_settings.smtp_host,
                'port': platform_settings.smtp_port,
                'username': platform_settings.smtp_username,
                'password': platform_settings.smtp_password,
                'use_tls': platform_settings.smtp_use_tls,
                'use_ssl': platform_settings.smtp_use_ssl,
                'from_email': platform_settings.smtp_from_email or platform_settings.smtp_username,
                'from_name': platform_settings.smtp_from_name or platform_settings.platform_name,
            }
        except Exception:
            return None

    @staticmethod
    def send_email_via_platform_smtp_with_from(to_email, subject, body, from_email=None,
                                                from_name=None, html_body=None,
                                                organization=None, email_type='OTHER',
                                                work_instance=None, reminder_instance=None,
                                                client=None, user=None):
        """
        Send an email using the platform's SMTP configuration with a custom "from" address.
        This is used when tenants want to use platform SMTP but with their own sender identity.
        Falls back to Django settings if platform SMTP is not configured.
        Returns: (success: bool, error_message: str or None, tracking_id: str or None)
        """
        # Generate tracking ID for this email
        tracking_id = EmailService.generate_tracking_id()
        actual_from_email = from_email or settings.DEFAULT_FROM_EMAIL

        # Create email log entry
        email_log = EmailService.log_email(
            organization=organization,
            from_email=actual_from_email,
            to_email=to_email,
            subject=subject,
            tracking_id=tracking_id,
            email_type=email_type,
            provider='SMTP',
            work_instance=work_instance,
            reminder_instance=reminder_instance,
            client=client,
            user=user
        )

        smtp_config = EmailService.get_platform_smtp_settings()

        if not smtp_config:
            # Fall back to Django settings
            try:
                sender = f'{from_name} <{from_email}>' if from_name and from_email else (from_email or settings.DEFAULT_FROM_EMAIL)
                send_mail(
                    subject=subject,
                    message=body,
                    from_email=sender,
                    recipient_list=[to_email],
                    html_message=html_body,
                    fail_silently=False,
                )
                if email_log:
                    email_log.mark_sent()
                return True, None, tracking_id
            except Exception as e:
                if email_log:
                    email_log.mark_failed(str(e))
                return False, str(e), tracking_id

        # Use platform SMTP settings with custom from address
        try:
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            # Use provided from_email/from_name, or fall back to platform defaults
            actual_from_email = from_email or smtp_config["from_email"]
            actual_from_name = from_name or smtp_config["from_name"]
            msg['From'] = f'{actual_from_name} <{actual_from_email}>'
            msg['To'] = to_email

            # Add tracking headers
            message_id = EmailService.add_tracking_headers(
                msg, tracking_id,
                organization_id=organization.id if organization else None
            )

            # Attach plain text
            part1 = MIMEText(body, 'plain')
            msg.attach(part1)

            # Attach HTML if provided
            if html_body:
                part2 = MIMEText(html_body, 'html')
                msg.attach(part2)

            # Connect to SMTP server
            if smtp_config['use_ssl']:
                server = smtplib.SMTP_SSL(smtp_config['host'], smtp_config['port'])
            else:
                server = smtplib.SMTP(smtp_config['host'], smtp_config['port'])
                if smtp_config['use_tls']:
                    server.starttls()

            # Login and send
            server.login(smtp_config['username'], smtp_config['password'])
            server.sendmail(smtp_config['from_email'], [to_email], msg.as_string())
            server.quit()

            # Mark as sent
            if email_log:
                email_log.mark_sent(message_id=message_id)

            logger.info(f"Email sent via platform SMTP with custom from. Tracking ID: {tracking_id}")
            return True, None, tracking_id
        except Exception as e:
            if email_log:
                email_log.mark_failed(str(e))
            return False, str(e), tracking_id

    @staticmethod
    def send_email_via_platform_smtp(to_email, subject, body, html_body=None,
                                     organization=None, email_type='OTHER',
                                     work_instance=None, reminder_instance=None,
                                     client=None, user=None):
        """
        Send an email using the platform's SMTP configuration.
        Falls back to Django settings if platform SMTP is not configured.

        Now includes email tracking with unique tracking ID.

        Returns: (success: bool, error_message: str or None, tracking_id: str or None)
        """
        # Generate tracking ID for this email
        tracking_id = EmailService.generate_tracking_id()

        smtp_config = EmailService.get_platform_smtp_settings()
        from_email = smtp_config['from_email'] if smtp_config else settings.DEFAULT_FROM_EMAIL

        # Create email log entry
        email_log = EmailService.log_email(
            organization=organization,
            from_email=from_email,
            to_email=to_email,
            subject=subject,
            tracking_id=tracking_id,
            email_type=email_type,
            provider='SMTP',
            work_instance=work_instance,
            reminder_instance=reminder_instance,
            client=client,
            user=user
        )

        if not smtp_config:
            # Fall back to Django settings
            try:
                send_mail(
                    subject=subject,
                    message=body,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[to_email],
                    html_message=html_body,
                    fail_silently=False,
                )
                # Mark as sent
                if email_log:
                    email_log.mark_sent()
                return True, None, tracking_id
            except Exception as e:
                if email_log:
                    email_log.mark_failed(str(e))
                return False, str(e), tracking_id

        # Use platform SMTP settings
        try:
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = f'{smtp_config["from_name"]} <{smtp_config["from_email"]}>'
            msg['To'] = to_email

            # Add tracking headers
            message_id = EmailService.add_tracking_headers(
                msg, tracking_id,
                organization_id=organization.id if organization else None
            )

            # Attach plain text
            part1 = MIMEText(body, 'plain')
            msg.attach(part1)

            # Attach HTML if provided
            if html_body:
                part2 = MIMEText(html_body, 'html')
                msg.attach(part2)

            # Connect to SMTP server
            if smtp_config['use_ssl']:
                server = smtplib.SMTP_SSL(smtp_config['host'], smtp_config['port'])
            else:
                server = smtplib.SMTP(smtp_config['host'], smtp_config['port'])
                if smtp_config['use_tls']:
                    server.starttls()

            # Login and send
            server.login(smtp_config['username'], smtp_config['password'])
            server.sendmail(smtp_config['from_email'], [to_email], msg.as_string())
            server.quit()

            # Mark as sent with message ID
            if email_log:
                email_log.mark_sent(message_id=message_id)

            logger.info(f"Email sent successfully. Tracking ID: {tracking_id}")
            return True, None, tracking_id
        except Exception as e:
            if email_log:
                email_log.mark_failed(str(e))
            return False, str(e), tracking_id

    @staticmethod
    def render_template(template_str, context):
        """
        Replace placeholders in template with actual values
        Supported placeholders: {{client_name}}, {{PAN}}, {{GSTIN}}, {{period_label}},
        {{due_date}}, {{work_name}}, {{firm_name}}
        """
        for key, value in context.items():
            placeholder = f"{{{{{key}}}}}"
            template_str = template_str.replace(placeholder, str(value) if value else '')
        return template_str

    @staticmethod
    def get_context_from_work_instance(work_instance):
        """Build context dictionary from work instance"""
        client = work_instance.client_work.client
        work_type = work_instance.client_work.work_type

        return {
            'client_name': client.client_name,
            'PAN': client.PAN or 'N/A',
            'GSTIN': client.GSTIN or 'N/A',
            'period_label': work_instance.period_label,
            'due_date': work_instance.due_date.strftime('%d-%b-%Y'),
            'work_name': work_type.work_name,
            'statutory_form': work_type.statutory_form or '',
            'firm_name': settings.FIRM_NAME,
        }

    @staticmethod
    def build_professional_html_email(
        subject,
        body_content,
        recipient_type='CLIENT',
        organization_name='NexPro',
        task_details=None,
        is_overdue=False
    ):
        """
        Build a professional HTML email template with the application theme.

        Args:
            subject: Email subject for the header
            body_content: The main body content (can be plain text or HTML)
            recipient_type: 'CLIENT' or 'EMPLOYEE' for styling variations
            organization_name: Name of the organization sending the email
            task_details: Optional dict with task info (work_name, period_label, due_date, status)
            is_overdue: Boolean to show overdue styling

        Returns:
            HTML string for the email
        """
        # Convert plain text newlines to HTML breaks if content doesn't have HTML tags
        if not re.search(r'<[^>]+>', body_content):
            body_content = body_content.replace('\n', '<br>')

        # Theme colors based on application
        primary_gradient = "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"

        # Determine header icon and color based on recipient type
        if recipient_type == 'CLIENT':
            header_icon = "📋"
            header_title = "Task Reminder"
            accent_color = "#667eea"
        else:
            header_icon = "📌"
            header_title = "Task Assignment Reminder"
            accent_color = "#764ba2"

        # Overdue styling
        if is_overdue:
            status_badge_bg = "#fee2e2"
            status_badge_color = "#dc2626"
            status_badge_border = "#fecaca"
        else:
            status_badge_bg = "#dcfce7"
            status_badge_color = "#16a34a"
            status_badge_border = "#bbf7d0"

        # Build task details card if provided
        task_card_html = ""
        if task_details:
            status_text = task_details.get('status', 'Pending')
            if is_overdue:
                status_badge = f'<span style="background: {status_badge_bg}; color: {status_badge_color}; border: 1px solid {status_badge_border}; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;">⚠️ OVERDUE</span>'
            else:
                status_badge = f'<span style="background: {status_badge_bg}; color: {status_badge_color}; border: 1px solid {status_badge_border}; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;">{status_text}</span>'

            task_card_html = f'''
                            <!-- Task Details Card -->
                            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 25px 0;">
                                <div style="display: flex; align-items: center; margin-bottom: 15px;">
                                    <span style="font-size: 18px; margin-right: 8px;">📝</span>
                                    <span style="font-size: 16px; font-weight: 600; color: #334155;">Task Details</span>
                                </div>
                                <table style="width: 100%; border-collapse: collapse;">
                                    <tr>
                                        <td style="padding: 8px 0; color: #64748b; font-size: 13px; width: 120px;">Task Name</td>
                                        <td style="padding: 8px 0; color: #1e293b; font-size: 14px; font-weight: 500;">{task_details.get('work_name', 'N/A')}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #64748b; font-size: 13px; border-top: 1px solid #e2e8f0;">Period</td>
                                        <td style="padding: 8px 0; color: #1e293b; font-size: 14px; font-weight: 500; border-top: 1px solid #e2e8f0;">{task_details.get('period_label', 'N/A')}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #64748b; font-size: 13px; border-top: 1px solid #e2e8f0;">Due Date</td>
                                        <td style="padding: 8px 0; color: #1e293b; font-size: 14px; font-weight: 600; border-top: 1px solid #e2e8f0;">
                                            <span style="color: {'#dc2626' if is_overdue else '#1e293b'};">📅 {task_details.get('due_date', 'N/A')}</span>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #64748b; font-size: 13px; border-top: 1px solid #e2e8f0;">Status</td>
                                        <td style="padding: 8px 0; border-top: 1px solid #e2e8f0;">{status_badge}</td>
                                    </tr>
                                    {f'<tr><td style="padding: 8px 0; color: #64748b; font-size: 13px; border-top: 1px solid #e2e8f0;">Client</td><td style="padding: 8px 0; color: #1e293b; font-size: 14px; font-weight: 500; border-top: 1px solid #e2e8f0;">👤 {task_details.get("client_name", "")}</td></tr>' if task_details.get('client_name') else ''}
                                </table>
                            </div>
            '''

        # Build the complete HTML email
        html_email = f'''<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{subject}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f8; -webkit-font-smoothing: antialiased;">
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 40px rgba(102, 126, 234, 0.15);">

                    <!-- Header -->
                    <tr>
                        <td style="background: {primary_gradient}; padding: 35px 30px; text-align: center;">
                            <table role="presentation" style="width: 100%; border-collapse: collapse;">
                                <tr>
                                    <td align="center">
                                        <div style="width: 60px; height: 60px; background: rgba(255,255,255,0.2); border-radius: 50%; margin: 0 auto 12px; line-height: 60px;">
                                            <span style="font-size: 28px;">{header_icon}</span>
                                        </div>
                                        <h1 style="margin: 0; color: white; font-size: 24px; font-weight: 700;">{header_title}</h1>
                                        <p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.85); font-size: 13px;">from {organization_name}</p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Main Content -->
                    <tr>
                        <td style="padding: 35px 30px;">
                            <!-- Body Content -->
                            <div style="color: #374151; font-size: 15px; line-height: 1.7;">
                                {body_content}
                            </div>

                            {task_card_html}

                            <!-- Action Note -->
                            <div style="background: linear-gradient(135deg, #eff6ff 0%, #f5f3ff 100%); border-left: 4px solid {accent_color}; border-radius: 0 8px 8px 0; padding: 15px 20px; margin: 25px 0;">
                                <p style="margin: 0; color: #4338ca; font-size: 14px; font-weight: 500;">
                                    💡 Please take necessary action at the earliest to ensure timely completion.
                                </p>
                            </div>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background: #f8fafc; padding: 25px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
                            <table role="presentation" style="width: 100%; border-collapse: collapse;">
                                <tr>
                                    <td align="center">
                                        <p style="margin: 0 0 8px 0; color: #64748b; font-size: 13px; font-weight: 500;">{organization_name}</p>
                                        <p style="margin: 0 0 12px 0; color: #94a3b8; font-size: 12px;">Professional Practice Management System</p>
                                        <div style="border-top: 1px solid #e2e8f0; padding-top: 15px; margin-top: 15px;">
                                            <p style="margin: 0; color: #94a3b8; font-size: 11px;">This is an automated reminder email. Please do not reply directly to this email.</p>
                                        </div>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                </table>

                <!-- Bottom Branding -->
                <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; margin-top: 20px;">
                    <tr>
                        <td align="center">
                            <p style="margin: 0; color: #9ca3af; font-size: 11px;">
                                Powered by <span style="color: #667eea; font-weight: 600;">NexPro</span> &copy; {datetime.now().year}
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>'''

        return html_email

    @staticmethod
    def send_reminder_email(reminder_instance):
        """
        Send a reminder email based on reminder instance.
        Uses the organization's email account configuration.
        Returns: (success: bool, error_message: str or None)
        """
        from core.models import EmailTemplate

        try:
            work_instance = reminder_instance.work_instance
            organization = work_instance.organization
            work_type = work_instance.client_work.work_type
            recipient_type = reminder_instance.recipient_type

            # Build context
            context = EmailService.get_context_from_work_instance(work_instance)

            # Get task status and check if overdue
            status_display = work_instance.get_status_display()
            is_overdue = work_instance.due_date < datetime.now().date() if work_instance.due_date else False

            # Prepare task details for the HTML template
            task_details = {
                'work_name': context.get('work_name', 'Task'),
                'period_label': context.get('period_label', ''),
                'due_date': context.get('due_date', ''),
                'status': status_display,
                'client_name': context.get('client_name', '') if recipient_type == 'EMPLOYEE' else None,
            }

            organization_name = organization.name if organization else 'NexPro'

            # Check for custom email template (new system - linked to work type)
            email_template = None
            try:
                email_template = EmailTemplate.objects.filter(
                    work_type=work_type,
                    template_type=recipient_type,
                    is_active=True
                ).first()
            except Exception:
                pass

            # Check if reminder has a rule with template (old system)
            if not email_template and reminder_instance.reminder_rule and reminder_instance.reminder_rule.email_template:
                email_template = reminder_instance.reminder_rule.email_template

            if email_template:
                # Use custom template content
                subject = EmailService.render_template(email_template.subject_template, context)
                body = EmailService.render_template(email_template.body_template, context)
            else:
                # Use default template for period-based reminders
                work_name = context.get('work_name', 'Task')
                client_name = context.get('client_name', 'Client')

                if recipient_type == 'CLIENT':
                    subject = f"Reminder: {work_name} - {client_name}"
                    body = f"""Dear {client_name},

This is a friendly reminder regarding your pending compliance task.

We kindly request you to provide the necessary documents and information at the earliest to ensure timely completion.

If you have already submitted the required documents, please disregard this reminder.

Thank you for your cooperation.

Warm regards,
{organization_name}"""
                else:  # EMPLOYEE
                    subject = f"Task Reminder: {work_name} - {client_name}"
                    body = f"""Hello,

This is a reminder for the task assigned to you.

Please review the task details and ensure timely completion. Update the task status as you progress.

If you need any clarification or support, please reach out to your supervisor.

Best regards,
{organization_name}"""

            # Build professional HTML email
            html_body = EmailService.build_professional_html_email(
                subject=subject,
                body_content=body,
                recipient_type=recipient_type,
                organization_name=organization_name,
                task_details=task_details,
                is_overdue=is_overdue
            )

            # Store rendered content
            reminder_instance.subject_rendered = subject
            reminder_instance.body_rendered = body

            # Determine email type based on recipient type
            email_type = 'REMINDER_CLIENT' if recipient_type == 'CLIENT' else 'REMINDER_EMPLOYEE'

            # Get client for tracking
            client = work_instance.client_work.client if work_instance.client_work else None

            # Send email using organization's email account with HTML and tracking
            success, error, tracking_id = EmailService.send_email_for_organization(
                organization=organization,
                to_email=reminder_instance.email_to,
                subject=subject,
                body=body,
                html_body=html_body,
                work_type=work_type,
                email_type=email_type,
                work_instance=work_instance,
                reminder_instance=reminder_instance,
                client=client
            )

            # Store tracking ID in reminder instance metadata if available
            if tracking_id:
                logger.info(f"Reminder email sent with tracking ID: {tracking_id}")

            return success, error

        except Exception as e:
            return False, str(e)

    @staticmethod
    def send_test_email(recipient_email, subject='NexPro Test Email', message='This is a test email from NexPro.'):
        """
        Send a test email to verify email configuration
        Returns: (success: bool, error_message: str or None)
        """
        try:
            send_mail(
                subject=subject,
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[recipient_email],
                fail_silently=False,
            )
            return True, None
        except Exception as e:
            return False, str(e)

    @staticmethod
    def send_email(to_email, subject, body, organization=None, html_body=None):
        """
        Generic method to send an email.
        Returns: (success: bool, error_message: str or None)

        Args:
            to_email: Recipient email address
            subject: Email subject
            body: Plain text email body
            organization: Optional organization for custom from_email
            html_body: Optional HTML body
        """
        try:
            # Determine from_email based on organization settings
            from_email = settings.DEFAULT_FROM_EMAIL
            if organization and organization.default_from_email:
                from_email = organization.default_from_email

            send_mail(
                subject=subject,
                message=body,
                from_email=from_email,
                recipient_list=[to_email],
                html_message=html_body,
                fail_silently=False,
            )
            return True, None
        except Exception as e:
            return False, str(e)

    @staticmethod
    def get_email_configuration_status():
        """
        Check if email is properly configured
        Returns: dict with configuration status
        """
        is_configured = bool(
            settings.EMAIL_HOST_USER and
            settings.EMAIL_HOST_PASSWORD and
            settings.EMAIL_HOST
        )

        is_console_backend = 'console' in settings.EMAIL_BACKEND.lower()

        return {
            'configured': is_configured,
            'is_console_backend': is_console_backend,
            'email_backend': settings.EMAIL_BACKEND,
            'email_host': settings.EMAIL_HOST,
            'email_port': settings.EMAIL_PORT,
            'email_use_tls': settings.EMAIL_USE_TLS,
            'from_email': settings.DEFAULT_FROM_EMAIL if settings.DEFAULT_FROM_EMAIL else settings.EMAIL_HOST_USER,
        }

    @staticmethod
    def send_email_with_custom_smtp(
        to_email,
        subject,
        body,
        from_email,
        smtp_host,
        smtp_port,
        smtp_username,
        smtp_password,
        use_tls=True,
        html_body=None,
        organization=None,
        email_type='OTHER',
        work_instance=None,
        reminder_instance=None,
        client=None,
        user=None
    ):
        """
        Send an email using custom SMTP configuration with tracking.
        Returns: (success: bool, error_message: str or None, tracking_id: str or None)
        """
        # Generate tracking ID for this email
        tracking_id = EmailService.generate_tracking_id()

        # Create email log entry
        email_log = EmailService.log_email(
            organization=organization,
            from_email=from_email,
            to_email=to_email,
            subject=subject,
            tracking_id=tracking_id,
            email_type=email_type,
            provider='SMTP',
            work_instance=work_instance,
            reminder_instance=reminder_instance,
            client=client,
            user=user
        )

        try:
            # Create message
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = from_email
            msg['To'] = to_email

            # Add tracking headers
            message_id = EmailService.add_tracking_headers(
                msg, tracking_id,
                organization_id=organization.id if organization else None
            )

            # Attach plain text
            part1 = MIMEText(body, 'plain')
            msg.attach(part1)

            # Attach HTML if provided
            if html_body:
                part2 = MIMEText(html_body, 'html')
                msg.attach(part2)

            # Connect to SMTP server
            if use_tls:
                server = smtplib.SMTP(smtp_host, smtp_port)
                server.starttls()
            else:
                server = smtplib.SMTP_SSL(smtp_host, smtp_port)

            # Login and send
            server.login(smtp_username, smtp_password)
            server.sendmail(from_email, [to_email], msg.as_string())
            server.quit()

            # Mark as sent
            if email_log:
                email_log.mark_sent(message_id=message_id)

            logger.info(f"Email sent via custom SMTP. Tracking ID: {tracking_id}")
            return True, None, tracking_id
        except Exception as e:
            if email_log:
                email_log.mark_failed(str(e))
            return False, str(e), tracking_id

    @staticmethod
    def get_default_email_account(organization):
        """
        Get the default email account for an organization.
        If no default is set, returns the first active email account.
        Returns: OrganizationEmail instance or None
        """
        from core.models import OrganizationEmail

        # First try to get the default email
        default_email = OrganizationEmail.objects.filter(
            organization=organization,
            is_default=True,
            is_active=True
        ).first()

        if default_email:
            return default_email

        # Fallback to first active email
        return OrganizationEmail.objects.filter(
            organization=organization,
            is_active=True
        ).first()

    @staticmethod
    def send_email_for_organization(organization, to_email, subject, body, html_body=None,
                                     work_type=None, email_type='OTHER', work_instance=None,
                                     reminder_instance=None, client=None, user=None):
        """
        Send an email using the organization's email account configuration.
        If work_type is provided, uses the email linked to that work type.
        Otherwise uses the default email account.
        Returns: (success: bool, error_message: str or None, tracking_id: str or None)
        """
        from core.models import OrganizationEmail

        email_account = None

        # Try to get email account linked to work type
        if work_type and hasattr(work_type, 'email_account') and work_type.email_account:
            email_account = work_type.email_account

        # Fallback to default email account
        if not email_account:
            email_account = EmailService.get_default_email_account(organization)

        # If no email account configured, use system default
        if not email_account:
            # Generate tracking for system default emails too
            tracking_id = EmailService.generate_tracking_id()
            email_log = EmailService.log_email(
                organization=organization,
                from_email=settings.DEFAULT_FROM_EMAIL,
                to_email=to_email,
                subject=subject,
                tracking_id=tracking_id,
                email_type=email_type,
                provider='SMTP',
                work_instance=work_instance,
                reminder_instance=reminder_instance,
                client=client,
                user=user
            )
            try:
                send_mail(
                    subject=subject,
                    message=body,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[to_email],
                    html_message=html_body,
                    fail_silently=False,
                )
                if email_log:
                    email_log.mark_sent()
                return True, None, tracking_id
            except Exception as e:
                if email_log:
                    email_log.mark_failed(str(e))
                return False, str(e), tracking_id

        # Get effective SMTP settings (handles PLATFORM, CUSTOM, and INHERIT sources)
        smtp_settings = email_account.get_effective_smtp_settings()

        if smtp_settings:
            # Use custom SMTP (either direct or inherited from another account)
            return EmailService.send_email_with_custom_smtp(
                to_email=to_email,
                subject=subject,
                body=body,
                from_email=email_account.email_address,
                smtp_host=smtp_settings['host'],
                smtp_port=smtp_settings['port'],
                smtp_username=smtp_settings['username'],
                smtp_password=smtp_settings['password'],
                use_tls=smtp_settings['use_tls'],
                html_body=html_body,
                organization=organization,
                email_type=email_type,
                work_instance=work_instance,
                reminder_instance=reminder_instance,
                client=client,
                user=user
            )
        else:
            # Use platform SMTP settings with the organization's email address as "from"
            # This allows tenant to use platform's SMTP infrastructure
            return EmailService.send_email_via_platform_smtp_with_from(
                to_email=to_email,
                subject=subject,
                body=body,
                from_email=email_account.email_address,
                from_name=email_account.display_name,
                html_body=html_body,
                organization=organization,
                email_type=email_type,
                work_instance=work_instance,
                reminder_instance=reminder_instance,
                client=client,
                user=user
            )

    @staticmethod
    def send_test_email_for_account(email_account, recipient_email):
        """
        Send a test email using an organization email account's configuration.
        Returns: (success: bool, error_message: str or None)
        """
        subject = f'Test Email from {email_account.display_name or email_account.email_address}'
        message = f'''This is a test email sent from your NexPro email account.

Account: {email_account.email_address}
Display Name: {email_account.display_name or 'Not set'}

If you received this email, your email configuration is working correctly.'''

        # Get organization from email account
        organization = email_account.organization if hasattr(email_account, 'organization') else None

        # Get effective SMTP settings (handles PLATFORM, CUSTOM, and INHERIT sources)
        smtp_settings = email_account.get_effective_smtp_settings()

        if smtp_settings:
            # Use custom SMTP (either direct or inherited from another account)
            success, error, tracking_id = EmailService.send_email_with_custom_smtp(
                to_email=recipient_email,
                subject=subject,
                body=message,
                from_email=email_account.email_address,
                smtp_host=smtp_settings['host'],
                smtp_port=smtp_settings['port'],
                smtp_username=smtp_settings['username'],
                smtp_password=smtp_settings['password'],
                use_tls=smtp_settings['use_tls'],
                organization=organization,
                email_type='OTHER'
            )
            return success, error
        else:
            # Use platform SMTP settings with the account's email as sender
            success, error, tracking_id = EmailService.send_email_via_platform_smtp_with_from(
                to_email=recipient_email,
                subject=subject,
                body=message,
                from_email=email_account.email_address,
                from_name=email_account.display_name,
                organization=organization,
                email_type='OTHER'
            )
            return success, error
