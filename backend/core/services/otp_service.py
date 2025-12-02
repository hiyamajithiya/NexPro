"""
OTP Service for Email Verification and Password Reset.
Compliant with IT Act 2000 and DPDP Act 2023.
"""
from django.core.mail import send_mail
from django.conf import settings
from django.template.loader import render_to_string
from core.models import EmailOTP, AuditLog, User


class OTPService:
    """Service for OTP generation, sending, and verification"""

    @staticmethod
    def get_client_ip(request):
        """Extract client IP from request"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            return x_forwarded_for.split(',')[0].strip()
        return request.META.get('REMOTE_ADDR')

    @staticmethod
    def send_signup_otp(email, signup_data, request=None):
        """
        Send OTP for signup email verification.
        Returns: (success: bool, message: str)
        """
        try:
            ip_address = OTPService.get_client_ip(request) if request else None
            user_agent = request.META.get('HTTP_USER_AGENT', '') if request else None

            # Create OTP record
            otp_record, otp_code = EmailOTP.create_otp(
                email=email,
                purpose='SIGNUP',
                signup_data=signup_data,
                ip_address=ip_address,
                user_agent=user_agent
            )

            # Send email
            subject = f'NexPro - Verify Your Email (OTP: {otp_code})'
            message = f"""
Dear User,

Thank you for registering with NexPro - Professional Office Management System.

Your One-Time Password (OTP) for email verification is:

    {otp_code}

This OTP is valid for 10 minutes. Please do not share this code with anyone.

If you did not request this verification, please ignore this email.

Best Regards,
NexPro Team

---
This is an automated email. Please do not reply.
For support, contact: support@nexpro.com
"""

            html_message = f"""
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
        .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
        .otp-box {{ background: #667eea; color: white; font-size: 32px; font-weight: bold; letter-spacing: 8px; padding: 20px 40px; text-align: center; border-radius: 10px; margin: 20px 0; }}
        .warning {{ background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px; }}
        .footer {{ text-align: center; color: #666; font-size: 12px; margin-top: 20px; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 style="margin: 0;">NexPro</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Professional Office Management System</p>
        </div>
        <div class="content">
            <h2>Verify Your Email Address</h2>
            <p>Thank you for registering with NexPro. Please use the following OTP to verify your email address:</p>

            <div class="otp-box">{otp_code}</div>

            <div class="warning">
                <strong>Important:</strong>
                <ul style="margin: 10px 0 0 0; padding-left: 20px;">
                    <li>This OTP is valid for <strong>10 minutes</strong> only</li>
                    <li>Never share this code with anyone</li>
                    <li>NexPro will never ask for your OTP via phone or email</li>
                </ul>
            </div>

            <p>If you did not request this verification, please ignore this email or contact our support team.</p>
        </div>
        <div class="footer">
            <p>This is an automated email from NexPro. Please do not reply.</p>
            <p>&copy; 2024 NexPro. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
"""

            send_mail(
                subject=subject,
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[email],
                html_message=html_message,
                fail_silently=False,
            )

            # Log the action
            AuditLog.log(
                action='OTP_SENT',
                description=f'Signup OTP sent to {email}',
                request=request,
                extra_data={'purpose': 'SIGNUP', 'email': email}
            )

            return True, "OTP sent successfully to your email address."

        except Exception as e:
            return False, f"Failed to send OTP: {str(e)}"

    @staticmethod
    def send_password_reset_otp(email, request=None):
        """
        Send OTP for password reset.
        Returns: (success: bool, message: str)
        """
        try:
            # Find the user
            try:
                user = User.objects.get(email=email, is_active=True)
            except User.DoesNotExist:
                # Don't reveal if user exists or not (security best practice)
                return True, "If an account exists with this email, you will receive an OTP."

            ip_address = OTPService.get_client_ip(request) if request else None
            user_agent = request.META.get('HTTP_USER_AGENT', '') if request else None

            # Create OTP record
            otp_record, otp_code = EmailOTP.create_otp(
                email=email,
                purpose='PASSWORD_RESET',
                user=user,
                ip_address=ip_address,
                user_agent=user_agent
            )

            # Send email
            subject = f'NexPro - Password Reset OTP (OTP: {otp_code})'
            message = f"""
Dear {user.first_name or user.username},

We received a request to reset your password for your NexPro account.

Your One-Time Password (OTP) for password reset is:

    {otp_code}

This OTP is valid for 10 minutes. Please do not share this code with anyone.

If you did not request a password reset, please ignore this email or contact support immediately.

Best Regards,
NexPro Team

---
This is an automated email. Please do not reply.
For support, contact: support@nexpro.com
"""

            html_message = f"""
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: linear-gradient(135deg, #eb3349 0%, #f45c43 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
        .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
        .otp-box {{ background: #eb3349; color: white; font-size: 32px; font-weight: bold; letter-spacing: 8px; padding: 20px 40px; text-align: center; border-radius: 10px; margin: 20px 0; }}
        .warning {{ background: #f8d7da; border-left: 4px solid #dc3545; padding: 15px; margin: 20px 0; border-radius: 4px; }}
        .footer {{ text-align: center; color: #666; font-size: 12px; margin-top: 20px; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 style="margin: 0;">Password Reset Request</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">NexPro Account Security</p>
        </div>
        <div class="content">
            <h2>Hello, {user.first_name or user.username}!</h2>
            <p>We received a request to reset your password. Please use the following OTP to proceed:</p>

            <div class="otp-box">{otp_code}</div>

            <div class="warning">
                <strong>Security Alert:</strong>
                <ul style="margin: 10px 0 0 0; padding-left: 20px;">
                    <li>This OTP is valid for <strong>10 minutes</strong> only</li>
                    <li>If you did not request this, your account may be at risk</li>
                    <li>Never share this code with anyone</li>
                </ul>
            </div>

            <p>If you did not request a password reset, please ignore this email or contact our support team immediately.</p>
        </div>
        <div class="footer">
            <p>This is an automated email from NexPro. Please do not reply.</p>
            <p>&copy; 2024 NexPro. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
"""

            send_mail(
                subject=subject,
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[email],
                html_message=html_message,
                fail_silently=False,
            )

            # Log the action
            AuditLog.log(
                action='OTP_SENT',
                user=user,
                description=f'Password reset OTP sent to {email}',
                request=request,
                extra_data={'purpose': 'PASSWORD_RESET', 'email': email}
            )

            return True, "If an account exists with this email, you will receive an OTP."

        except Exception as e:
            return False, f"Failed to send OTP: {str(e)}"

    @staticmethod
    def verify_otp(email, otp_code, purpose, request=None):
        """
        Verify an OTP.
        Returns: (success: bool, result: OTP record or error message)
        """
        success, result = EmailOTP.verify_otp(email, otp_code, purpose)

        if success:
            AuditLog.log(
                action='OTP_VERIFIED',
                description=f'OTP verified for {email} ({purpose})',
                request=request,
                extra_data={'purpose': purpose, 'email': email}
            )
        else:
            AuditLog.log(
                action='OTP_FAILED',
                description=f'OTP verification failed for {email}: {result}',
                request=request,
                extra_data={'purpose': purpose, 'email': email, 'error': result}
            )

        return success, result

    @staticmethod
    def send_welcome_email(organization, admin_user):
        """
        Send welcome email to new tenant after successful registration.
        """
        try:
            subject = f'Welcome to NexPro - {organization.name}'
            message = f"""
Dear {admin_user.first_name or admin_user.username},

Welcome to NexPro - Professional Office Management System!

Your organization "{organization.name}" has been successfully registered.

Account Details:
- Organization: {organization.name}
- Admin Email: {admin_user.email}
- Plan: {organization.get_plan_display()}
- Trial Period: 30 days

Getting Started:
1. Configure your organization settings
2. Add work types (GST, TDS, etc.)
3. Add your team members
4. Start adding clients

Need Help?
- Check our Help & Guide section in the app
- Contact support: support@nexpro.com

Best Regards,
NexPro Team
"""

            html_message = f"""
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
        .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
        .info-box {{ background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e0e0e0; }}
        .steps {{ background: #e8f5e9; padding: 20px; border-radius: 8px; margin: 20px 0; }}
        .step {{ display: flex; align-items: center; margin: 10px 0; }}
        .step-number {{ background: #4caf50; color: white; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 15px; font-weight: bold; }}
        .footer {{ text-align: center; color: #666; font-size: 12px; margin-top: 20px; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 style="margin: 0;">Welcome to NexPro!</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Professional Office Management System</p>
        </div>
        <div class="content">
            <h2>Hello, {admin_user.first_name or admin_user.username}!</h2>
            <p>Congratulations! Your organization has been successfully registered with NexPro.</p>

            <div class="info-box">
                <h3 style="margin-top: 0;">Account Details</h3>
                <table style="width: 100%;">
                    <tr><td><strong>Organization:</strong></td><td>{organization.name}</td></tr>
                    <tr><td><strong>Admin Email:</strong></td><td>{admin_user.email}</td></tr>
                    <tr><td><strong>Plan:</strong></td><td>{organization.get_plan_display()}</td></tr>
                    <tr><td><strong>Trial Period:</strong></td><td>30 days</td></tr>
                </table>
            </div>

            <div class="steps">
                <h3 style="margin-top: 0;">Getting Started</h3>
                <div class="step">
                    <div class="step-number">1</div>
                    <div>Configure your organization settings</div>
                </div>
                <div class="step">
                    <div class="step-number">2</div>
                    <div>Add work types (GST, TDS, Audit, etc.)</div>
                </div>
                <div class="step">
                    <div class="step-number">3</div>
                    <div>Add your team members</div>
                </div>
                <div class="step">
                    <div class="step-number">4</div>
                    <div>Start adding clients and managing tasks</div>
                </div>
            </div>

            <p>Need help getting started? Check out our Help & Guide section in the app or contact our support team.</p>
        </div>
        <div class="footer">
            <p>This email was sent by NexPro. &copy; 2024 NexPro. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
"""

            send_mail(
                subject=subject,
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[admin_user.email],
                html_message=html_message,
                fail_silently=False,
            )

            return True, "Welcome email sent successfully."

        except Exception as e:
            return False, f"Failed to send welcome email: {str(e)}"

    @staticmethod
    def send_admin_notification(organization, admin_user):
        """
        Send notification to platform super admins when a new tenant registers.
        """
        try:
            # Find all platform admins
            platform_admins = User.objects.filter(is_platform_admin=True, is_active=True)

            if not platform_admins.exists():
                return True, "No platform admins to notify."

            admin_emails = list(platform_admins.values_list('email', flat=True))

            subject = f'New Tenant Registration - {organization.name}'
            message = f"""
New Organization Registered on NexPro

Organization Details:
- Name: {organization.name}
- Email: {organization.email}
- Phone: {organization.phone or 'Not provided'}
- Slug: {organization.slug}

Admin User Details:
- Name: {admin_user.first_name} {admin_user.last_name}
- Email: {admin_user.email}

Registration Time: {organization.created_at.strftime('%d-%b-%Y %H:%M:%S')}
Plan: {organization.get_plan_display()}
Trial Ends: {organization.trial_ends_at.strftime('%d-%b-%Y') if organization.trial_ends_at else 'N/A'}

Please review this registration in the Platform Admin panel.

---
NexPro Platform Notification
"""

            html_message = f"""
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
        .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
        .info-box {{ background: white; padding: 20px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #667eea; }}
        .badge {{ background: #4caf50; color: white; padding: 5px 15px; border-radius: 20px; font-size: 12px; }}
        .footer {{ text-align: center; color: #666; font-size: 12px; margin-top: 20px; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 style="margin: 0;">New Tenant Registration</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Platform Admin Notification</p>
        </div>
        <div class="content">
            <p><span class="badge">NEW</span> A new organization has registered on NexPro.</p>

            <div class="info-box">
                <h3 style="margin-top: 0; color: #667eea;">Organization Details</h3>
                <table style="width: 100%;">
                    <tr><td><strong>Name:</strong></td><td>{organization.name}</td></tr>
                    <tr><td><strong>Email:</strong></td><td>{organization.email}</td></tr>
                    <tr><td><strong>Phone:</strong></td><td>{organization.phone or 'Not provided'}</td></tr>
                    <tr><td><strong>Slug:</strong></td><td>{organization.slug}</td></tr>
                </table>
            </div>

            <div class="info-box">
                <h3 style="margin-top: 0; color: #667eea;">Admin User Details</h3>
                <table style="width: 100%;">
                    <tr><td><strong>Name:</strong></td><td>{admin_user.first_name} {admin_user.last_name}</td></tr>
                    <tr><td><strong>Email:</strong></td><td>{admin_user.email}</td></tr>
                </table>
            </div>

            <div class="info-box">
                <h3 style="margin-top: 0; color: #667eea;">Subscription Details</h3>
                <table style="width: 100%;">
                    <tr><td><strong>Plan:</strong></td><td>{organization.get_plan_display()}</td></tr>
                    <tr><td><strong>Status:</strong></td><td>{organization.get_status_display()}</td></tr>
                    <tr><td><strong>Trial Ends:</strong></td><td>{organization.trial_ends_at.strftime('%d-%b-%Y') if organization.trial_ends_at else 'N/A'}</td></tr>
                    <tr><td><strong>Registered:</strong></td><td>{organization.created_at.strftime('%d-%b-%Y %H:%M:%S')}</td></tr>
                </table>
            </div>

            <p style="text-align: center; margin-top: 20px;">
                <a href="#" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px;">View in Admin Panel</a>
            </p>
        </div>
        <div class="footer">
            <p>NexPro Platform Admin Notification</p>
        </div>
    </div>
</body>
</html>
"""

            send_mail(
                subject=subject,
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=admin_emails,
                html_message=html_message,
                fail_silently=False,
            )

            return True, f"Admin notification sent to {len(admin_emails)} platform admin(s)."

        except Exception as e:
            return False, f"Failed to send admin notification: {str(e)}"
