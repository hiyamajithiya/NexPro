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
    def get_frontend_url():
        """Get the frontend URL from settings"""
        return getattr(settings, 'FRONTEND_URL', 'https://nexpro.chinmaytechnosoft.com')

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
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verify Your Email - NexPro</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f8;">
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 40px rgba(102, 126, 234, 0.15);">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
                            <div style="width: 70px; height: 70px; background: rgba(255,255,255,0.2); border-radius: 50%; margin: 0 auto 15px; display: flex; align-items: center; justify-content: center;">
                                <span style="font-size: 32px; font-weight: 700; color: white;">N</span>
                            </div>
                            <h1 style="margin: 0; color: white; font-size: 28px; font-weight: 700;">NexPro</h1>
                            <p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">Professional Practice Management</p>
                        </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <h2 style="margin: 0 0 10px 0; color: #333; font-size: 24px; font-weight: 600;">Verify Your Email</h2>
                            <p style="margin: 0 0 25px 0; color: #666; font-size: 15px; line-height: 1.6;">Thank you for registering with NexPro. Please use the following OTP to verify your email address:</p>

                            <!-- OTP Box -->
                            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; padding: 25px; text-align: center; margin: 25px 0;">
                                <p style="margin: 0 0 8px 0; color: rgba(255,255,255,0.8); font-size: 12px; text-transform: uppercase; letter-spacing: 2px;">Your Verification Code</p>
                                <p style="margin: 0; color: white; font-size: 36px; font-weight: 700; letter-spacing: 10px;">{otp_code}</p>
                            </div>

                            <!-- Warning Box -->
                            <div style="background: #fff8e1; border-left: 4px solid #ffc107; border-radius: 0 8px 8px 0; padding: 15px 20px; margin: 25px 0;">
                                <p style="margin: 0 0 8px 0; color: #856404; font-weight: 600; font-size: 14px;">⚠️ Important Security Information</p>
                                <ul style="margin: 0; padding-left: 20px; color: #856404; font-size: 13px; line-height: 1.8;">
                                    <li>This OTP is valid for <strong>10 minutes</strong> only</li>
                                    <li>Never share this code with anyone</li>
                                    <li>NexPro will never ask for your OTP via phone or email</li>
                                </ul>
                            </div>

                            <p style="margin: 25px 0 0 0; color: #999; font-size: 13px; line-height: 1.6;">If you did not request this verification, please ignore this email or contact our support team.</p>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background: #f8f9fa; padding: 25px 30px; text-align: center; border-top: 1px solid #eee;">
                            <p style="margin: 0 0 8px 0; color: #999; font-size: 12px;">This is an automated email from NexPro. Please do not reply.</p>
                            <p style="margin: 0; color: #bbb; font-size: 11px;">&copy; 2024 NexPro. All rights reserved.</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
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

            frontend_url = OTPService.get_frontend_url()

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
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Reset - NexPro</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f8;">
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 40px rgba(235, 51, 73, 0.15);">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #eb3349 0%, #f45c43 100%); padding: 40px 30px; text-align: center;">
                            <div style="width: 70px; height: 70px; background: rgba(255,255,255,0.2); border-radius: 50%; margin: 0 auto 15px;">
                                <span style="font-size: 32px; line-height: 70px;">🔐</span>
                            </div>
                            <h1 style="margin: 0; color: white; font-size: 24px; font-weight: 700;">Password Reset Request</h1>
                            <p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">NexPro Account Security</p>
                        </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <h2 style="margin: 0 0 10px 0; color: #333; font-size: 22px; font-weight: 600;">Hello, {user.first_name or user.username}!</h2>
                            <p style="margin: 0 0 25px 0; color: #666; font-size: 15px; line-height: 1.6;">We received a request to reset your password. Please use the following OTP to proceed:</p>

                            <!-- OTP Box -->
                            <div style="background: linear-gradient(135deg, #eb3349 0%, #f45c43 100%); border-radius: 12px; padding: 25px; text-align: center; margin: 25px 0;">
                                <p style="margin: 0 0 8px 0; color: rgba(255,255,255,0.8); font-size: 12px; text-transform: uppercase; letter-spacing: 2px;">Your Reset Code</p>
                                <p style="margin: 0; color: white; font-size: 36px; font-weight: 700; letter-spacing: 10px;">{otp_code}</p>
                            </div>

                            <!-- Warning Box -->
                            <div style="background: #fce4ec; border-left: 4px solid #e91e63; border-radius: 0 8px 8px 0; padding: 15px 20px; margin: 25px 0;">
                                <p style="margin: 0 0 8px 0; color: #c2185b; font-weight: 600; font-size: 14px;">🚨 Security Alert</p>
                                <ul style="margin: 0; padding-left: 20px; color: #c2185b; font-size: 13px; line-height: 1.8;">
                                    <li>This OTP is valid for <strong>10 minutes</strong> only</li>
                                    <li>If you did not request this, your account may be at risk</li>
                                    <li>Never share this code with anyone</li>
                                </ul>
                            </div>

                            <p style="margin: 25px 0 0 0; color: #999; font-size: 13px; line-height: 1.6;">If you did not request a password reset, please ignore this email or contact our support team immediately.</p>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background: #f8f9fa; padding: 25px 30px; text-align: center; border-top: 1px solid #eee;">
                            <p style="margin: 0 0 8px 0; color: #999; font-size: 12px;">This is an automated email from NexPro. Please do not reply.</p>
                            <p style="margin: 0; color: #bbb; font-size: 11px;">&copy; 2024 NexPro. All rights reserved.</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
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
            frontend_url = OTPService.get_frontend_url()
            login_url = f"{frontend_url}/login"

            subject = f'🎉 Welcome to NexPro - {organization.name}'
            message = f"""
Dear {admin_user.first_name or admin_user.username},

Welcome to NexPro - Professional Practice Management System!

Your organization "{organization.name}" has been successfully registered.

Account Details:
- Organization: {organization.name}
- Admin Email: {admin_user.email}
- Mobile: {organization.phone or 'Not provided'}
- Plan: {organization.get_plan_display()}
- Trial Period: 30 days

Login URL: {login_url}

Getting Started:
1. Configure your organization settings
2. Add task categories (GST, TDS, etc.)
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
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to NexPro</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f8;">
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 40px rgba(102, 126, 234, 0.15);">
                    <!-- Header with Animation Feel -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 50px 30px; text-align: center;">
                            <div style="width: 80px; height: 80px; background: rgba(255,255,255,0.2); border-radius: 50%; margin: 0 auto 20px; line-height: 80px;">
                                <span style="font-size: 40px;">🎉</span>
                            </div>
                            <h1 style="margin: 0; color: white; font-size: 32px; font-weight: 700;">Welcome to NexPro!</h1>
                            <p style="margin: 12px 0 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">Your Practice Management Journey Begins</p>
                        </td>
                    </tr>

                    <!-- Welcome Message -->
                    <tr>
                        <td style="padding: 40px 30px 20px 30px;">
                            <h2 style="margin: 0 0 15px 0; color: #333; font-size: 22px; font-weight: 600;">Hello, {admin_user.first_name or admin_user.username}! 👋</h2>
                            <p style="margin: 0; color: #666; font-size: 15px; line-height: 1.7;">Congratulations! Your organization <strong style="color: #667eea;">"{organization.name}"</strong> has been successfully registered with NexPro. We're thrilled to have you on board!</p>
                        </td>
                    </tr>

                    <!-- Account Details Card -->
                    <tr>
                        <td style="padding: 0 30px;">
                            <div style="background: linear-gradient(135deg, #f5f7ff 0%, #f0f4ff 100%); border-radius: 12px; padding: 25px; margin: 20px 0; border: 1px solid #e0e7ff;">
                                <h3 style="margin: 0 0 20px 0; color: #667eea; font-size: 16px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">📋 Your Account Details</h3>
                                <table style="width: 100%; border-collapse: collapse;">
                                    <tr>
                                        <td style="padding: 10px 0; color: #888; font-size: 14px; width: 40%;">Organization</td>
                                        <td style="padding: 10px 0; color: #333; font-size: 14px; font-weight: 600;">{organization.name}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 10px 0; color: #888; font-size: 14px; border-top: 1px solid #e0e7ff;">Admin Email</td>
                                        <td style="padding: 10px 0; color: #333; font-size: 14px; font-weight: 600; border-top: 1px solid #e0e7ff;">{admin_user.email}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 10px 0; color: #888; font-size: 14px; border-top: 1px solid #e0e7ff;">Mobile</td>
                                        <td style="padding: 10px 0; color: #333; font-size: 14px; font-weight: 600; border-top: 1px solid #e0e7ff;">{organization.phone or 'Not provided'}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 10px 0; color: #888; font-size: 14px; border-top: 1px solid #e0e7ff;">Plan</td>
                                        <td style="padding: 10px 0; border-top: 1px solid #e0e7ff;">
                                            <span style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;">{organization.get_plan_display()}</span>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 10px 0; color: #888; font-size: 14px; border-top: 1px solid #e0e7ff;">Trial Period</td>
                                        <td style="padding: 10px 0; color: #4caf50; font-size: 14px; font-weight: 600; border-top: 1px solid #e0e7ff;">30 Days Free</td>
                                    </tr>
                                </table>
                            </div>
                        </td>
                    </tr>

                    <!-- Login Button -->
                    <tr>
                        <td style="padding: 10px 30px 30px 30px; text-align: center;">
                            <a href="{login_url}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 16px 50px; border-radius: 50px; font-size: 16px; font-weight: 600; box-shadow: 0 8px 25px rgba(102, 126, 234, 0.35);">
                                🚀 Login to Your Account
                            </a>
                            <p style="margin: 15px 0 0 0; color: #999; font-size: 12px;">
                                Or copy this link: <a href="{login_url}" style="color: #667eea;">{login_url}</a>
                            </p>
                        </td>
                    </tr>

                    <!-- Getting Started Steps -->
                    <tr>
                        <td style="padding: 0 30px 30px 30px;">
                            <div style="background: #e8f5e9; border-radius: 12px; padding: 25px;">
                                <h3 style="margin: 0 0 20px 0; color: #2e7d32; font-size: 16px; font-weight: 600;">🚀 Getting Started</h3>
                                <table style="width: 100%; border-collapse: collapse;">
                                    <tr>
                                        <td style="padding: 12px 0; vertical-align: top;">
                                            <div style="background: #4caf50; color: white; width: 28px; height: 28px; border-radius: 50%; text-align: center; line-height: 28px; font-weight: 600; display: inline-block; margin-right: 12px;">1</div>
                                            <span style="color: #333; font-size: 14px;">Configure your organization settings</span>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 12px 0; vertical-align: top;">
                                            <div style="background: #4caf50; color: white; width: 28px; height: 28px; border-radius: 50%; text-align: center; line-height: 28px; font-weight: 600; display: inline-block; margin-right: 12px;">2</div>
                                            <span style="color: #333; font-size: 14px;">Add task categories (GST, TDS, Audit, etc.)</span>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 12px 0; vertical-align: top;">
                                            <div style="background: #4caf50; color: white; width: 28px; height: 28px; border-radius: 50%; text-align: center; line-height: 28px; font-weight: 600; display: inline-block; margin-right: 12px;">3</div>
                                            <span style="color: #333; font-size: 14px;">Add your team members</span>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 12px 0; vertical-align: top;">
                                            <div style="background: #4caf50; color: white; width: 28px; height: 28px; border-radius: 50%; text-align: center; line-height: 28px; font-weight: 600; display: inline-block; margin-right: 12px;">4</div>
                                            <span style="color: #333; font-size: 14px;">Start adding clients and managing tasks</span>
                                        </td>
                                    </tr>
                                </table>
                            </div>
                        </td>
                    </tr>

                    <!-- Help Section -->
                    <tr>
                        <td style="padding: 0 30px 30px 30px;">
                            <div style="background: #fff3e0; border-radius: 12px; padding: 20px; text-align: center;">
                                <p style="margin: 0 0 10px 0; color: #e65100; font-size: 14px; font-weight: 600;">💡 Need Help Getting Started?</p>
                                <p style="margin: 0; color: #bf360c; font-size: 13px;">Check out our Help & Guide section in the app or contact us at <a href="mailto:support@nexpro.com" style="color: #e65100;">support@nexpro.com</a></p>
                            </div>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 30px; text-align: center;">
                            <p style="margin: 0 0 10px 0; color: rgba(255,255,255,0.7); font-size: 13px;">Thank you for choosing NexPro!</p>
                            <p style="margin: 0; color: rgba(255,255,255,0.5); font-size: 11px;">&copy; 2024 NexPro. All rights reserved.</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
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
            frontend_url = OTPService.get_frontend_url()
            admin_panel_url = f"{frontend_url}/super-admin/organizations"

            # Find all platform admins
            platform_admins = User.objects.filter(is_platform_admin=True, is_active=True)

            if not platform_admins.exists():
                return True, "No platform admins to notify."

            admin_emails = list(platform_admins.values_list('email', flat=True))

            subject = f'🆕 New Tenant Registration - {organization.name}'
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

View in Admin Panel: {admin_panel_url}

---
NexPro Platform Notification
"""

            html_message = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Tenant Registration - NexPro</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f8;">
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 40px rgba(26, 26, 46, 0.15);">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 40px 30px; text-align: center;">
                            <div style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 8px 20px; border-radius: 20px; font-size: 12px; font-weight: 600; margin-bottom: 15px;">
                                🆕 NEW REGISTRATION
                            </div>
                            <h1 style="margin: 0; color: white; font-size: 26px; font-weight: 700;">New Tenant Alert</h1>
                            <p style="margin: 10px 0 0 0; color: rgba(255,255,255,0.7); font-size: 14px;">Platform Admin Notification</p>
                        </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                        <td style="padding: 35px 30px;">
                            <p style="margin: 0 0 25px 0; color: #666; font-size: 15px; line-height: 1.6;">A new organization has registered on NexPro. Here are the details:</p>

                            <!-- Organization Details Card -->
                            <div style="background: #f8f9fa; border-radius: 12px; padding: 25px; margin-bottom: 20px; border-left: 4px solid #667eea;">
                                <h3 style="margin: 0 0 18px 0; color: #667eea; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">🏢 Organization Details</h3>
                                <table style="width: 100%; border-collapse: collapse;">
                                    <tr>
                                        <td style="padding: 8px 0; color: #888; font-size: 13px; width: 35%;">Name</td>
                                        <td style="padding: 8px 0; color: #333; font-size: 13px; font-weight: 600;">{organization.name}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #888; font-size: 13px;">Email</td>
                                        <td style="padding: 8px 0; color: #333; font-size: 13px;">{organization.email}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #888; font-size: 13px;">Phone</td>
                                        <td style="padding: 8px 0; color: #333; font-size: 13px;">{organization.phone or 'Not provided'}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #888; font-size: 13px;">Slug</td>
                                        <td style="padding: 8px 0; color: #667eea; font-size: 13px; font-weight: 600;">{organization.slug}</td>
                                    </tr>
                                </table>
                            </div>

                            <!-- Admin User Details Card -->
                            <div style="background: #f8f9fa; border-radius: 12px; padding: 25px; margin-bottom: 20px; border-left: 4px solid #4caf50;">
                                <h3 style="margin: 0 0 18px 0; color: #4caf50; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">👤 Admin User Details</h3>
                                <table style="width: 100%; border-collapse: collapse;">
                                    <tr>
                                        <td style="padding: 8px 0; color: #888; font-size: 13px; width: 35%;">Name</td>
                                        <td style="padding: 8px 0; color: #333; font-size: 13px; font-weight: 600;">{admin_user.first_name} {admin_user.last_name}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #888; font-size: 13px;">Email</td>
                                        <td style="padding: 8px 0; color: #333; font-size: 13px;">{admin_user.email}</td>
                                    </tr>
                                </table>
                            </div>

                            <!-- Subscription Details Card -->
                            <div style="background: #f8f9fa; border-radius: 12px; padding: 25px; margin-bottom: 25px; border-left: 4px solid #ff9800;">
                                <h3 style="margin: 0 0 18px 0; color: #ff9800; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">💳 Subscription Details</h3>
                                <table style="width: 100%; border-collapse: collapse;">
                                    <tr>
                                        <td style="padding: 8px 0; color: #888; font-size: 13px; width: 35%;">Plan</td>
                                        <td style="padding: 8px 0;">
                                            <span style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 600;">{organization.get_plan_display()}</span>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #888; font-size: 13px;">Status</td>
                                        <td style="padding: 8px 0;">
                                            <span style="background: #e8f5e9; color: #2e7d32; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 600;">{organization.get_status_display()}</span>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #888; font-size: 13px;">Trial Ends</td>
                                        <td style="padding: 8px 0; color: #333; font-size: 13px;">{organization.trial_ends_at.strftime('%d %B %Y') if organization.trial_ends_at else 'N/A'}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #888; font-size: 13px;">Registered</td>
                                        <td style="padding: 8px 0; color: #333; font-size: 13px;">{organization.created_at.strftime('%d %B %Y at %H:%M')}</td>
                                    </tr>
                                </table>
                            </div>

                            <!-- Action Button -->
                            <div style="text-align: center;">
                                <a href="{admin_panel_url}" style="display: inline-block; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); color: white; text-decoration: none; padding: 14px 40px; border-radius: 50px; font-size: 14px; font-weight: 600; box-shadow: 0 8px 25px rgba(26, 26, 46, 0.25);">
                                    📊 View in Admin Panel
                                </a>
                                <p style="margin: 15px 0 0 0; color: #999; font-size: 11px;">
                                    <a href="{admin_panel_url}" style="color: #667eea;">{admin_panel_url}</a>
                                </p>
                            </div>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background: #f8f9fa; padding: 25px 30px; text-align: center; border-top: 1px solid #eee;">
                            <p style="margin: 0 0 8px 0; color: #999; font-size: 12px;">NexPro Platform Admin Notification</p>
                            <p style="margin: 0; color: #bbb; font-size: 11px;">&copy; 2024 NexPro. All rights reserved.</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
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

    @staticmethod
    def send_new_user_notification(user, organization, created_by=None):
        """
        Send notification to tenant admin when a new user is added to their organization.
        Also sends welcome email to the new user.
        """
        try:
            frontend_url = OTPService.get_frontend_url()
            login_url = f"{frontend_url}/login"

            # Send welcome email to new user
            user_subject = f'🎉 Welcome to NexPro - {organization.name}'
            user_message = f"""
Dear {user.first_name or user.username},

Welcome to NexPro!

You have been added as a team member to "{organization.name}".

Account Details:
- Email: {user.email}
- Role: {user.get_role_display()}
- Organization: {organization.name}

Login URL: {login_url}

Please use the login link above to access your account. If you haven't received your password, please contact your administrator or use the "Forgot Password" option.

Best Regards,
{organization.name} Team
via NexPro
"""

            user_html_message = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to NexPro</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f8;">
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 40px rgba(102, 126, 234, 0.15);">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 50px 30px; text-align: center;">
                            <div style="width: 80px; height: 80px; background: rgba(255,255,255,0.2); border-radius: 50%; margin: 0 auto 20px; line-height: 80px;">
                                <span style="font-size: 40px;">👋</span>
                            </div>
                            <h1 style="margin: 0; color: white; font-size: 28px; font-weight: 700;">Welcome to the Team!</h1>
                            <p style="margin: 12px 0 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">{organization.name}</p>
                        </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <h2 style="margin: 0 0 15px 0; color: #333; font-size: 22px; font-weight: 600;">Hello, {user.first_name or user.username}! 🎉</h2>
                            <p style="margin: 0 0 25px 0; color: #666; font-size: 15px; line-height: 1.7;">You have been added as a team member to <strong style="color: #667eea;">{organization.name}</strong>. We're excited to have you on board!</p>

                            <!-- Account Details Card -->
                            <div style="background: linear-gradient(135deg, #f5f7ff 0%, #f0f4ff 100%); border-radius: 12px; padding: 25px; margin: 25px 0; border: 1px solid #e0e7ff;">
                                <h3 style="margin: 0 0 20px 0; color: #667eea; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">📋 Your Account Details</h3>
                                <table style="width: 100%; border-collapse: collapse;">
                                    <tr>
                                        <td style="padding: 10px 0; color: #888; font-size: 14px; width: 40%;">Email</td>
                                        <td style="padding: 10px 0; color: #333; font-size: 14px; font-weight: 600;">{user.email}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 10px 0; color: #888; font-size: 14px; border-top: 1px solid #e0e7ff;">Role</td>
                                        <td style="padding: 10px 0; border-top: 1px solid #e0e7ff;">
                                            <span style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;">{user.get_role_display()}</span>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 10px 0; color: #888; font-size: 14px; border-top: 1px solid #e0e7ff;">Organization</td>
                                        <td style="padding: 10px 0; color: #333; font-size: 14px; font-weight: 600; border-top: 1px solid #e0e7ff;">{organization.name}</td>
                                    </tr>
                                </table>
                            </div>

                            <!-- Login Button -->
                            <div style="text-align: center; margin: 30px 0;">
                                <a href="{login_url}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 16px 50px; border-radius: 50px; font-size: 16px; font-weight: 600; box-shadow: 0 8px 25px rgba(102, 126, 234, 0.35);">
                                    🚀 Login to Your Account
                                </a>
                                <p style="margin: 15px 0 0 0; color: #999; font-size: 12px;">
                                    Or copy this link: <a href="{login_url}" style="color: #667eea;">{login_url}</a>
                                </p>
                            </div>

                            <!-- Note -->
                            <div style="background: #fff3e0; border-radius: 12px; padding: 20px; text-align: center;">
                                <p style="margin: 0; color: #e65100; font-size: 13px;">💡 If you haven't received your password, please contact your administrator or use the "Forgot Password" option on the login page.</p>
                            </div>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 30px; text-align: center;">
                            <p style="margin: 0 0 10px 0; color: rgba(255,255,255,0.7); font-size: 13px;">Powered by NexPro</p>
                            <p style="margin: 0; color: rgba(255,255,255,0.5); font-size: 11px;">&copy; 2024 NexPro. All rights reserved.</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
"""

            # Send welcome email to new user
            send_mail(
                subject=user_subject,
                message=user_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                html_message=user_html_message,
                fail_silently=False,
            )

            # Send notification to organization admins
            org_admins = User.objects.filter(
                organization=organization,
                role='ADMIN',
                is_active=True
            ).exclude(id=user.id)

            if org_admins.exists():
                admin_emails = list(org_admins.values_list('email', flat=True))

                admin_subject = f'👤 New Team Member Added - {user.first_name} {user.last_name}'
                admin_message = f"""
New Team Member Added to {organization.name}

User Details:
- Name: {user.first_name} {user.last_name}
- Email: {user.email}
- Role: {user.get_role_display()}
- Added by: {created_by.first_name if created_by else 'System'} {created_by.last_name if created_by else ''}

Login to your account to view and manage team members.

---
NexPro Notification
"""

                admin_html_message = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Team Member - NexPro</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f8;">
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 40px rgba(102, 126, 234, 0.15);">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 35px 30px; text-align: center;">
                            <div style="display: inline-block; background: rgba(255,255,255,0.2); color: white; padding: 6px 16px; border-radius: 20px; font-size: 11px; font-weight: 600; margin-bottom: 12px;">
                                👤 NEW TEAM MEMBER
                            </div>
                            <h1 style="margin: 0; color: white; font-size: 24px; font-weight: 700;">{user.first_name} {user.last_name}</h1>
                            <p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">has joined {organization.name}</p>
                        </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                        <td style="padding: 35px 30px;">
                            <div style="background: #f8f9fa; border-radius: 12px; padding: 25px; border-left: 4px solid #667eea;">
                                <h3 style="margin: 0 0 18px 0; color: #667eea; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">User Details</h3>
                                <table style="width: 100%; border-collapse: collapse;">
                                    <tr>
                                        <td style="padding: 10px 0; color: #888; font-size: 14px; width: 35%;">Name</td>
                                        <td style="padding: 10px 0; color: #333; font-size: 14px; font-weight: 600;">{user.first_name} {user.last_name}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 10px 0; color: #888; font-size: 14px; border-top: 1px solid #eee;">Email</td>
                                        <td style="padding: 10px 0; color: #333; font-size: 14px; border-top: 1px solid #eee;">{user.email}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 10px 0; color: #888; font-size: 14px; border-top: 1px solid #eee;">Role</td>
                                        <td style="padding: 10px 0; border-top: 1px solid #eee;">
                                            <span style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 600;">{user.get_role_display()}</span>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 10px 0; color: #888; font-size: 14px; border-top: 1px solid #eee;">Added by</td>
                                        <td style="padding: 10px 0; color: #333; font-size: 14px; border-top: 1px solid #eee;">{created_by.first_name if created_by else 'System'} {created_by.last_name if created_by else ''}</td>
                                    </tr>
                                </table>
                            </div>

                            <!-- Action Button -->
                            <div style="text-align: center; margin-top: 25px;">
                                <a href="{login_url}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 14px 40px; border-radius: 50px; font-size: 14px; font-weight: 600; box-shadow: 0 8px 25px rgba(102, 126, 234, 0.35);">
                                    👥 Manage Team Members
                                </a>
                            </div>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background: #f8f9fa; padding: 25px 30px; text-align: center; border-top: 1px solid #eee;">
                            <p style="margin: 0 0 8px 0; color: #999; font-size: 12px;">NexPro Team Notification</p>
                            <p style="margin: 0; color: #bbb; font-size: 11px;">&copy; 2024 NexPro. All rights reserved.</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
"""

                send_mail(
                    subject=admin_subject,
                    message=admin_message,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=admin_emails,
                    html_message=admin_html_message,
                    fail_silently=False,
                )

            return True, "New user notification emails sent successfully."

        except Exception as e:
            return False, f"Failed to send new user notification: {str(e)}"
