from django.db import models
from django.contrib.auth.models import AbstractUser
from django.conf import settings
from django.utils.text import slugify
from cryptography.fernet import Fernet
import uuid


# =============================================================================
# MULTI-TENANT ORGANIZATION MODEL
# =============================================================================

class Organization(models.Model):
    """
    Tenant/Organization model - represents each firm/company using the platform.
    This is the core of multi-tenancy - all other models are scoped to an organization.
    """
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
        ('TRIAL', 'Trial'),
    ]

    # Core fields
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, help_text="Organization/Firm name")
    slug = models.SlugField(unique=True, max_length=100, help_text="URL-friendly identifier")
    subdomain = models.CharField(
        max_length=63,
        unique=True,
        null=True,
        blank=True,
        help_text="Subdomain for tenant (e.g., 'firmname' for firmname.nexpro.com)"
    )

    # Contact information
    email = models.EmailField(help_text="Primary contact email")
    phone = models.CharField(max_length=20, blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    city = models.CharField(max_length=100, blank=True, null=True)
    state = models.CharField(max_length=100, blank=True, null=True)
    country = models.CharField(max_length=100, default='India')
    pincode = models.CharField(max_length=10, blank=True, null=True)

    # Branding
    logo = models.ImageField(upload_to='org_logos/', null=True, blank=True)
    primary_color = models.CharField(max_length=7, default='#6366f1', help_text="Hex color code")

    # Subscription/Plan
    plan = models.CharField(max_length=20, choices=PLAN_CHOICES, default='FREE')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='TRIAL')
    trial_ends_at = models.DateTimeField(null=True, blank=True)

    # Plan limits
    max_users = models.IntegerField(default=2, help_text="Maximum users allowed")
    max_clients = models.IntegerField(default=10, help_text="Maximum clients allowed")

    # Organization settings
    firm_name = models.CharField(
        max_length=255,
        blank=True,
        help_text="Display name for documents/emails"
    )
    default_from_email = models.EmailField(
        blank=True,
        null=True,
        help_text="Default sender email for this organization"
    )
    gstin = models.CharField(max_length=15, blank=True, null=True)
    pan = models.CharField(max_length=10, blank=True, null=True)

    # Encryption key for this tenant's sensitive data
    encryption_key = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="Tenant-specific Fernet encryption key"
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'organizations'
        ordering = ['name']

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        # Auto-generate slug from name if not provided
        if not self.slug:
            base_slug = slugify(self.name)
            slug = base_slug
            counter = 1
            while Organization.objects.filter(slug=slug).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1
            self.slug = slug

        # Auto-generate subdomain from slug if not provided
        if not self.subdomain:
            self.subdomain = self.slug

        # Set firm_name from name if not provided
        if not self.firm_name:
            self.firm_name = self.name

        # Generate encryption key if not exists
        if not self.encryption_key:
            self.encryption_key = Fernet.generate_key().decode()

        super().save(*args, **kwargs)

    @property
    def is_active(self):
        return self.status in ['ACTIVE', 'TRIAL']

    @property
    def user_count(self):
        return self.users.count()

    @property
    def client_count(self):
        return self.client_set.count()

    def can_add_user(self):
        """Check if organization can add more users based on plan limits"""
        if self.max_users == -1:  # Unlimited
            return True
        return self.user_count < self.max_users

    def can_add_client(self):
        """Check if organization can add more clients based on plan limits"""
        if self.max_clients == -1:  # Unlimited
            return True
        return self.client_count < self.max_clients


class OrganizationEmail(models.Model):
    """
    Multiple email addresses for an organization.
    Each email can be configured with SMTP settings and linked to specific work types.
    """
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name='email_accounts'
    )

    # Email identity
    email_address = models.EmailField(help_text="Email address for sending")
    display_name = models.CharField(
        max_length=100,
        blank=True,
        help_text="Display name (e.g., 'GST Team', 'ITR Department')"
    )

    # SMTP Configuration (optional - if not set, uses organization's default)
    use_custom_smtp = models.BooleanField(
        default=False,
        help_text="Use custom SMTP settings instead of default"
    )
    smtp_host = models.CharField(max_length=255, blank=True, null=True)
    smtp_port = models.IntegerField(default=587, blank=True, null=True)
    smtp_username = models.CharField(max_length=255, blank=True, null=True)
    smtp_password = models.CharField(max_length=255, blank=True, null=True)  # Should be encrypted
    smtp_use_tls = models.BooleanField(default=True)

    # Status
    is_active = models.BooleanField(default=True)
    is_default = models.BooleanField(
        default=False,
        help_text="Use as default email for this organization"
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'organization_emails'
        ordering = ['-is_default', 'display_name']
        unique_together = ['organization', 'email_address']

    def __str__(self):
        if self.display_name:
            return f"{self.display_name} <{self.email_address}>"
        return self.email_address

    def save(self, *args, **kwargs):
        # If this is set as default, unset other defaults for this org
        if self.is_default:
            OrganizationEmail.objects.filter(
                organization=self.organization,
                is_default=True
            ).exclude(pk=self.pk).update(is_default=False)

        # If this is the first email for the organization, make it default
        if not self.pk:  # New record
            existing_count = OrganizationEmail.objects.filter(
                organization=self.organization
            ).count()
            if existing_count == 0:
                self.is_default = True

        super().save(*args, **kwargs)


class Subscription(models.Model):
    """Subscription management for organizations"""
    BILLING_CYCLE_CHOICES = [
        ('MONTHLY', 'Monthly'),
        ('QUARTERLY', 'Quarterly'),
        ('YEARLY', 'Yearly'),
    ]

    STATUS_CHOICES = [
        ('ACTIVE', 'Active'),
        ('PAST_DUE', 'Past Due'),
        ('CANCELLED', 'Cancelled'),
        ('PAUSED', 'Paused'),
    ]

    organization = models.OneToOneField(
        Organization,
        on_delete=models.CASCADE,
        related_name='subscription'
    )

    plan = models.CharField(max_length=20, choices=Organization.PLAN_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='ACTIVE')

    # Billing
    billing_cycle = models.CharField(max_length=20, choices=BILLING_CYCLE_CHOICES, default='MONTHLY')
    amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    currency = models.CharField(max_length=3, default='INR')

    # Billing dates
    current_period_start = models.DateTimeField(null=True, blank=True)
    current_period_end = models.DateTimeField(null=True, blank=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)

    # Payment gateway references
    razorpay_subscription_id = models.CharField(max_length=255, blank=True, null=True)
    razorpay_customer_id = models.CharField(max_length=255, blank=True, null=True)
    stripe_subscription_id = models.CharField(max_length=255, blank=True, null=True)
    stripe_customer_id = models.CharField(max_length=255, blank=True, null=True)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'subscriptions'

    def __str__(self):
        return f"{self.organization.name} - {self.plan} ({self.status})"


class UpgradeRequest(models.Model):
    """
    Plan upgrade requests from organizations.
    Platform admins review and approve/reject these requests.
    """
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('APPROVED', 'Approved'),
        ('REJECTED', 'Rejected'),
        ('CANCELLED', 'Cancelled'),
    ]

    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name='upgrade_requests'
    )
    requested_by = models.ForeignKey(
        'User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='upgrade_requests'
    )

    # Plan details
    current_plan = models.CharField(max_length=20, choices=Organization.PLAN_CHOICES)
    requested_plan = models.CharField(max_length=20, choices=Organization.PLAN_CHOICES)

    # Contact info
    contact_email = models.EmailField()
    contact_phone = models.CharField(max_length=20, blank=True)
    message = models.TextField(blank=True, help_text="Additional message from the organization")

    # Status and response
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    admin_response = models.TextField(blank=True, help_text="Response from platform admin")
    processed_by = models.ForeignKey(
        'User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='processed_upgrade_requests'
    )
    processed_at = models.DateTimeField(null=True, blank=True)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'upgrade_requests'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.organization.name}: {self.current_plan} -> {self.requested_plan} ({self.status})"


# =============================================================================
# USER MODEL (Modified for Multi-Tenant)
# =============================================================================

class User(AbstractUser):
    """Extended User model with role and organization"""
    ROLE_CHOICES = [
        ('ADMIN', 'Admin'),
        ('PARTNER', 'Partner'),
        ('MANAGER', 'Manager'),
        ('STAFF', 'Staff'),
    ]

    # Organization link - core multi-tenant field
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name='users',
        null=True,
        blank=True,
        help_text="Organization this user belongs to"
    )

    # Platform admin flag - for super admins who manage all organizations
    is_platform_admin = models.BooleanField(
        default=False,
        help_text="Platform administrator - can manage all organizations"
    )

    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='STAFF')
    mobile = models.CharField(max_length=15, blank=True, null=True)

    # Employee details (optional fields)
    pan = models.CharField(max_length=10, blank=True, null=True, help_text="PAN number")
    aadhar = models.CharField(max_length=12, blank=True, null=True, help_text="Aadhar number")
    salary = models.DecimalField(
        max_digits=12, decimal_places=2, blank=True, null=True,
        help_text="Monthly salary"
    )
    joining_date = models.DateField(blank=True, null=True, help_text="Date of joining")

    # Notification preferences
    notify_email_reminders = models.BooleanField(
        default=True,
        help_text="Receive email reminders for due tasks"
    )
    notify_task_assignments = models.BooleanField(
        default=True,
        help_text="Receive notifications for task assignments"
    )
    notify_overdue_alerts = models.BooleanField(
        default=True,
        help_text="Receive alerts for overdue tasks"
    )
    notify_weekly_reports = models.BooleanField(
        default=False,
        help_text="Receive weekly summary reports"
    )

    class Meta:
        db_table = 'users'
        ordering = ['username']

    def __str__(self):
        org_name = self.organization.name if self.organization else 'No Org'
        return f"{self.username} ({self.get_role_display()}) - {org_name}"

    def get_assigned_work_types(self):
        """Returns list of work types assigned to this user"""
        return self.work_type_assignments.filter(is_active=True).values_list('work_type', flat=True)


# =============================================================================
# TENANT-AWARE BASE MODEL
# =============================================================================

class TenantModel(models.Model):
    """
    Abstract base model for tenant-scoped models.
    All models that should be isolated per organization should inherit from this.
    """
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name='%(class)s_set',
        null=True,
        blank=True
    )

    class Meta:
        abstract = True


# =============================================================================
# BUSINESS MODELS (Modified for Multi-Tenant)
# =============================================================================

class Client(TenantModel):
    """Client master table - tenant scoped"""
    STATUS_CHOICES = [
        ('ACTIVE', 'Active'),
        ('INACTIVE', 'Inactive'),
    ]

    CATEGORY_CHOICES = [
        ('INDIVIDUAL', 'Individual'),
        ('FIRM', 'Firm'),
        ('COMPANY', 'Company'),
        ('TRUST', 'Trust'),
        ('HUF', 'HUF'),
        ('OTHERS', 'Others'),
    ]

    client_code = models.CharField(max_length=50)
    client_name = models.CharField(max_length=255)
    PAN = models.CharField(max_length=10, blank=True, null=True)
    GSTIN = models.CharField(max_length=15, blank=True, null=True)
    email = models.EmailField()
    mobile = models.CharField(max_length=15, blank=True, null=True)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES)
    group = models.CharField(max_length=100, blank=True, null=True, help_text="Client group name")
    date_of_birth = models.DateField(blank=True, null=True, help_text="For Individual/HUF")
    date_of_incorporation = models.DateField(blank=True, null=True, help_text="For Firm/Company/Trust")
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='ACTIVE')
    address = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'clients'
        ordering = ['client_name']
        # Client code is unique within an organization, not globally
        unique_together = ['organization', 'client_code']

    def __str__(self):
        return f"{self.client_code} - {self.client_name}"


class WorkType(TenantModel):
    """Work Type master table (GST, ITR, TDS, Audit, etc.) - tenant scoped"""
    FREQUENCY_CHOICES = [
        ('MONTHLY', 'Monthly'),
        ('QUARTERLY', 'Quarterly'),
        ('YEARLY', 'Yearly'),
        ('ONE_TIME', 'One-time'),
    ]

    REMINDER_FREQUENCY_CHOICES = [
        ('DAILY', 'Daily'),
        ('ALTERNATE_DAYS', 'Every Alternate Days'),
        ('WEEKLY', 'Weekly (Specific Days)'),
        ('CUSTOM', 'Custom Interval'),
    ]

    work_name = models.CharField(max_length=255)
    statutory_form = models.CharField(max_length=100, blank=True, null=True)
    default_frequency = models.CharField(max_length=20, choices=FREQUENCY_CHOICES)
    description = models.TextField(blank=True, null=True)
    is_active = models.BooleanField(default=True)

    # Auto-driven work type configuration
    # Auto-driven tasks start automatically and send reminders until completed
    # No manual assignment needed - system auto-starts and sends reminders continuously
    is_auto_driven = models.BooleanField(
        default=False,
        help_text="Auto-driven tasks start automatically and send reminders until completed. Example: GSR 1 document reminder"
    )
    auto_start_on_creation = models.BooleanField(
        default=True,
        help_text="For auto-driven: automatically set status to STARTED when task is created"
    )

    # Email configuration - link to specific email account for this work type
    sender_email = models.ForeignKey(
        'OrganizationEmail',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='work_types',
        help_text="Email account to use for sending reminders for this work type"
    )

    # Due Date Configuration
    due_date_day = models.IntegerField(
        default=20,
        help_text="Day of month when task is due (1-31)"
    )

    # =====================================================
    # CLIENT REMINDER CONFIGURATION
    # =====================================================
    enable_client_reminders = models.BooleanField(
        default=True,
        help_text="Enable automatic reminders to clients"
    )
    client_reminder_start_day = models.IntegerField(
        default=1,
        help_text="Day of month/period to start sending client reminders"
    )
    client_reminder_end_day = models.IntegerField(
        default=0,
        help_text="Day to stop client reminders (0 = due date, -1 = day before due)"
    )
    client_reminder_frequency_type = models.CharField(
        max_length=20,
        choices=REMINDER_FREQUENCY_CHOICES,
        default='ALTERNATE_DAYS',
        help_text="How frequently to send client reminders"
    )
    client_reminder_interval_days = models.IntegerField(
        default=2,
        help_text="Days between client reminders"
    )
    client_reminder_weekdays = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        help_text="For WEEKLY: comma-separated weekday numbers (0=Mon, 6=Sun)"
    )

    # =====================================================
    # EMPLOYEE/INTERNAL REMINDER CONFIGURATION
    # =====================================================
    EMPLOYEE_NOTIFICATION_TYPE_CHOICES = [
        ('EMAIL', 'Email Only'),
        ('IN_APP', 'In-App Notification Only'),
        ('BOTH', 'Both Email & In-App'),
    ]

    enable_employee_reminders = models.BooleanField(
        default=True,
        help_text="Enable automatic reminders to assigned employees"
    )
    employee_notification_type = models.CharField(
        max_length=20,
        choices=EMPLOYEE_NOTIFICATION_TYPE_CHOICES,
        default='BOTH',
        help_text="How to notify employees (email, in-app, or both)"
    )
    employee_reminder_start_day = models.IntegerField(
        default=1,
        help_text="Day of month/period to start sending employee reminders"
    )
    employee_reminder_end_day = models.IntegerField(
        default=0,
        help_text="Day to stop employee reminders (0 = due date)"
    )
    employee_reminder_frequency_type = models.CharField(
        max_length=20,
        choices=REMINDER_FREQUENCY_CHOICES,
        default='DAILY',
        help_text="How frequently to send employee reminders"
    )
    employee_reminder_interval_days = models.IntegerField(
        default=1,
        help_text="Days between employee reminders"
    )
    employee_reminder_weekdays = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        help_text="For WEEKLY: comma-separated weekday numbers (0=Mon, 6=Sun)"
    )

    # Legacy fields (kept for backward compatibility)
    enable_reminders = models.BooleanField(
        default=True,
        help_text="Enable automatic reminders for this work type"
    )
    reminder_start_day = models.IntegerField(
        default=1,
        help_text="Day of month/period to start sending reminders"
    )
    reminder_frequency_type = models.CharField(
        max_length=20,
        choices=REMINDER_FREQUENCY_CHOICES,
        default='ALTERNATE_DAYS',
        help_text="How frequently to send reminders"
    )
    reminder_interval_days = models.IntegerField(
        default=2,
        help_text="For ALTERNATE_DAYS: 2, for CUSTOM: specify custom interval"
    )
    reminder_weekdays = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        help_text="For WEEKLY: comma-separated weekday numbers (0=Monday, 6=Sunday)"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'work_types'
        ordering = ['work_name']

    def __str__(self):
        return f"{self.work_name} ({self.statutory_form or 'N/A'})"

    def get_period_dates(self, reference_date=None):
        """
        Calculate period start, end, and reminder dates based on frequency.
        For MONTHLY: returns dates for the current month
        For QUARTERLY: returns dates for the current quarter
        For YEARLY: returns dates for the current financial year
        """
        from datetime import date
        from dateutil.relativedelta import relativedelta
        import calendar

        if reference_date is None:
            reference_date = date.today()

        year = reference_date.year
        month = reference_date.month

        if self.default_frequency == 'MONTHLY':
            period_start = date(year, month, 1)
            last_day = calendar.monthrange(year, month)[1]
            period_end = date(year, month, last_day)
            due_day = min(self.due_date_day, last_day)
            due_date = date(year, month, due_day)

        elif self.default_frequency == 'QUARTERLY':
            # Q1: Apr-Jun, Q2: Jul-Sep, Q3: Oct-Dec, Q4: Jan-Mar
            if month in [4, 5, 6]:
                quarter_start_month = 4
            elif month in [7, 8, 9]:
                quarter_start_month = 7
            elif month in [10, 11, 12]:
                quarter_start_month = 10
            else:
                quarter_start_month = 1

            period_start = date(year, quarter_start_month, 1)
            quarter_end_month = quarter_start_month + 2
            last_day = calendar.monthrange(year, quarter_end_month)[1]
            period_end = date(year, quarter_end_month, last_day)

            due_month = quarter_end_month + 1
            due_year = year
            if due_month > 12:
                due_month = 1
                due_year += 1
            due_day = min(self.due_date_day, calendar.monthrange(due_year, due_month)[1])
            due_date = date(due_year, due_month, due_day)

        elif self.default_frequency == 'YEARLY':
            if month >= 4:
                fy_start_year = year
            else:
                fy_start_year = year - 1

            period_start = date(fy_start_year, 4, 1)
            period_end = date(fy_start_year + 1, 3, 31)

            due_year = fy_start_year + 1
            due_month = 7
            due_day = min(self.due_date_day, calendar.monthrange(due_year, due_month)[1])
            due_date = date(due_year, due_month, due_day)

        else:  # ONE_TIME
            period_start = reference_date
            period_end = reference_date
            due_date = reference_date + relativedelta(days=self.due_date_day)

        # Calculate client reminder dates
        client_start_day = min(self.client_reminder_start_day, calendar.monthrange(period_start.year, period_start.month)[1])
        client_reminder_start = period_start.replace(day=client_start_day)

        if self.client_reminder_end_day == 0:
            client_reminder_end = due_date
        elif self.client_reminder_end_day < 0:
            client_reminder_end = due_date + relativedelta(days=self.client_reminder_end_day)
        else:
            end_day = min(self.client_reminder_end_day, calendar.monthrange(due_date.year, due_date.month)[1])
            client_reminder_end = due_date.replace(day=end_day)

        # Calculate employee reminder dates
        emp_start_day = min(self.employee_reminder_start_day, calendar.monthrange(period_start.year, period_start.month)[1])
        employee_reminder_start = period_start.replace(day=emp_start_day)

        if self.employee_reminder_end_day == 0:
            employee_reminder_end = due_date
        elif self.employee_reminder_end_day < 0:
            employee_reminder_end = due_date + relativedelta(days=self.employee_reminder_end_day)
        else:
            end_day = min(self.employee_reminder_end_day, calendar.monthrange(due_date.year, due_date.month)[1])
            employee_reminder_end = due_date.replace(day=end_day)

        return {
            'period_start': period_start,
            'period_end': period_end,
            'due_date': due_date,
            'client_reminder_start': client_reminder_start,
            'client_reminder_end': client_reminder_end,
            'employee_reminder_start': employee_reminder_start,
            'employee_reminder_end': employee_reminder_end,
        }


class WorkTypeAssignment(TenantModel):
    """
    Mapping between work types and employees.
    When a work type is assigned to an employee, all tasks of that work type
    will be automatically assigned to that employee.
    """
    work_type = models.ForeignKey(
        WorkType,
        on_delete=models.CASCADE,
        related_name='employee_assignments'
    )
    employee = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='work_type_assignments'
    )
    is_active = models.BooleanField(default=True)
    assigned_at = models.DateTimeField(auto_now_add=True)
    assigned_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='work_type_assignments_made'
    )
    notes = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'work_type_assignments'
        unique_together = ['work_type', 'employee', 'organization']
        ordering = ['work_type__work_name', 'employee__first_name']

    def __str__(self):
        return f"{self.work_type.work_name} → {self.employee.get_full_name() or self.employee.email}"


class ClientWorkMapping(TenantModel):
    """Mapping between clients and work types (engagements) - tenant scoped"""
    FREQUENCY_CHOICES = WorkType.FREQUENCY_CHOICES

    client = models.ForeignKey(Client, on_delete=models.CASCADE, related_name='work_mappings')
    work_type = models.ForeignKey(WorkType, on_delete=models.CASCADE, related_name='client_mappings')
    freq_override = models.CharField(
        max_length=20,
        choices=FREQUENCY_CHOICES,
        blank=True,
        null=True,
        help_text="Optional frequency override"
    )
    start_from_period = models.CharField(
        max_length=50,
        help_text="E.g., 'FY 2024-25', 'Apr 2025', 'Q1 2025-26'"
    )
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'client_work_mappings'
        unique_together = ['client', 'work_type']
        ordering = ['client', 'work_type']

    def __str__(self):
        return f"{self.client.client_name} - {self.work_type.work_name}"

    @property
    def effective_frequency(self):
        """Returns the effective frequency (override or default)"""
        return self.freq_override if self.freq_override else self.work_type.default_frequency


class WorkInstance(TenantModel):
    """Individual work task instances - tenant scoped"""
    STATUS_CHOICES = [
        ('NOT_STARTED', 'Not Started'),
        ('STARTED', 'Started'),
        ('PAUSED', 'Paused'),
        ('COMPLETED', 'Completed'),
        ('OVERDUE', 'Overdue'),
    ]

    client_work = models.ForeignKey(ClientWorkMapping, on_delete=models.CASCADE, related_name='instances')
    period_label = models.CharField(
        max_length=100,
        help_text="E.g., 'Apr 2025', 'Q1 2025-26', 'FY 2025-26'"
    )
    period_start = models.DateField(null=True, blank=True)
    period_end = models.DateField(null=True, blank=True)
    due_date = models.DateField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='NOT_STARTED')
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_tasks'
    )
    started_on = models.DateField(null=True, blank=True)
    completed_on = models.DateField(null=True, blank=True)
    remarks = models.TextField(blank=True, null=True)

    # Time tracking fields
    timer_started_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Timestamp when timer was last started"
    )
    total_time_spent = models.IntegerField(
        default=0,
        help_text="Total time spent in seconds (accumulated across pause/resume cycles)"
    )
    is_timer_running = models.BooleanField(
        default=False,
        help_text="Whether the timer is currently running"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'work_instances'
        ordering = ['due_date', 'client_work']
        indexes = [
            models.Index(fields=['status', 'due_date']),
            models.Index(fields=['assigned_to', 'status']),
            models.Index(fields=['organization', 'status']),
        ]

    def __str__(self):
        return f"{self.client_work.client.client_name} - {self.client_work.work_type.work_name} - {self.period_label}"

    def start_timer(self):
        """Start the timer for this task"""
        from django.utils import timezone
        if not self.is_timer_running:
            self.timer_started_at = timezone.now()
            self.is_timer_running = True
            if not self.started_on:
                self.started_on = timezone.now().date()
            self.save(update_fields=['timer_started_at', 'is_timer_running', 'started_on'])

    def pause_timer(self):
        """Pause the timer and accumulate time spent"""
        from django.utils import timezone
        if self.is_timer_running and self.timer_started_at:
            elapsed = (timezone.now() - self.timer_started_at).total_seconds()
            self.total_time_spent += int(elapsed)
            self.is_timer_running = False
            self.timer_started_at = None
            self.save(update_fields=['total_time_spent', 'is_timer_running', 'timer_started_at'])

    def get_current_time_spent(self):
        """Get total time spent including current running session"""
        from django.utils import timezone
        total = self.total_time_spent
        if self.is_timer_running and self.timer_started_at:
            elapsed = (timezone.now() - self.timer_started_at).total_seconds()
            total += int(elapsed)
        return total

    def format_time_spent(self):
        """Format time spent as HH:MM:SS"""
        total_seconds = self.get_current_time_spent()
        hours = total_seconds // 3600
        minutes = (total_seconds % 3600) // 60
        seconds = total_seconds % 60
        return f"{int(hours):02d}:{int(minutes):02d}:{int(seconds):02d}"


def task_document_upload_path(instance, filename):
    """Generate upload path for task documents: task_documents/<org_id>/<task_id>/<filename>"""
    org_id = instance.work_instance.organization_id if instance.work_instance.organization else 'unknown'
    task_id = instance.work_instance.id
    return f'task_documents/{org_id}/{task_id}/{filename}'


class TaskDocument(TenantModel):
    """Documents uploaded for task/work instances by employees"""
    work_instance = models.ForeignKey(
        WorkInstance,
        on_delete=models.CASCADE,
        related_name='documents'
    )
    file = models.FileField(upload_to=task_document_upload_path)
    file_name = models.CharField(max_length=255, help_text="Original filename")
    file_size = models.IntegerField(default=0, help_text="File size in bytes")
    file_type = models.CharField(max_length=100, blank=True, null=True, help_text="MIME type")
    description = models.TextField(blank=True, null=True, help_text="Optional description")
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='uploaded_documents'
    )
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'task_documents'
        ordering = ['-uploaded_at']
        indexes = [
            models.Index(fields=['work_instance', '-uploaded_at']),
            models.Index(fields=['organization', '-uploaded_at']),
        ]

    def __str__(self):
        return f"{self.file_name} - {self.work_instance}"

    def save(self, *args, **kwargs):
        # Auto-set organization from work_instance
        if not self.organization and self.work_instance:
            self.organization = self.work_instance.organization
        super().save(*args, **kwargs)


class CredentialVault(TenantModel):
    """Secure storage for client portal credentials - tenant scoped"""
    PORTAL_TYPE_CHOICES = [
        ('GST', 'GST Portal'),
        ('INCOME_TAX', 'Income Tax Portal'),
        ('TDS', 'TDS Portal'),
        ('MCA', 'MCA Portal'),
        ('BANK', 'Bank Portal'),
        ('OTHERS', 'Others'),
    ]

    client = models.ForeignKey(Client, on_delete=models.CASCADE, related_name='credentials')
    portal_type = models.CharField(max_length=20, choices=PORTAL_TYPE_CHOICES)
    portal_name = models.CharField(
        max_length=255,
        default='',
        blank=True,
        help_text="Portal name (e.g., GST Portal, Income Tax Portal, etc.)"
    )
    login_url = models.URLField(max_length=500, blank=True, null=True)
    username = models.CharField(max_length=255)
    password_enc = models.TextField(help_text="Encrypted password using Fernet")
    extra_info = models.TextField(
        blank=True,
        null=True,
        help_text="Security Q&A, notes, etc."
    )
    last_updated = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'credential_vault'
        ordering = ['client', 'portal_type']

    def __str__(self):
        return f"{self.client.client_name} - {self.get_portal_type_display()}"

    def encrypt_password(self, plain_password):
        """Encrypt password using organization's Fernet key"""
        key = self._get_encryption_key()
        fernet = Fernet(key.encode())
        self.password_enc = fernet.encrypt(plain_password.encode()).decode()

    def decrypt_password(self):
        """Decrypt password using organization's Fernet key"""
        key = self._get_encryption_key()
        fernet = Fernet(key.encode())
        return fernet.decrypt(self.password_enc.encode()).decode()

    def _get_encryption_key(self):
        """Get encryption key - prefer organization's key, fallback to global"""
        if self.organization and self.organization.encryption_key:
            return self.organization.encryption_key
        if settings.FERNET_KEY:
            return settings.FERNET_KEY
        raise ValueError("No encryption key configured")


class EmailTemplate(TenantModel):
    """Email templates for different work types - tenant scoped"""
    TEMPLATE_TYPE_CHOICES = [
        ('CLIENT', 'Client Reminder'),
        ('EMPLOYEE', 'Employee/Internal Reminder'),
    ]

    work_type = models.ForeignKey(WorkType, on_delete=models.CASCADE, related_name='email_templates')
    template_name = models.CharField(max_length=255)
    template_type = models.CharField(
        max_length=20,
        choices=TEMPLATE_TYPE_CHOICES,
        default='CLIENT',
        help_text="Type of reminder this template is for"
    )
    subject_template = models.CharField(max_length=500)
    body_template = models.TextField(
        help_text="HTML/Text template with placeholders: {{client_name}}, {{PAN}}, {{GSTIN}}, {{period_label}}, {{due_date}}, {{work_name}}, {{firm_name}}, {{employee_name}}"
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'email_templates'
        ordering = ['work_type', 'template_type', 'template_name']

    def __str__(self):
        return f"{self.template_name} ({self.get_template_type_display()}) - {self.work_type.work_name}"


class ReminderRule(TenantModel):
    """Reminder rules relative to due date - tenant scoped"""
    REMINDER_TYPE_CHOICES = [
        ('DOCUMENT_REMINDER', 'Document Reminder'),
        ('FILING_REMINDER', 'Filing Reminder'),
        ('OVERDUE_REMINDER', 'Overdue Reminder'),
    ]

    RECIPIENT_TYPE_CHOICES = [
        ('CLIENT', 'Client'),
        ('EMPLOYEE', 'Employee/Internal'),
        ('BOTH', 'Both Client & Employee'),
    ]

    work_type = models.ForeignKey(WorkType, on_delete=models.CASCADE, related_name='reminder_rules')
    offset_days = models.IntegerField(
        help_text="Days relative to due_date (negative for before, positive for after)"
    )
    reminder_type = models.CharField(max_length=30, choices=REMINDER_TYPE_CHOICES)
    recipient_type = models.CharField(
        max_length=20,
        choices=RECIPIENT_TYPE_CHOICES,
        default='CLIENT',
        help_text="Who should receive this reminder"
    )
    email_template = models.ForeignKey(EmailTemplate, on_delete=models.CASCADE, related_name='reminder_rules')
    repeat_if_pending = models.BooleanField(default=False)
    repeat_interval = models.IntegerField(
        default=3,
        help_text="Days between repeats"
    )
    max_repeats = models.IntegerField(
        default=3,
        help_text="Maximum number of times to repeat"
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'reminder_rules'
        ordering = ['work_type', 'offset_days']

    def __str__(self):
        return f"{self.work_type.work_name} - {self.get_reminder_type_display()} ({self.offset_days} days) - {self.get_recipient_type_display()}"


class ReminderInstance(TenantModel):
    """Email queue/log for reminders - tenant scoped"""
    SEND_STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('SENT', 'Sent'),
        ('FAILED', 'Failed'),
        ('CANCELLED', 'Cancelled'),
        ('SKIPPED', 'Skipped - Task Completed'),
    ]

    RECIPIENT_TYPE_CHOICES = [
        ('CLIENT', 'Client'),
        ('EMPLOYEE', 'Employee'),
    ]

    work_instance = models.ForeignKey(WorkInstance, on_delete=models.CASCADE, related_name='reminders')
    reminder_rule = models.ForeignKey(
        ReminderRule,
        on_delete=models.CASCADE,
        related_name='instances',
        null=True,
        blank=True
    )
    recipient_type = models.CharField(
        max_length=20,
        choices=RECIPIENT_TYPE_CHOICES,
        default='CLIENT',
        help_text="Type of recipient"
    )
    scheduled_at = models.DateTimeField()
    sent_at = models.DateTimeField(null=True, blank=True)
    send_status = models.CharField(max_length=20, choices=SEND_STATUS_CHOICES, default='PENDING')
    repeat_count = models.IntegerField(default=0)
    last_attempt_at = models.DateTimeField(null=True, blank=True)
    email_to = models.EmailField()
    subject_rendered = models.CharField(max_length=500, blank=True, null=True)
    body_rendered = models.TextField(blank=True, null=True)
    error_message = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'reminder_instances'
        ordering = ['scheduled_at']
        indexes = [
            models.Index(fields=['send_status', 'scheduled_at']),
            models.Index(fields=['work_instance', 'send_status']),
            models.Index(fields=['organization', 'send_status']),
            models.Index(fields=['recipient_type', 'send_status']),
        ]

    def __str__(self):
        return f"Reminder for {self.work_instance} - {self.get_send_status_display()}"


class Notification(TenantModel):
    """In-app notifications for users - tenant scoped"""
    NOTIFICATION_TYPE_CHOICES = [
        ('REMINDER', 'Task Reminder'),
        ('TASK_ASSIGNED', 'Task Assigned'),
        ('TASK_COMPLETED', 'Task Completed'),
        ('TASK_OVERDUE', 'Task Overdue'),
        ('SYSTEM', 'System Notification'),
    ]

    PRIORITY_CHOICES = [
        ('LOW', 'Low'),
        ('MEDIUM', 'Medium'),
        ('HIGH', 'High'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications'
    )
    notification_type = models.CharField(
        max_length=30,
        choices=NOTIFICATION_TYPE_CHOICES,
        default='REMINDER'
    )
    title = models.CharField(max_length=255)
    message = models.TextField()
    priority = models.CharField(
        max_length=10,
        choices=PRIORITY_CHOICES,
        default='MEDIUM'
    )

    # Related objects (optional)
    work_instance = models.ForeignKey(
        WorkInstance,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='notifications'
    )
    reminder_instance = models.ForeignKey(
        ReminderInstance,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='notifications'
    )

    # Status
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)

    # Action URL (for click-through)
    action_url = models.CharField(max_length=500, blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'notifications'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'is_read']),
            models.Index(fields=['organization', 'user', '-created_at']),
            models.Index(fields=['notification_type', 'is_read']),
        ]

    def __str__(self):
        return f"{self.title} - {self.user.email}"

    def mark_as_read(self):
        if not self.is_read:
            from django.utils import timezone
            self.is_read = True
            self.read_at = timezone.now()
            self.save(update_fields=['is_read', 'read_at'])


# =============================================================================
# EMAIL OTP VERIFICATION MODEL
# =============================================================================

class EmailOTP(models.Model):
    """
    Model to store OTP for email verification during signup and password reset.
    Compliant with IT Act 2000 and DPDP Act 2023 requirements.
    """
    PURPOSE_CHOICES = [
        ('SIGNUP', 'Email Verification for Signup'),
        ('PASSWORD_RESET', 'Password Reset'),
        ('EMAIL_CHANGE', 'Email Change Verification'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(help_text="Email address for OTP verification")
    otp = models.CharField(max_length=6, help_text="6-digit OTP code")
    purpose = models.CharField(max_length=20, choices=PURPOSE_CHOICES)

    # Security fields
    is_verified = models.BooleanField(default=False)
    attempts = models.IntegerField(default=0, help_text="Number of verification attempts")
    max_attempts = models.IntegerField(default=5, help_text="Maximum allowed attempts")

    # Signup data stored temporarily until verified
    signup_data = models.JSONField(
        null=True,
        blank=True,
        help_text="Encrypted signup form data stored until email is verified"
    )

    # User reference for password reset
    user = models.ForeignKey(
        'User',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='otp_requests',
        help_text="User requesting password reset"
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(help_text="OTP expiry time")
    verified_at = models.DateTimeField(null=True, blank=True)

    # IP tracking for security audit (IT Act compliance)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'email_otps'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['email', 'purpose', 'is_verified']),
            models.Index(fields=['otp', 'email']),
            models.Index(fields=['expires_at']),
        ]

    def __str__(self):
        return f"OTP for {self.email} ({self.purpose})"

    def is_expired(self):
        """Check if OTP has expired"""
        from django.utils import timezone
        return timezone.now() > self.expires_at

    def is_max_attempts_reached(self):
        """Check if max verification attempts reached"""
        return self.attempts >= self.max_attempts

    def increment_attempts(self):
        """Increment attempt counter"""
        self.attempts += 1
        self.save(update_fields=['attempts'])

    def mark_verified(self):
        """Mark OTP as verified"""
        from django.utils import timezone
        self.is_verified = True
        self.verified_at = timezone.now()
        self.save(update_fields=['is_verified', 'verified_at'])

    @classmethod
    def generate_otp(cls):
        """Generate a 6-digit OTP"""
        import random
        return ''.join([str(random.randint(0, 9)) for _ in range(6)])

    @classmethod
    def create_otp(cls, email, purpose, signup_data=None, user=None, ip_address=None, user_agent=None):
        """
        Create a new OTP record.
        Invalidates any existing unexpired OTPs for the same email and purpose.
        """
        from django.utils import timezone
        from datetime import timedelta

        # Invalidate existing OTPs for this email and purpose
        cls.objects.filter(
            email=email,
            purpose=purpose,
            is_verified=False
        ).delete()

        # Generate new OTP
        otp_code = cls.generate_otp()
        expires_at = timezone.now() + timedelta(minutes=10)  # 10 minutes validity

        otp_record = cls.objects.create(
            email=email,
            otp=otp_code,
            purpose=purpose,
            signup_data=signup_data,
            user=user,
            expires_at=expires_at,
            ip_address=ip_address,
            user_agent=user_agent
        )

        return otp_record, otp_code

    @classmethod
    def verify_otp(cls, email, otp_code, purpose):
        """
        Verify an OTP.
        Returns: (success: bool, otp_record or error_message)
        """
        try:
            otp_record = cls.objects.get(
                email=email,
                purpose=purpose,
                is_verified=False
            )

            # Check expiry
            if otp_record.is_expired():
                return False, "OTP has expired. Please request a new one."

            # Check max attempts
            if otp_record.is_max_attempts_reached():
                return False, "Maximum verification attempts reached. Please request a new OTP."

            # Verify OTP
            if otp_record.otp != otp_code:
                otp_record.increment_attempts()
                remaining = otp_record.max_attempts - otp_record.attempts
                return False, f"Invalid OTP. {remaining} attempts remaining."

            # Success
            otp_record.mark_verified()
            return True, otp_record

        except cls.DoesNotExist:
            return False, "No pending OTP verification found for this email."


# =============================================================================
# AUDIT LOG FOR COMPLIANCE (IT Act & DPDP Act)
# =============================================================================

class AuditLog(models.Model):
    """
    Comprehensive audit log for compliance with IT Act 2000 and DPDP Act 2023.
    Tracks all significant user actions and data access.
    """
    ACTION_CHOICES = [
        ('LOGIN', 'User Login'),
        ('LOGOUT', 'User Logout'),
        ('LOGIN_FAILED', 'Failed Login Attempt'),
        ('SIGNUP', 'User Registration'),
        ('PASSWORD_CHANGE', 'Password Changed'),
        ('PASSWORD_RESET', 'Password Reset'),
        ('PROFILE_UPDATE', 'Profile Updated'),
        ('DATA_ACCESS', 'Data Accessed'),
        ('DATA_EXPORT', 'Data Exported'),
        ('DATA_DELETE', 'Data Deleted'),
        ('CLIENT_CREATE', 'Client Created'),
        ('CLIENT_UPDATE', 'Client Updated'),
        ('CLIENT_DELETE', 'Client Deleted'),
        ('SETTINGS_CHANGE', 'Settings Changed'),
        ('OTP_SENT', 'OTP Sent'),
        ('OTP_VERIFIED', 'OTP Verified'),
        ('OTP_FAILED', 'OTP Verification Failed'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Who
    user = models.ForeignKey(
        'User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='audit_logs'
    )
    user_email = models.EmailField(help_text="Email at time of action (preserved if user deleted)")
    organization = models.ForeignKey(
        Organization,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='audit_logs'
    )

    # What
    action = models.CharField(max_length=30, choices=ACTION_CHOICES)
    description = models.TextField(help_text="Detailed description of the action")

    # Affected resource
    resource_type = models.CharField(max_length=100, blank=True, null=True)
    resource_id = models.CharField(max_length=100, blank=True, null=True)

    # Technical details
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True, null=True)
    request_path = models.CharField(max_length=500, blank=True, null=True)
    request_method = models.CharField(max_length=10, blank=True, null=True)

    # Additional data
    extra_data = models.JSONField(null=True, blank=True)

    # Timestamp
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'audit_logs'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['organization', '-created_at']),
            models.Index(fields=['action', '-created_at']),
            models.Index(fields=['ip_address']),
            models.Index(fields=['created_at']),
        ]

    def __str__(self):
        return f"{self.action} by {self.user_email} at {self.created_at}"

    @classmethod
    def log(cls, action, user=None, organization=None, description='',
            resource_type=None, resource_id=None, request=None, extra_data=None):
        """Create an audit log entry"""
        ip_address = None
        user_agent = None
        request_path = None
        request_method = None

        if request:
            ip_address = cls.get_client_ip(request)
            user_agent = request.META.get('HTTP_USER_AGENT', '')[:500]
            request_path = request.path
            request_method = request.method

        return cls.objects.create(
            user=user,
            user_email=user.email if user else '',
            organization=organization or (user.organization if user else None),
            action=action,
            description=description,
            resource_type=resource_type,
            resource_id=str(resource_id) if resource_id else None,
            ip_address=ip_address,
            user_agent=user_agent,
            request_path=request_path,
            request_method=request_method,
            extra_data=extra_data
        )

    @staticmethod
    def get_client_ip(request):
        """Get client IP from request headers"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0].strip()
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


class ReportConfiguration(TenantModel):
    """
    Admin report configuration for scheduled PDF reports with charts/graphs.
    Tenant admins can configure frequency and content of reports.
    """
    FREQUENCY_CHOICES = [
        ('DAILY', 'Daily'),
        ('WEEKLY', 'Weekly'),
        ('MONTHLY', 'Monthly'),
    ]

    DAY_OF_WEEK_CHOICES = [
        (0, 'Monday'),
        (1, 'Tuesday'),
        (2, 'Wednesday'),
        (3, 'Thursday'),
        (4, 'Friday'),
        (5, 'Saturday'),
        (6, 'Sunday'),
    ]

    # Basic settings
    name = models.CharField(
        max_length=255,
        default='Admin Report',
        help_text="Name for this report configuration"
    )
    is_active = models.BooleanField(
        default=True,
        help_text="Whether this report should be sent"
    )

    # Schedule settings
    frequency = models.CharField(
        max_length=20,
        choices=FREQUENCY_CHOICES,
        default='WEEKLY',
        help_text="How often to send the report"
    )
    day_of_week = models.IntegerField(
        choices=DAY_OF_WEEK_CHOICES,
        default=0,  # Monday
        help_text="For weekly reports: which day to send"
    )
    day_of_month = models.IntegerField(
        default=1,
        help_text="For monthly reports: which day to send (1-28)"
    )
    send_time = models.TimeField(
        default='09:00:00',
        help_text="Time of day to send the report (24-hour format)"
    )

    # Recipients
    recipient_emails = models.TextField(
        help_text="Comma-separated list of email addresses to receive the report"
    )

    # Report content options (what to include)
    include_summary = models.BooleanField(
        default=True,
        help_text="Include overall summary statistics"
    )
    include_client_wise = models.BooleanField(
        default=True,
        help_text="Include client-wise task breakdown"
    )
    include_employee_wise = models.BooleanField(
        default=True,
        help_text="Include employee-wise task breakdown"
    )
    include_work_type_wise = models.BooleanField(
        default=True,
        help_text="Include work type-wise task breakdown"
    )
    include_status_breakdown = models.BooleanField(
        default=True,
        help_text="Include status breakdown (completed, overdue, pending, etc.)"
    )
    include_overdue_list = models.BooleanField(
        default=True,
        help_text="Include detailed list of overdue tasks"
    )
    include_upcoming_dues = models.BooleanField(
        default=True,
        help_text="Include list of upcoming due tasks"
    )
    include_charts = models.BooleanField(
        default=True,
        help_text="Include visual charts and graphs in the report"
    )

    # Report period (for filtering data)
    PERIOD_CHOICES = [
        ('CURRENT_DAY', 'Current Day'),
        ('LAST_7_DAYS', 'Last 7 Days'),
        ('LAST_30_DAYS', 'Last 30 Days'),
        ('CURRENT_MONTH', 'Current Month'),
        ('CURRENT_QUARTER', 'Current Quarter'),
        ('CURRENT_FY', 'Current Financial Year'),
    ]
    report_period = models.CharField(
        max_length=30,
        choices=PERIOD_CHOICES,
        default='LAST_7_DAYS',
        help_text="Time period for report data"
    )

    # Tracking
    last_sent_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When the report was last sent"
    )
    last_sent_status = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        help_text="Status of the last send attempt"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'report_configurations'
        ordering = ['name']
        indexes = [
            models.Index(fields=['organization', 'is_active']),
            models.Index(fields=['frequency', 'is_active']),
        ]

    def __str__(self):
        return f"{self.name} ({self.get_frequency_display()}) - {self.organization.name if self.organization else 'No Org'}"

    def get_recipient_list(self):
        """Return list of recipient email addresses"""
        if not self.recipient_emails:
            return []
        return [email.strip() for email in self.recipient_emails.split(',') if email.strip()]

    def get_period_dates(self):
        """Calculate start and end dates based on report_period"""
        from datetime import date, timedelta
        from dateutil.relativedelta import relativedelta

        today = date.today()

        if self.report_period == 'CURRENT_DAY':
            return today, today
        elif self.report_period == 'LAST_7_DAYS':
            return today - timedelta(days=7), today
        elif self.report_period == 'LAST_30_DAYS':
            return today - timedelta(days=30), today
        elif self.report_period == 'CURRENT_MONTH':
            start = today.replace(day=1)
            return start, today
        elif self.report_period == 'CURRENT_QUARTER':
            # Indian fiscal quarters: Q1(Apr-Jun), Q2(Jul-Sep), Q3(Oct-Dec), Q4(Jan-Mar)
            month = today.month
            if month in [4, 5, 6]:
                quarter_start = date(today.year, 4, 1)
            elif month in [7, 8, 9]:
                quarter_start = date(today.year, 7, 1)
            elif month in [10, 11, 12]:
                quarter_start = date(today.year, 10, 1)
            else:  # Jan, Feb, Mar
                quarter_start = date(today.year, 1, 1)
            return quarter_start, today
        elif self.report_period == 'CURRENT_FY':
            # Indian fiscal year: Apr to Mar
            if today.month >= 4:
                fy_start = date(today.year, 4, 1)
            else:
                fy_start = date(today.year - 1, 4, 1)
            return fy_start, today
        else:
            return today - timedelta(days=7), today


# =============================================================================
# PLATFORM SETTINGS (Super Admin)
# =============================================================================

class PlatformSettings(models.Model):
    """
    Singleton model for platform-wide settings.
    Only one instance should exist, controlled by platform admins.
    """
    # General Settings
    platform_name = models.CharField(
        max_length=100,
        default='NexPro',
        help_text="Platform display name"
    )
    support_email = models.EmailField(
        default='support@nexpro.com',
        help_text="Support contact email"
    )

    # Signup Controls
    enable_signups = models.BooleanField(
        default=True,
        help_text="Allow new organization registrations"
    )
    maintenance_mode = models.BooleanField(
        default=False,
        help_text="Enable maintenance mode (blocks all non-admin access)"
    )

    # Trial Settings
    default_trial_days = models.PositiveIntegerField(
        default=30,
        help_text="Default trial period for new organizations"
    )
    max_free_users = models.PositiveIntegerField(
        default=1,
        help_text="Maximum users allowed in free plan"
    )
    max_free_clients = models.PositiveIntegerField(
        default=10,
        help_text="Maximum clients allowed in free plan"
    )

    # Security Settings
    require_email_verification = models.BooleanField(
        default=True,
        help_text="Require email verification for new signups"
    )
    allow_password_reset = models.BooleanField(
        default=True,
        help_text="Allow users to reset passwords via email"
    )

    # SMTP Email Configuration
    smtp_host = models.CharField(
        max_length=255,
        blank=True,
        default='',
        help_text="SMTP server hostname (e.g., smtp.gmail.com)"
    )
    smtp_port = models.PositiveIntegerField(
        default=587,
        help_text="SMTP server port (587 for TLS, 465 for SSL)"
    )
    smtp_username = models.CharField(
        max_length=255,
        blank=True,
        default='',
        help_text="SMTP username/email"
    )
    smtp_password = models.CharField(
        max_length=255,
        blank=True,
        default='',
        help_text="SMTP password (stored encrypted)"
    )
    smtp_use_tls = models.BooleanField(
        default=True,
        help_text="Use TLS encryption"
    )
    smtp_use_ssl = models.BooleanField(
        default=False,
        help_text="Use SSL encryption (mutually exclusive with TLS)"
    )
    smtp_from_email = models.EmailField(
        blank=True,
        default='',
        help_text="Default sender email address"
    )
    smtp_from_name = models.CharField(
        max_length=100,
        blank=True,
        default='',
        help_text="Default sender display name"
    )
    smtp_enabled = models.BooleanField(
        default=False,
        help_text="Enable SMTP email sending"
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'platform_settings'
        verbose_name = 'Platform Settings'
        verbose_name_plural = 'Platform Settings'

    def __str__(self):
        return f"Platform Settings ({self.platform_name})"

    def save(self, *args, **kwargs):
        """Ensure only one instance exists"""
        if not self.pk and PlatformSettings.objects.exists():
            # Update existing instead of creating new
            existing = PlatformSettings.objects.first()
            self.pk = existing.pk
        super().save(*args, **kwargs)

    @classmethod
    def get_settings(cls):
        """Get or create the singleton settings instance"""
        settings, _ = cls.objects.get_or_create(pk=1)
        return settings


# =============================================================================
# SUBSCRIPTION PLANS (Super Admin Managed)
# =============================================================================

class SubscriptionPlan(models.Model):
    """
    Dynamic subscription plans managed by platform admins.
    Allows creating, modifying, and customizing plans without code changes.
    """
    # Plan Identification
    code = models.CharField(
        max_length=50,
        unique=True,
        help_text="Unique plan identifier (e.g., FREE, STARTER, PROFESSIONAL)"
    )
    name = models.CharField(
        max_length=100,
        help_text="Display name for the plan"
    )
    description = models.TextField(
        blank=True,
        default='',
        help_text="Plan description for users"
    )

    # Pricing
    price_monthly = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        help_text="Monthly subscription price"
    )
    price_yearly = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        help_text="Yearly subscription price"
    )
    currency = models.CharField(
        max_length=3,
        default='INR',
        help_text="Currency code (INR, USD, etc.)"
    )

    # Limits
    max_users = models.PositiveIntegerField(
        default=1,
        help_text="Maximum users allowed"
    )
    max_clients = models.PositiveIntegerField(
        default=10,
        help_text="Maximum clients allowed"
    )
    max_storage_mb = models.PositiveIntegerField(
        default=100,
        help_text="Maximum storage in MB"
    )

    # Features (JSON field for flexibility)
    features = models.JSONField(
        default=list,
        blank=True,
        help_text="List of features included in this plan"
    )

    # Status and ordering
    is_active = models.BooleanField(
        default=True,
        help_text="Whether this plan is available for subscription"
    )
    is_default = models.BooleanField(
        default=False,
        help_text="Default plan for new signups"
    )
    sort_order = models.PositiveIntegerField(
        default=0,
        help_text="Display order (lower = first)"
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'subscription_plans'
        ordering = ['sort_order', 'price_monthly']
        verbose_name = 'Subscription Plan'
        verbose_name_plural = 'Subscription Plans'

    def __str__(self):
        return f"{self.name} ({self.code})"

    def save(self, *args, **kwargs):
        """Ensure only one default plan exists"""
        if self.is_default:
            SubscriptionPlan.objects.filter(is_default=True).exclude(pk=self.pk).update(is_default=False)
        super().save(*args, **kwargs)

    @classmethod
    def get_default_plan(cls):
        """Get the default plan for new signups"""
        return cls.objects.filter(is_default=True, is_active=True).first()

    @classmethod
    def create_default_plans(cls):
        """Create default subscription plans if none exist"""
        if cls.objects.exists():
            return

        default_plans = [
            {
                'code': 'FREE',
                'name': 'Free Trial',
                'description': 'Get started with basic features',
                'price_monthly': 0,
                'price_yearly': 0,
                'max_users': 2,
                'max_clients': 10,
                'max_storage_mb': 100,
                'features': ['Basic task management', 'Email reminders', 'Document storage'],
                'is_default': True,
                'sort_order': 0,
            },
            {
                'code': 'STARTER',
                'name': 'Starter',
                'description': 'Perfect for small teams',
                'price_monthly': 999,
                'price_yearly': 9990,
                'max_users': 5,
                'max_clients': 50,
                'max_storage_mb': 500,
                'features': ['Everything in Free', 'Priority support', 'Custom reports', 'Team collaboration'],
                'sort_order': 1,
            },
            {
                'code': 'PROFESSIONAL',
                'name': 'Professional',
                'description': 'For growing practices',
                'price_monthly': 2499,
                'price_yearly': 24990,
                'max_users': 15,
                'max_clients': 200,
                'max_storage_mb': 2000,
                'features': ['Everything in Starter', 'Advanced analytics', 'API access', 'Multiple email accounts'],
                'sort_order': 2,
            },
            {
                'code': 'ENTERPRISE',
                'name': 'Enterprise',
                'description': 'For large organizations',
                'price_monthly': 4999,
                'price_yearly': 49990,
                'max_users': 999,
                'max_clients': 9999,
                'max_storage_mb': 10000,
                'features': ['Everything in Professional', 'Unlimited storage', 'Dedicated support', 'Custom integrations', 'SLA guarantee'],
                'sort_order': 3,
            },
        ]

        for plan_data in default_plans:
            cls.objects.create(**plan_data)
