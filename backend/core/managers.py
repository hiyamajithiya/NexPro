"""
Multi-Tenant Query Managers for NexPro

These managers automatically filter querysets by organization,
ensuring data isolation between tenants.
"""

from django.db import models
from .middleware import get_current_organization


class TenantManager(models.Manager):
    """
    A manager that automatically filters querysets by the current organization.

    Usage:
        class MyModel(TenantModel):
            objects = TenantManager()
            all_objects = models.Manager()  # For admin/platform access

    This manager:
    1. Automatically filters all queries by the current organization
    2. Returns empty queryset if no organization is set (security)
    3. Provides all_objects for bypassing tenant filtering when needed
    """

    def get_queryset(self):
        """
        Returns a queryset filtered by the current organization.
        Returns empty queryset if no organization is in context.
        """
        queryset = super().get_queryset()
        organization = get_current_organization()

        if organization:
            return queryset.filter(organization=organization)

        # If no organization in context, return empty queryset for safety
        # This prevents accidental data leaks
        return queryset.none()

    def all_tenants(self):
        """
        Returns all objects across all tenants.
        Use with caution - only for platform admin operations.
        """
        return super().get_queryset()


class TenantAwareManager(models.Manager):
    """
    A more flexible manager that filters by organization but allows
    explicit filtering override.

    This is useful for models where you sometimes need cross-tenant queries
    (e.g., analytics, reports, platform admin).
    """

    def get_queryset(self):
        """Returns base queryset without automatic filtering."""
        return super().get_queryset()

    def for_organization(self, organization):
        """
        Filter queryset for a specific organization.
        """
        return self.get_queryset().filter(organization=organization)

    def for_current_organization(self):
        """
        Filter queryset for the current organization from context.
        """
        organization = get_current_organization()
        if organization:
            return self.for_organization(organization)
        return self.get_queryset().none()


class UserManager(models.Manager):
    """
    Custom manager for User model that handles tenant filtering.
    """

    def get_queryset(self):
        return super().get_queryset()

    def for_organization(self, organization):
        """Get users for a specific organization."""
        return self.get_queryset().filter(organization=organization)

    def for_current_organization(self):
        """Get users for the current organization from context."""
        organization = get_current_organization()
        if organization:
            return self.for_organization(organization)
        return self.get_queryset().none()

    def platform_admins(self):
        """Get all platform administrators."""
        return self.get_queryset().filter(is_platform_admin=True)
