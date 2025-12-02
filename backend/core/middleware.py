"""
Multi-Tenant Middleware for NexPro

This middleware extracts the current organization from the authenticated user
and makes it available throughout the request lifecycle.
"""

from threading import local

# Thread-local storage for current organization
_thread_locals = local()


def get_current_organization():
    """
    Get the current organization from thread-local storage.
    Returns None if no organization is set.
    """
    return getattr(_thread_locals, 'organization', None)


def set_current_organization(organization):
    """
    Set the current organization in thread-local storage.
    """
    _thread_locals.organization = organization


def get_current_user():
    """
    Get the current user from thread-local storage.
    Returns None if no user is set.
    """
    return getattr(_thread_locals, 'user', None)


def set_current_user(user):
    """
    Set the current user in thread-local storage.
    """
    _thread_locals.user = user


class TenantMiddleware:
    """
    Middleware to extract and set the current organization for each request.

    This middleware:
    1. Extracts the organization from the authenticated user
    2. Sets it in thread-local storage for access throughout the request
    3. Attaches it to the request object for easy access in views

    Usage:
        - Add to MIDDLEWARE in settings.py after AuthenticationMiddleware
        - Access organization via request.organization in views
        - Access organization via get_current_organization() in models/managers
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Clear previous request's context
        set_current_organization(None)
        set_current_user(None)

        # Set organization from authenticated user
        if hasattr(request, 'user') and request.user.is_authenticated:
            user = request.user
            organization = getattr(user, 'organization', None)

            set_current_user(user)
            set_current_organization(organization)

            # Attach to request for easy access
            request.organization = organization
            request.is_platform_admin = getattr(user, 'is_platform_admin', False)
        else:
            request.organization = None
            request.is_platform_admin = False

        response = self.get_response(request)

        # Clean up thread-local storage after request
        set_current_organization(None)
        set_current_user(None)

        return response


class OrganizationHeaderMiddleware:
    """
    Optional middleware to extract organization from X-Organization-ID header.

    This is useful for:
    - Platform admins who need to switch between organizations
    - API clients that need to specify the organization explicitly

    Note: Only platform admins can use this header to access other organizations.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        from .models import Organization

        # Check for X-Organization-ID header
        org_id = request.headers.get('X-Organization-ID')

        if org_id and hasattr(request, 'user') and request.user.is_authenticated:
            user = request.user

            # Only platform admins can switch organizations via header
            if getattr(user, 'is_platform_admin', False):
                try:
                    organization = Organization.objects.get(id=org_id)
                    set_current_organization(organization)
                    request.organization = organization
                except Organization.DoesNotExist:
                    pass  # Keep the user's default organization

        response = self.get_response(request)
        return response
