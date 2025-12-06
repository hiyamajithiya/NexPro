"""
Audit logging utilities for NexPro
Provides centralized audit logging for sensitive operations.
"""

import logging
import json
from datetime import datetime
from django.utils import timezone
from functools import wraps

# Create dedicated audit logger
audit_logger = logging.getLogger('nexpro.audit')


class AuditAction:
    """Constants for audit action types"""
    # Authentication
    LOGIN_SUCCESS = 'LOGIN_SUCCESS'
    LOGIN_FAILED = 'LOGIN_FAILED'
    LOGOUT = 'LOGOUT'
    PASSWORD_CHANGE = 'PASSWORD_CHANGE'
    PASSWORD_RESET_REQUEST = 'PASSWORD_RESET_REQUEST'
    PASSWORD_RESET_COMPLETE = 'PASSWORD_RESET_COMPLETE'

    # Platform Settings
    PLATFORM_SETTINGS_VIEW = 'PLATFORM_SETTINGS_VIEW'
    PLATFORM_SETTINGS_UPDATE = 'PLATFORM_SETTINGS_UPDATE'
    SMTP_CONFIG_UPDATE = 'SMTP_CONFIG_UPDATE'
    GOOGLE_OAUTH_CONFIG_UPDATE = 'GOOGLE_OAUTH_CONFIG_UPDATE'
    SMTP_TEST_EMAIL = 'SMTP_TEST_EMAIL'

    # Google OAuth
    GOOGLE_CONNECT = 'GOOGLE_CONNECT'
    GOOGLE_DISCONNECT = 'GOOGLE_DISCONNECT'
    GOOGLE_TOKEN_REFRESH = 'GOOGLE_TOKEN_REFRESH'
    GOOGLE_SYNC = 'GOOGLE_SYNC'

    # Credential Vault
    CREDENTIAL_CREATE = 'CREDENTIAL_CREATE'
    CREDENTIAL_VIEW = 'CREDENTIAL_VIEW'
    CREDENTIAL_UPDATE = 'CREDENTIAL_UPDATE'
    CREDENTIAL_DELETE = 'CREDENTIAL_DELETE'
    CREDENTIAL_PASSWORD_VIEW = 'CREDENTIAL_PASSWORD_VIEW'

    # User Management
    USER_CREATE = 'USER_CREATE'
    USER_UPDATE = 'USER_UPDATE'
    USER_DELETE = 'USER_DELETE'
    USER_ROLE_CHANGE = 'USER_ROLE_CHANGE'

    # Organization Management
    ORG_CREATE = 'ORG_CREATE'
    ORG_UPDATE = 'ORG_UPDATE'
    ORG_DELETE = 'ORG_DELETE'
    ORG_SUBSCRIPTION_CHANGE = 'ORG_SUBSCRIPTION_CHANGE'

    # Data Export
    DATA_EXPORT = 'DATA_EXPORT'
    REPORT_GENERATE = 'REPORT_GENERATE'


class AuditLogger:
    """
    Centralized audit logger for security-sensitive operations.
    """

    @staticmethod
    def log(action, user=None, organization=None, ip_address=None,
            details=None, success=True, resource_type=None, resource_id=None):
        """
        Log an audit event.

        Args:
            action: AuditAction constant
            user: User performing the action (optional)
            organization: Organization context (optional)
            ip_address: Client IP address (optional)
            details: Dict of additional details (sensitive data will be masked)
            success: Whether the action succeeded
            resource_type: Type of resource affected (e.g., 'User', 'Credential')
            resource_id: ID of the resource affected
        """
        timestamp = timezone.now().isoformat()

        log_entry = {
            'timestamp': timestamp,
            'action': action,
            'success': success,
            'user_id': user.id if user else None,
            'user_email': user.email if user else None,
            'organization_id': organization.id if organization else None,
            'organization_name': organization.name if organization else None,
            'ip_address': ip_address,
            'resource_type': resource_type,
            'resource_id': str(resource_id) if resource_id else None,
        }

        # Mask sensitive data in details
        if details:
            masked_details = AuditLogger._mask_sensitive_details(details)
            log_entry['details'] = masked_details

        # Log as JSON for easy parsing
        log_message = json.dumps(log_entry, default=str)

        if success:
            audit_logger.info(log_message)
        else:
            audit_logger.warning(log_message)

        return log_entry

    @staticmethod
    def _mask_sensitive_details(details):
        """Mask sensitive fields in details dict"""
        sensitive_fields = {
            'password', 'secret', 'token', 'key', 'api_key',
            'client_secret', 'smtp_password', 'access_token',
            'refresh_token', 'google_client_secret'
        }

        masked = {}
        for key, value in details.items():
            key_lower = key.lower()
            if any(sensitive in key_lower for sensitive in sensitive_fields):
                if value:
                    masked[key] = '***REDACTED***'
                else:
                    masked[key] = '[not set]'
            else:
                masked[key] = value

        return masked

    @staticmethod
    def get_client_ip(request):
        """Extract client IP from request"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0].strip()
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip

    @staticmethod
    def log_from_request(action, request, **kwargs):
        """
        Convenience method to log from a DRF request.
        Automatically extracts user, organization, and IP.
        """
        user = request.user if request.user.is_authenticated else None
        organization = getattr(request, 'organization', None)
        ip_address = AuditLogger.get_client_ip(request)

        return AuditLogger.log(
            action=action,
            user=user,
            organization=organization,
            ip_address=ip_address,
            **kwargs
        )


def audit_log(action, resource_type=None):
    """
    Decorator to automatically audit view/viewset methods.

    Usage:
        @audit_log(AuditAction.CREDENTIAL_VIEW, resource_type='Credential')
        def retrieve(self, request, *args, **kwargs):
            ...
    """
    def decorator(func):
        @wraps(func)
        def wrapper(self, request, *args, **kwargs):
            # Get resource ID if available
            resource_id = kwargs.get('pk') or kwargs.get('id')

            try:
                result = func(self, request, *args, **kwargs)
                success = 200 <= result.status_code < 400

                AuditLogger.log_from_request(
                    action=action,
                    request=request,
                    success=success,
                    resource_type=resource_type,
                    resource_id=resource_id,
                    details={'status_code': result.status_code}
                )

                return result
            except Exception as e:
                AuditLogger.log_from_request(
                    action=action,
                    request=request,
                    success=False,
                    resource_type=resource_type,
                    resource_id=resource_id,
                    details={'error': str(e)}
                )
                raise

        return wrapper
    return decorator
