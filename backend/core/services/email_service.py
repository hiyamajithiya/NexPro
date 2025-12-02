from django.core.mail import send_mail, get_connection
from django.conf import settings
from datetime import datetime
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart


class EmailService:
    """Service for rendering and sending emails"""

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
    def send_email_via_platform_smtp(to_email, subject, body, html_body=None):
        """
        Send an email using the platform's SMTP configuration.
        Falls back to Django settings if platform SMTP is not configured.
        Returns: (success: bool, error_message: str or None)
        """
        smtp_config = EmailService.get_platform_smtp_settings()

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
                return True, None
            except Exception as e:
                return False, str(e)

        # Use platform SMTP settings
        try:
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = f'{smtp_config["from_name"]} <{smtp_config["from_email"]}>'
            msg['To'] = to_email

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

            return True, None
        except Exception as e:
            return False, str(e)

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
    def send_reminder_email(reminder_instance):
        """
        Send a reminder email based on reminder instance.
        Uses the organization's email account configuration.
        Returns: (success: bool, error_message: str or None)
        """
        try:
            work_instance = reminder_instance.work_instance
            email_template = reminder_instance.reminder_rule.email_template
            organization = work_instance.organization
            work_type = work_instance.client_work.work_type

            # Build context
            context = EmailService.get_context_from_work_instance(work_instance)

            # Render subject and body
            subject = EmailService.render_template(email_template.subject_template, context)
            body = EmailService.render_template(email_template.body_template, context)

            # Store rendered content
            reminder_instance.subject_rendered = subject
            reminder_instance.body_rendered = body

            # Send email using organization's email account
            success, error = EmailService.send_email_for_organization(
                organization=organization,
                to_email=reminder_instance.email_to,
                subject=subject,
                body=body,
                work_type=work_type
            )

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
        html_body=None
    ):
        """
        Send an email using custom SMTP configuration.
        Returns: (success: bool, error_message: str or None)
        """
        try:
            # Create message
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = from_email
            msg['To'] = to_email

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

            return True, None
        except Exception as e:
            return False, str(e)

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
    def send_email_for_organization(organization, to_email, subject, body, html_body=None, work_type=None):
        """
        Send an email using the organization's email account configuration.
        If work_type is provided, uses the email linked to that work type.
        Otherwise uses the default email account.
        Returns: (success: bool, error_message: str or None)
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
            try:
                send_mail(
                    subject=subject,
                    message=body,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[to_email],
                    html_message=html_body,
                    fail_silently=False,
                )
                return True, None
            except Exception as e:
                return False, str(e)

        # Use the email account's configuration
        if email_account.use_custom_smtp and email_account.smtp_host:
            return EmailService.send_email_with_custom_smtp(
                to_email=to_email,
                subject=subject,
                body=body,
                from_email=email_account.email_address,
                smtp_host=email_account.smtp_host,
                smtp_port=email_account.smtp_port or 587,
                smtp_username=email_account.smtp_username,
                smtp_password=email_account.smtp_password,
                use_tls=email_account.smtp_use_tls,
                html_body=html_body,
            )
        else:
            # Use Django's default email backend with the account's email address
            try:
                send_mail(
                    subject=subject,
                    message=body,
                    from_email=email_account.email_address,
                    recipient_list=[to_email],
                    html_message=html_body,
                    fail_silently=False,
                )
                return True, None
            except Exception as e:
                return False, str(e)

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

        # Check if using custom SMTP
        if email_account.use_custom_smtp and email_account.smtp_host:
            return EmailService.send_email_with_custom_smtp(
                to_email=recipient_email,
                subject=subject,
                body=message,
                from_email=email_account.email_address,
                smtp_host=email_account.smtp_host,
                smtp_port=email_account.smtp_port or 587,
                smtp_username=email_account.smtp_username,
                smtp_password=email_account.smtp_password,
                use_tls=email_account.smtp_use_tls,
            )
        else:
            # Use default SMTP configuration
            return EmailService.send_test_email(
                recipient_email=recipient_email,
                subject=subject,
                message=message
            )
