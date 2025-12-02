# Multi-Tenant SaaS Conversion Plan for NexPro

## Overview

This plan outlines the conversion of NexPro from a single-tenant application to a multi-tenant SaaS product. The approach uses **Shared Database with Tenant ID** strategy, which is optimal for this application size and provides a good balance between data isolation and operational simplicity.

## Multi-Tenancy Approach: Shared Database with Tenant ID

### Why This Approach?
1. **Simplicity**: Single database, single application instance
2. **Cost-effective**: No need for separate databases per tenant
3. **Easy migrations**: Schema changes apply to all tenants at once
4. **Good for SMB SaaS**: Perfect for professional office management

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (React)                        │
│  - Tenant context from subdomain/login                       │
│  - Tenant-aware API calls                                    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Backend (Django REST)                      │
│  - TenantMiddleware: Extracts tenant from request            │
│  - Tenant-scoped querysets                                   │
│  - Permission checks include tenant verification             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Database (SQLite/PostgreSQL)               │
│  - All models have tenant_id foreign key                     │
│  - Indexes on tenant_id for performance                      │
│  - Row-level security (optional for PostgreSQL)              │
└─────────────────────────────────────────────────────────────┘
```

## Implementation Steps

### Phase 1: Backend - Core Multi-Tenant Infrastructure

#### 1.1 Create Organization/Tenant Model (NEW)

```python
# core/models.py - New models to add

class Organization(models.Model):
    """Tenant/Organization model - represents each firm using the platform"""
    PLAN_CHOICES = [
        ('FREE', 'Free Trial'),
        ('STARTER', 'Starter'),
        ('PROFESSIONAL', 'Professional'),
        ('ENTERPRISE', 'Enterprise'),
    ]

    STATUS_CHOICES = [
        ('ACTIVE', 'Active'),
        ('SUSPENDED', 'Suspended'),
        ('CANCELLED', 'Cancelled'),
    ]

    name = models.CharField(max_length=255)
    slug = models.SlugField(unique=True, help_text="URL-friendly identifier")
    subdomain = models.CharField(max_length=63, unique=True, null=True, blank=True)
    email = models.EmailField()
    phone = models.CharField(max_length=20, blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    logo = models.ImageField(upload_to='org_logos/', null=True, blank=True)

    # Subscription/Plan
    plan = models.CharField(max_length=20, choices=PLAN_CHOICES, default='FREE')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='ACTIVE')
    trial_ends_at = models.DateTimeField(null=True, blank=True)

    # Limits based on plan
    max_users = models.IntegerField(default=5)
    max_clients = models.IntegerField(default=50)

    # Settings
    firm_name = models.CharField(max_length=255, blank=True)
    default_from_email = models.EmailField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'organizations'
        ordering = ['name']

    def __str__(self):
        return self.name
```

#### 1.2 Modify User Model

Add organization FK to User model:

```python
class User(AbstractUser):
    # Existing fields...

    # NEW: Link user to organization
    organization = models.ForeignKey(
        'Organization',
        on_delete=models.CASCADE,
        related_name='users',
        null=True,  # Initially null for migration, then make required
        blank=True
    )

    # NEW: Super admin flag for platform admins
    is_platform_admin = models.BooleanField(
        default=False,
        help_text="Platform administrator - can manage all organizations"
    )
```

#### 1.3 Add Tenant FK to All Models

Add `organization` FK to:
- Client
- WorkType
- ClientWorkMapping
- WorkInstance
- CredentialVault
- EmailTemplate
- ReminderRule
- ReminderInstance

Example:
```python
class Client(models.Model):
    organization = models.ForeignKey(
        'Organization',
        on_delete=models.CASCADE,
        related_name='clients'
    )
    # ... existing fields
```

#### 1.4 Create Tenant Middleware

```python
# core/middleware.py

from threading import local

_thread_locals = local()

def get_current_organization():
    return getattr(_thread_locals, 'organization', None)

def set_current_organization(organization):
    _thread_locals.organization = organization

class TenantMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Get organization from authenticated user
        if hasattr(request, 'user') and request.user.is_authenticated:
            organization = getattr(request.user, 'organization', None)
            set_current_organization(organization)
            request.organization = organization
        else:
            set_current_organization(None)
            request.organization = None

        response = self.get_response(request)
        return response
```

#### 1.5 Create Tenant-Aware QuerySet Manager

```python
# core/managers.py

from django.db import models
from .middleware import get_current_organization

class TenantManager(models.Manager):
    def get_queryset(self):
        organization = get_current_organization()
        if organization:
            return super().get_queryset().filter(organization=organization)
        return super().get_queryset()

class TenantModel(models.Model):
    """Abstract base model for tenant-scoped models"""
    organization = models.ForeignKey(
        'Organization',
        on_delete=models.CASCADE,
        related_name='%(class)s_set'
    )

    objects = TenantManager()
    all_objects = models.Manager()  # Bypass tenant filtering

    class Meta:
        abstract = True

    def save(self, *args, **kwargs):
        if not self.organization_id:
            self.organization = get_current_organization()
        super().save(*args, **kwargs)
```

#### 1.6 Update Views with Tenant Filtering

Modify ViewSets to ensure tenant isolation:

```python
class TenantViewSetMixin:
    """Mixin to ensure tenant isolation in ViewSets"""

    def get_queryset(self):
        qs = super().get_queryset()
        if hasattr(self.request, 'organization') and self.request.organization:
            return qs.filter(organization=self.request.organization)
        return qs.none()

    def perform_create(self, serializer):
        serializer.save(organization=self.request.organization)
```

### Phase 2: Backend - Subscription & Plan Management

#### 2.1 Subscription Model

```python
class Subscription(models.Model):
    """Subscription management for organizations"""
    organization = models.OneToOneField(
        Organization,
        on_delete=models.CASCADE,
        related_name='subscription'
    )

    plan = models.CharField(max_length=20, choices=Organization.PLAN_CHOICES)
    status = models.CharField(max_length=20, default='active')

    # Billing
    billing_cycle = models.CharField(max_length=20, default='monthly')
    amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    currency = models.CharField(max_length=3, default='INR')

    # Dates
    current_period_start = models.DateTimeField()
    current_period_end = models.DateTimeField()
    cancelled_at = models.DateTimeField(null=True, blank=True)

    # Payment gateway
    stripe_subscription_id = models.CharField(max_length=255, blank=True, null=True)
    razorpay_subscription_id = models.CharField(max_length=255, blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
```

#### 2.2 Plan Limits Enforcement

```python
# core/services/plan_service.py

class PlanService:
    PLAN_LIMITS = {
        'FREE': {'max_users': 2, 'max_clients': 10, 'features': ['basic']},
        'STARTER': {'max_users': 5, 'max_clients': 50, 'features': ['basic', 'email']},
        'PROFESSIONAL': {'max_users': 15, 'max_clients': 200, 'features': ['basic', 'email', 'reports']},
        'ENTERPRISE': {'max_users': -1, 'max_clients': -1, 'features': ['all']},  # -1 = unlimited
    }

    @classmethod
    def can_add_user(cls, organization):
        limit = cls.PLAN_LIMITS[organization.plan]['max_users']
        if limit == -1:
            return True
        return organization.users.count() < limit

    @classmethod
    def can_add_client(cls, organization):
        limit = cls.PLAN_LIMITS[organization.plan]['max_clients']
        if limit == -1:
            return True
        return organization.clients.count() < limit
```

### Phase 3: Frontend - Multi-Tenant Support

#### 3.1 Update Auth Context

```javascript
// AuthContext.js - Add organization to context

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [organization, setOrganization] = useState(null);
  // ...

  const login = (userData, tokens) => {
    // Store organization data
    localStorage.setItem('organization', JSON.stringify(userData.organization));
    setOrganization(userData.organization);
    // ...
  };
};
```

#### 3.2 Update API Service

```javascript
// api.js - Organization-aware requests

// Add organization header to all requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    const org = JSON.parse(localStorage.getItem('organization') || '{}');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (org?.id) {
      config.headers['X-Organization-ID'] = org.id;
    }
    return config;
  },
  (error) => Promise.reject(error)
);
```

#### 3.3 New Pages for SaaS

1. **Landing Page** (`/`) - Public marketing page
2. **Signup Page** (`/signup`) - Organization registration
3. **Organization Settings** (`/settings/organization`) - Manage org settings
4. **Billing Page** (`/settings/billing`) - Subscription management
5. **Super Admin Dashboard** (`/admin`) - Platform admin panel

### Phase 4: Database Migration Strategy

#### 4.1 Migration Steps

1. Create Organization model
2. Create default organization for existing data
3. Add nullable `organization_id` to all models
4. Migrate existing data to default organization
5. Make `organization_id` non-nullable
6. Add indexes

```python
# Migration script example
def migrate_to_multi_tenant(apps, schema_editor):
    Organization = apps.get_model('core', 'Organization')
    Client = apps.get_model('core', 'Client')
    User = apps.get_model('core', 'User')

    # Create default organization
    default_org = Organization.objects.create(
        name='Default Organization',
        slug='default',
        email='admin@example.com',
        plan='PROFESSIONAL'
    )

    # Migrate all existing data
    Client.objects.filter(organization__isnull=True).update(organization=default_org)
    User.objects.filter(organization__isnull=True).update(organization=default_org)
    # ... repeat for other models
```

### Phase 5: Platform Admin Features

#### 5.1 Super Admin Dashboard
- View all organizations
- Manage subscriptions
- View platform analytics
- Handle support tickets

#### 5.2 Organization Management API
```python
class OrganizationViewSet(viewsets.ModelViewSet):
    """Platform admin: Manage organizations"""
    queryset = Organization.objects.all()
    serializer_class = OrganizationSerializer
    permission_classes = [IsPlatformAdmin]
```

## New API Endpoints

### Authentication
- `POST /api/auth/register/` - Register new organization + admin user
- `POST /api/auth/login/` - Login (returns org context)

### Organization Management
- `GET /api/organization/` - Get current organization
- `PUT /api/organization/` - Update organization settings
- `GET /api/organization/usage/` - Get usage stats vs limits

### Subscription
- `GET /api/subscription/` - Get subscription details
- `POST /api/subscription/upgrade/` - Upgrade plan
- `POST /api/subscription/cancel/` - Cancel subscription

### Platform Admin (Super Admin Only)
- `GET /api/admin/organizations/` - List all organizations
- `POST /api/admin/organizations/` - Create organization
- `GET /api/admin/analytics/` - Platform-wide analytics

## File Changes Summary

### Backend (Django)

| File | Change |
|------|--------|
| `core/models.py` | Add Organization, Subscription models; Add organization FK to all models |
| `core/middleware.py` | NEW - Tenant middleware |
| `core/managers.py` | NEW - Tenant-aware query managers |
| `core/views.py` | Add TenantViewSetMixin to all ViewSets |
| `core/serializers.py` | Add Organization, Subscription serializers |
| `core/urls.py` | Add new endpoints for org, subscription |
| `core/permissions.py` | Add IsPlatformAdmin permission |
| `core/services/plan_service.py` | NEW - Plan limits enforcement |
| `nexca_backend/settings.py` | Add tenant middleware |
| `migrations/` | New migrations for multi-tenant |

### Frontend (React)

| File | Change |
|------|--------|
| `src/context/AuthContext.js` | Add organization context |
| `src/services/api.js` | Add organization header |
| `src/pages/Signup.js` | NEW - Organization registration |
| `src/pages/Landing.js` | NEW - Public landing page |
| `src/pages/OrganizationSettings.js` | NEW - Org settings |
| `src/pages/Billing.js` | NEW - Subscription management |
| `src/pages/AdminDashboard.js` | NEW - Platform admin |
| `src/App.js` | Add new routes |

## Security Considerations

1. **Data Isolation**: All queries filtered by organization_id
2. **Cross-tenant Access Prevention**: Middleware + ViewSet filtering
3. **API Security**: Organization context validated on every request
4. **Audit Logging**: Track who accessed what data
5. **Encryption**: Tenant-specific encryption keys for sensitive data

## Pricing Plans (Suggested)

| Plan | Users | Clients | Price/Month |
|------|-------|---------|-------------|
| Free Trial | 2 | 10 | ₹0 (14 days) |
| Starter | 5 | 50 | ₹999 |
| Professional | 15 | 200 | ₹2,499 |
| Enterprise | Unlimited | Unlimited | Custom |

## Timeline Estimate

- **Phase 1**: Backend core infrastructure
- **Phase 2**: Subscription & plans
- **Phase 3**: Frontend updates
- **Phase 4**: Data migration
- **Phase 5**: Platform admin

## Questions Before Implementation

1. Do you want subdomain-based tenant identification (e.g., firmA.nexpro.com) or single domain with tenant selection at login?
2. Which payment gateway for subscriptions - Razorpay (India) or Stripe (Global)?
3. Should existing data be migrated to a "default" organization or create fresh?
4. Do you need white-labeling support (custom logos, colors per tenant)?
