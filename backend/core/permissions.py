"""
Custom Permissions for NexPro Multi-Tenant SaaS

These permissions handle both role-based access control within an organization
and platform-level access control.
"""

from rest_framework import permissions


class IsPlatformAdmin(permissions.BasePermission):
    """
    Permission check for platform administrators.
    Platform admins can manage all organizations.
    """

    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            getattr(request.user, 'is_platform_admin', False)
        )


class IsOrganizationAdmin(permissions.BasePermission):
    """
    Permission check for organization administrators.
    Organization admins can manage their own organization.
    """

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        # Platform admins have full access
        if getattr(request.user, 'is_platform_admin', False):
            return True

        # Check if user is ADMIN role within their organization
        return request.user.role == 'ADMIN'


class IsAdminOrPartner(permissions.BasePermission):
    """
    Permission for Admin or Partner level access.
    These users can manage most resources within their organization.
    """

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        # Platform admins have full access
        if getattr(request.user, 'is_platform_admin', False):
            return True

        return request.user.role in ['ADMIN', 'PARTNER']


class IsManagerOrAbove(permissions.BasePermission):
    """
    Permission for Manager level and above.
    Managers can view and manage team resources.
    """

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        # Platform admins have full access
        if getattr(request.user, 'is_platform_admin', False):
            return True

        return request.user.role in ['ADMIN', 'PARTNER', 'MANAGER']


class IsStaffOrAbove(permissions.BasePermission):
    """
    Permission for all authenticated organization users.
    All staff members have at least read access to their assigned resources.
    """

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        # Platform admins have full access
        if getattr(request.user, 'is_platform_admin', False):
            return True

        return request.user.role in ['ADMIN', 'PARTNER', 'MANAGER', 'STAFF']


class IsAdminOrReadOnly(permissions.BasePermission):
    """
    Custom permission: Admin/Partner can edit, others can read.
    Used for resources that should be viewable by all but editable by admins.
    """

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        # Platform admins have full access
        if getattr(request.user, 'is_platform_admin', False):
            return True

        # Safe methods (GET, HEAD, OPTIONS) allowed for all authenticated
        if request.method in permissions.SAFE_METHODS:
            return True

        # Write methods only for ADMIN or PARTNER
        return request.user.role in ['ADMIN', 'PARTNER']


class IsSameOrganization(permissions.BasePermission):
    """
    Object-level permission to ensure users can only access
    objects within their own organization.
    """

    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False

        # Platform admins can access all organizations
        if getattr(request.user, 'is_platform_admin', False):
            return True

        # Check if object belongs to user's organization
        user_org = getattr(request.user, 'organization', None)
        obj_org = getattr(obj, 'organization', None)

        if user_org is None or obj_org is None:
            return False

        return user_org.id == obj_org.id


class CanManageUsers(permissions.BasePermission):
    """
    Permission for managing users within an organization.
    Only ADMIN and PARTNER can create/edit users.
    """

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        # Platform admins have full access
        if getattr(request.user, 'is_platform_admin', False):
            return True

        # Safe methods allowed for managers and above
        if request.method in permissions.SAFE_METHODS:
            return request.user.role in ['ADMIN', 'PARTNER', 'MANAGER']

        # Write methods only for ADMIN or PARTNER
        return request.user.role in ['ADMIN', 'PARTNER']

    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False

        # Platform admins can manage all users
        if getattr(request.user, 'is_platform_admin', False):
            return True

        # Users can view/edit their own profile
        if obj.id == request.user.id:
            return True

        # Same organization check
        user_org = getattr(request.user, 'organization', None)
        obj_org = getattr(obj, 'organization', None)

        if user_org is None or obj_org is None:
            return False

        if user_org.id != obj_org.id:
            return False

        # ADMIN/PARTNER can manage users in their organization
        return request.user.role in ['ADMIN', 'PARTNER']


class IsOrganizationActive(permissions.BasePermission):
    """
    Ensure the user's organization is active (not suspended/cancelled).
    """

    message = "Your organization's subscription is not active."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        # Platform admins always have access
        if getattr(request.user, 'is_platform_admin', False):
            return True

        organization = getattr(request.user, 'organization', None)
        if organization is None:
            return False

        return organization.is_active
