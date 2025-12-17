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
    Each email can be configured with SMTP settings and linked to specific task categories.
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

    # SMTP Configuration (optional - if not set, uses platform's default)
    # SMTP Source: 'PLATFORM' = use platform SMTP, 'CUSTOM' = own SMTP, 'INHERIT' = use another account's SMTP
    SMTP_SOURCE_CHOICES = [
        ('PLATFORM', 'Use Platform SMTP'),
        ('CUSTOM', 'Custom SMTP Settings'),
        ('INHERIT', 'Use Another Account\'s SMTP'),
    ]
    smtp_source = models.CharField(
        max_length=20,
        choices=SMTP_SOURCE_CHOICES,
        default='PLATFORM',
        help_text="Where to get SMTP settings from"
    )
    # Reference to another email account to inherit SMTP settings from
    smtp_inherit_from = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='smtp_dependents',
        help_text="Inherit SMTP settings from this email account"
    )
    # Legacy field - kept for backwards compatibility, now derived from smtp_source
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

        # Sync use_custom_smtp with smtp_source for backwards compatibility
        self.use_custom_smtp = (self.smtp_source == 'CUSTOM')

        # Clear inherit reference if not using INHERIT source
        if self.smtp_source != 'INHERIT':
            self.smtp_inherit_from = None

        super().save(*args, **kwargs)

    def get_effective_smtp_settings(self):
        """
        Get the effective SMTP settings for this email account.
        Returns a dict with SMTP config or None if using platform SMTP.
        """
        if self.smtp_source == 'PLATFORM':
            return None  # Use platform SMTP

        if self.smtp_source == 'INHERIT' and self.smtp_inherit_from:
            # Get settings from the inherited account (recursively)
            return self.smtp_inherit_from.get_effective_smtp_settings()

        if self.smtp_source == 'CUSTOM' and self.smtp_host:
            return {
                'host': self.smtp_host,
                'port': self.smtp_port or 587,
                'username': self.smtp_username,
                'password': self.smtp_password,
                'use_tls': self.smtp_use_tls,
            }

        return None  # Fallback to platform SMTP


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
        """Returns list of task categories assigned to this user"""
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
    """Task Category master table (GST, ITR, TDS, Audit, etc.) - tenant scoped"""
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

    # Subtask configuration
    has_subtasks = models.BooleanField(
        default=False,
        help_text="Enable subtasks for this task category"
    )

    # Auto-driven task category configuration
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

    # Email configuration - link to specific email account for this task category
    sender_email = models.ForeignKey(
        'OrganizationEmail',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='work_types',
        help_text="Email account to use for sending reminders for this task category"
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
        help_text="Enable automatic reminders for this task category"
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


class SubTaskCategory(TenantModel):
    """
    Sub-task categories within a Task Category (WorkType).
    Each subtask can have its own reminder configuration similar to the parent task category.
    """
    REMINDER_FREQUENCY_CHOICES = WorkType.REMINDER_FREQUENCY_CHOICES
    EMPLOYEE_NOTIFICATION_TYPE_CHOICES = WorkType.EMPLOYEE_NOTIFICATION_TYPE_CHOICES

    work_type = models.ForeignKey(
        WorkType,
        on_delete=models.CASCADE,
        related_name='subtask_categories'
    )
    name = models.CharField(max_length=255, help_text="Name of the subtask")
    description = models.TextField(blank=True, null=True)
    order = models.PositiveIntegerField(default=0, help_text="Display order")
    is_active = models.BooleanField(default=True)

    # Subtask can be marked as required or optional
    is_required = models.BooleanField(
        default=True,
        help_text="Is this subtask mandatory for task completion?"
    )

    # Auto-driven configuration (inherits from parent or can be customized)
    is_auto_driven = models.BooleanField(
        default=False,
        help_text="Auto-driven subtasks start automatically and send reminders until completed"
    )

    # Due date configuration relative to parent task
    due_days_before_parent = models.IntegerField(
        default=0,
        help_text="Days before parent task due date (0 = same as parent, -5 = 5 days before)"
    )

    # =====================================================
    # CLIENT REMINDER CONFIGURATION
    # =====================================================
    enable_client_reminders = models.BooleanField(
        default=True,
        help_text="Enable automatic reminders to clients for this subtask"
    )
    client_reminder_start_day = models.IntegerField(
        default=1,
        help_text="Day of month/period to start sending client reminders"
    )
    client_reminder_end_day = models.IntegerField(
        default=0,
        help_text="Day to stop client reminders (0 = due date)"
    )
    client_reminder_frequency_type = models.CharField(
        max_length=20,
        choices=REMINDER_FREQUENCY_CHOICES,
        default='ALTERNATE_DAYS'
    )
    client_reminder_interval_days = models.IntegerField(default=2)
    client_reminder_weekdays = models.CharField(max_length=50, blank=True, null=True)

    # =====================================================
    # EMPLOYEE/INTERNAL REMINDER CONFIGURATION
    # =====================================================
    enable_employee_reminders = models.BooleanField(
        default=True,
        help_text="Enable automatic reminders to assigned employees for this subtask"
    )
    employee_notification_type = models.CharField(
        max_length=20,
        choices=EMPLOYEE_NOTIFICATION_TYPE_CHOICES,
        default='BOTH'
    )
    employee_reminder_start_day = models.IntegerField(default=1)
    employee_reminder_end_day = models.IntegerField(default=0)
    employee_reminder_frequency_type = models.CharField(
        max_length=20,
        choices=REMINDER_FREQUENCY_CHOICES,
        default='DAILY'
    )
    employee_reminder_interval_days = models.IntegerField(default=1)
    employee_reminder_weekdays = models.CharField(max_length=50, blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'subtask_categories'
        ordering = ['work_type', 'order', 'name']
        unique_together = ['work_type', 'name', 'organization']

    def __str__(self):
        return f"{self.work_type.work_name} → {self.name}"


class WorkTypeAssignment(TenantModel):
    """
    Mapping between task categories and employees.
    When a task category is assigned to an employee, all tasks of that task category
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
    """Mapping between clients and task categories (engagements) - tenant scoped"""
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

    @property
    def is_overdue(self):
        """Check if task is overdue (due date has passed and not completed)"""
        from django.utils import timezone
        if self.status == 'COMPLETED':
            return False
        today = timezone.now().date()
        return self.due_date < today


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
    """Email templates for different task categories - tenant scoped"""
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

    # Recipients - Type determines how recipients are selected
    RECIPIENT_TYPE_CHOICES = [
        ('SPECIFIC_USERS', 'Specific Users'),
        ('BY_ROLE', 'All Users with Specific Roles'),
    ]

    recipient_type = models.CharField(
        max_length=20,
        choices=RECIPIENT_TYPE_CHOICES,
        default='SPECIFIC_USERS',
        help_text="How to determine report recipients"
    )

    # For SPECIFIC_USERS: comma-separated user IDs (not external emails)
    recipient_user_ids = models.TextField(
        blank=True,
        null=True,
        help_text="Comma-separated list of user IDs within the organization"
    )

    # For BY_ROLE: which roles should receive the report
    recipient_roles = models.TextField(
        blank=True,
        null=True,
        help_text="Comma-separated list of roles (ADMIN, PARTNER, MANAGER, STAFF)"
    )

    # Legacy field - kept for backward compatibility, now derived from users
    recipient_emails = models.TextField(
        blank=True,
        null=True,
        help_text="Deprecated: Use recipient_user_ids or recipient_roles instead"
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
        help_text="Include task category-wise task breakdown"
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
        """Return list of recipient email addresses based on recipient_type"""
        emails = []

        if self.recipient_type == 'SPECIFIC_USERS' and self.recipient_user_ids:
            # Get emails from specific user IDs
            user_ids = [uid.strip() for uid in self.recipient_user_ids.split(',') if uid.strip()]
            from core.models import User
            users = User.objects.filter(
                id__in=user_ids,
                organization=self.organization,
                is_active=True
            )
            emails = [user.email for user in users if user.email]

        elif self.recipient_type == 'BY_ROLE' and self.recipient_roles:
            # Get emails from users with specified roles
            roles = [role.strip() for role in self.recipient_roles.split(',') if role.strip()]
            from core.models import User
            users = User.objects.filter(
                organization=self.organization,
                role__in=roles,
                is_active=True
            )
            emails = [user.email for user in users if user.email]

        # Fallback to legacy recipient_emails if new fields are empty
        if not emails and self.recipient_emails:
            emails = [email.strip() for email in self.recipient_emails.split(',') if email.strip()]

        return emails

    def get_recipient_roles_list(self):
        """Return list of recipient roles"""
        if not self.recipient_roles:
            return []
        return [role.strip() for role in self.recipient_roles.split(',') if role.strip()]

    def get_recipient_user_ids_list(self):
        """Return list of recipient user IDs"""
        if not self.recipient_user_ids:
            return []
        return [uid.strip() for uid in self.recipient_user_ids.split(',') if uid.strip()]

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

    # Google OAuth Settings (for Google Sync Hub)
    google_client_id = models.CharField(
        max_length=255,
        blank=True,
        default='',
        help_text="Google OAuth Client ID from Google Cloud Console"
    )
    google_client_secret_encrypted = models.TextField(
        blank=True,
        default='',
        help_text="Google OAuth Client Secret (encrypted with Fernet)"
    )
    google_oauth_enabled = models.BooleanField(
        default=False,
        help_text="Enable Google OAuth for Google Sync Hub"
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
    smtp_password_encrypted = models.TextField(
        blank=True,
        default='',
        help_text="SMTP password (encrypted with Fernet)"
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

    # ==========================================================================
    # Email Provider Settings (for scalable email delivery)
    # ==========================================================================
    EMAIL_PROVIDER_CHOICES = [
        ('SMTP', 'SMTP (Gmail, Custom)'),
        ('SENDGRID', 'SendGrid'),
        ('SES', 'Amazon SES'),
    ]

    email_provider = models.CharField(
        max_length=20,
        choices=EMAIL_PROVIDER_CHOICES,
        default='SMTP',
        help_text="Email service provider to use"
    )

    # SendGrid Settings
    sendgrid_api_key_encrypted = models.TextField(
        blank=True,
        default='',
        help_text="SendGrid API Key (encrypted)"
    )

    # Amazon SES Settings
    aws_access_key_id = models.CharField(
        max_length=128,
        blank=True,
        default='',
        help_text="AWS Access Key ID for SES"
    )
    aws_secret_access_key_encrypted = models.TextField(
        blank=True,
        default='',
        help_text="AWS Secret Access Key (encrypted)"
    )
    aws_region = models.CharField(
        max_length=32,
        blank=True,
        default='us-east-1',
        help_text="AWS Region for SES (e.g., us-east-1, ap-south-1)"
    )

    # Email Rate Limiting Settings
    email_daily_limit_per_org = models.PositiveIntegerField(
        default=500,
        help_text="Maximum emails per organization per day (0 = unlimited)"
    )
    email_daily_limit_platform = models.PositiveIntegerField(
        default=10000,
        help_text="Maximum total emails platform-wide per day (0 = unlimited)"
    )

    # ==========================================================================
    # Google API Quota Settings (Platform-wide limits)
    # ==========================================================================
    google_tasks_daily_quota = models.PositiveIntegerField(
        default=50000,
        help_text="Google Tasks API daily quota limit (default: 50,000)"
    )
    google_calendar_daily_quota = models.PositiveIntegerField(
        default=1000000,
        help_text="Google Calendar API daily quota limit (default: 1,000,000)"
    )
    google_drive_daily_quota = models.PositiveIntegerField(
        default=1000000000,
        help_text="Google Drive API daily quota limit (default: 1,000,000,000)"
    )
    google_gmail_daily_quota = models.PositiveIntegerField(
        default=1000000,
        help_text="Gmail API daily quota units limit"
    )
    # Alert thresholds (percentage)
    quota_warning_threshold = models.PositiveIntegerField(
        default=70,
        help_text="Percentage at which to warn about quota usage"
    )
    quota_critical_threshold = models.PositiveIntegerField(
        default=90,
        help_text="Percentage at which to critically alert about quota usage"
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

    # ==========================================================================
    # Encryption/Decryption for sensitive fields
    # ==========================================================================

    def _get_fernet(self):
        """Get Fernet instance for encryption/decryption"""
        if settings.FERNET_KEY:
            return Fernet(settings.FERNET_KEY.encode() if isinstance(settings.FERNET_KEY, str) else settings.FERNET_KEY)
        raise ValueError("FERNET_KEY not configured in settings")

    @property
    def google_client_secret(self):
        """Decrypt and return Google client secret"""
        if not self.google_client_secret_encrypted:
            return ''
        try:
            fernet = self._get_fernet()
            return fernet.decrypt(self.google_client_secret_encrypted.encode()).decode()
        except Exception:
            return ''

    @google_client_secret.setter
    def google_client_secret(self, value):
        """Encrypt and store Google client secret"""
        if not value:
            self.google_client_secret_encrypted = ''
            return
        try:
            fernet = self._get_fernet()
            self.google_client_secret_encrypted = fernet.encrypt(value.encode()).decode()
        except Exception as e:
            raise ValueError(f"Failed to encrypt Google client secret: {str(e)}")

    @property
    def smtp_password(self):
        """Decrypt and return SMTP password"""
        if not self.smtp_password_encrypted:
            return ''
        try:
            fernet = self._get_fernet()
            return fernet.decrypt(self.smtp_password_encrypted.encode()).decode()
        except Exception:
            return ''

    @smtp_password.setter
    def smtp_password(self, value):
        """Encrypt and store SMTP password"""
        if not value:
            self.smtp_password_encrypted = ''
            return
        try:
            fernet = self._get_fernet()
            self.smtp_password_encrypted = fernet.encrypt(value.encode()).decode()
        except Exception as e:
            raise ValueError(f"Failed to encrypt SMTP password: {str(e)}")

    def has_google_client_secret(self):
        """Check if Google client secret is set (without decrypting)"""
        return bool(self.google_client_secret_encrypted)

    def has_smtp_password(self):
        """Check if SMTP password is set (without decrypting)"""
        return bool(self.smtp_password_encrypted)

    # SendGrid API Key encryption/decryption
    @property
    def sendgrid_api_key(self):
        """Decrypt and return SendGrid API key"""
        if not self.sendgrid_api_key_encrypted:
            return ''
        try:
            fernet = self._get_fernet()
            return fernet.decrypt(self.sendgrid_api_key_encrypted.encode()).decode()
        except Exception:
            return ''

    @sendgrid_api_key.setter
    def sendgrid_api_key(self, value):
        """Encrypt and store SendGrid API key"""
        if not value:
            self.sendgrid_api_key_encrypted = ''
            return
        try:
            fernet = self._get_fernet()
            self.sendgrid_api_key_encrypted = fernet.encrypt(value.encode()).decode()
        except Exception as e:
            raise ValueError(f"Failed to encrypt SendGrid API key: {str(e)}")

    def has_sendgrid_api_key(self):
        """Check if SendGrid API key is set"""
        return bool(self.sendgrid_api_key_encrypted)

    # AWS Secret Access Key encryption/decryption
    @property
    def aws_secret_access_key(self):
        """Decrypt and return AWS Secret Access Key"""
        if not self.aws_secret_access_key_encrypted:
            return ''
        try:
            fernet = self._get_fernet()
            return fernet.decrypt(self.aws_secret_access_key_encrypted.encode()).decode()
        except Exception:
            return ''

    @aws_secret_access_key.setter
    def aws_secret_access_key(self, value):
        """Encrypt and store AWS Secret Access Key"""
        if not value:
            self.aws_secret_access_key_encrypted = ''
            return
        try:
            fernet = self._get_fernet()
            self.aws_secret_access_key_encrypted = fernet.encrypt(value.encode()).decode()
        except Exception as e:
            raise ValueError(f"Failed to encrypt AWS Secret Access Key: {str(e)}")

    def has_aws_secret_access_key(self):
        """Check if AWS Secret Access Key is set"""
        return bool(self.aws_secret_access_key_encrypted)


# =============================================================================
# EMAIL USAGE LOG (for tracking and rate limiting)
# =============================================================================

class EmailUsageLog(models.Model):
    """
    Tracks email sending for rate limiting and usage monitoring.
    Each record represents emails sent by an organization on a specific date.
    """
    organization = models.ForeignKey(
        'Organization',
        on_delete=models.CASCADE,
        related_name='email_usage_logs',
        null=True,  # Null for platform-level emails
        blank=True
    )
    date = models.DateField(
        help_text="The date for this usage record"
    )
    email_count = models.PositiveIntegerField(
        default=0,
        help_text="Number of emails sent"
    )
    last_email_at = models.DateTimeField(
        auto_now=True,
        help_text="Timestamp of the last email sent"
    )

    class Meta:
        db_table = 'email_usage_logs'
        unique_together = ['organization', 'date']
        indexes = [
            models.Index(fields=['date']),
            models.Index(fields=['organization', 'date']),
        ]

    def __str__(self):
        org_name = self.organization.name if self.organization else 'Platform'
        return f"{org_name} - {self.date}: {self.email_count} emails"

    @classmethod
    def increment_count(cls, organization=None):
        """
        Increment email count for an organization (or platform if None).
        Returns (success: bool, error_message: str or None)
        """
        from django.utils import timezone
        from django.db import transaction

        today = timezone.now().date()

        # Get platform settings for limits
        platform_settings = PlatformSettings.get_settings()

        with transaction.atomic():
            # Get or create today's usage record
            usage, created = cls.objects.select_for_update().get_or_create(
                organization=organization,
                date=today,
                defaults={'email_count': 0}
            )

            # Check organization limit (if organization is specified)
            if organization and platform_settings.email_daily_limit_per_org > 0:
                if usage.email_count >= platform_settings.email_daily_limit_per_org:
                    return False, f"Daily email limit ({platform_settings.email_daily_limit_per_org}) reached for this organization"

            # Check platform-wide limit
            if platform_settings.email_daily_limit_platform > 0:
                total_today = cls.objects.filter(date=today).aggregate(
                    total=models.Sum('email_count')
                )['total'] or 0
                if total_today >= platform_settings.email_daily_limit_platform:
                    return False, f"Platform daily email limit ({platform_settings.email_daily_limit_platform}) reached"

            # Increment count
            usage.email_count += 1
            usage.save()

        return True, None

    @classmethod
    def get_usage_stats(cls, organization=None, days=30):
        """Get email usage statistics for the last N days"""
        from django.utils import timezone
        from django.db.models import Sum
        from datetime import timedelta

        today = timezone.now().date()
        start_date = today - timedelta(days=days)

        queryset = cls.objects.filter(date__gte=start_date)
        if organization:
            queryset = queryset.filter(organization=organization)

        # Daily breakdown
        daily_stats = list(queryset.values('date').annotate(
            total=Sum('email_count')
        ).order_by('date'))

        # Total for period
        total = queryset.aggregate(total=Sum('email_count'))['total'] or 0

        # Today's count
        today_count = queryset.filter(date=today).aggregate(
            total=Sum('email_count')
        )['total'] or 0

        return {
            'total': total,
            'today': today_count,
            'daily': daily_stats,
            'days': days,
        }


# =============================================================================
# EMAIL LOG (for tracking all sent emails with unique IDs)
# =============================================================================

class EmailLog(TenantModel):
    """
    Tracks all emails sent through the application with unique tracking IDs.
    This enables email tracing via Gmail API or other email providers.

    Each email gets a unique tracking_id that is embedded in the email headers
    as X-NexPro-Tracking-ID and can be used to correlate with Gmail messages.
    """
    # Unique tracking identifier
    tracking_id = models.CharField(
        max_length=64,
        unique=True,
        db_index=True,
        help_text="Unique tracking ID for this email (UUID)"
    )

    # Email message identifiers
    message_id = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        db_index=True,
        help_text="SMTP Message-ID header value"
    )
    gmail_message_id = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        db_index=True,
        help_text="Gmail API message ID (for Gmail-sent emails)"
    )
    gmail_thread_id = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text="Gmail thread ID for conversation tracking"
    )

    # Email details
    from_email = models.EmailField(
        help_text="Sender email address"
    )
    to_email = models.EmailField(
        help_text="Primary recipient email address"
    )
    cc_emails = models.TextField(
        blank=True,
        default='',
        help_text="CC recipients (comma-separated)"
    )
    bcc_emails = models.TextField(
        blank=True,
        default='',
        help_text="BCC recipients (comma-separated)"
    )
    subject = models.CharField(
        max_length=500,
        help_text="Email subject"
    )

    # Email type and purpose
    EMAIL_TYPE_CHOICES = [
        ('REMINDER_CLIENT', 'Client Reminder'),
        ('REMINDER_EMPLOYEE', 'Employee Reminder'),
        ('NOTIFICATION', 'Notification'),
        ('OTP', 'OTP/Verification'),
        ('REPORT', 'Report'),
        ('TASK_ASSIGNMENT', 'Task Assignment'),
        ('PASSWORD_RESET', 'Password Reset'),
        ('WELCOME', 'Welcome Email'),
        ('CUSTOM', 'Custom Email'),
        ('OTHER', 'Other'),
    ]
    email_type = models.CharField(
        max_length=30,
        choices=EMAIL_TYPE_CHOICES,
        default='OTHER',
        help_text="Type/purpose of email"
    )

    # Related entities (optional)
    work_instance = models.ForeignKey(
        'WorkInstance',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='email_logs',
        help_text="Related work instance (if applicable)"
    )
    reminder_instance = models.ForeignKey(
        'ReminderInstance',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='email_logs',
        help_text="Related reminder instance (if applicable)"
    )
    client = models.ForeignKey(
        'Client',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='email_logs',
        help_text="Related client (if applicable)"
    )
    user = models.ForeignKey(
        'User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='sent_email_logs',
        help_text="User who triggered the email (if applicable)"
    )

    # Email provider info
    PROVIDER_CHOICES = [
        ('SMTP', 'SMTP'),
        ('SENDGRID', 'SendGrid'),
        ('SES', 'Amazon SES'),
        ('GMAIL_API', 'Gmail API'),
    ]
    provider = models.CharField(
        max_length=20,
        choices=PROVIDER_CHOICES,
        default='SMTP',
        help_text="Email provider used to send"
    )

    # Status tracking
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('SENT', 'Sent'),
        ('DELIVERED', 'Delivered'),
        ('OPENED', 'Opened'),
        ('CLICKED', 'Clicked'),
        ('BOUNCED', 'Bounced'),
        ('FAILED', 'Failed'),
        ('SPAM', 'Marked as Spam'),
    ]
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='PENDING',
        help_text="Email delivery status"
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    sent_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When email was sent"
    )
    delivered_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When email was delivered (if known)"
    )
    opened_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When email was opened (if tracked)"
    )

    # Error tracking
    error_message = models.TextField(
        blank=True,
        default='',
        help_text="Error message if sending failed"
    )
    retry_count = models.PositiveSmallIntegerField(
        default=0,
        help_text="Number of retry attempts"
    )

    # Additional metadata (JSON)
    metadata = models.JSONField(
        default=dict,
        blank=True,
        help_text="Additional metadata (headers, attachments info, etc.)"
    )

    class Meta:
        db_table = 'email_logs'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['tracking_id']),
            models.Index(fields=['message_id']),
            models.Index(fields=['gmail_message_id']),
            models.Index(fields=['to_email']),
            models.Index(fields=['email_type']),
            models.Index(fields=['status']),
            models.Index(fields=['created_at']),
            models.Index(fields=['organization', 'created_at']),
            models.Index(fields=['work_instance']),
        ]

    def __str__(self):
        return f"[{self.tracking_id[:8]}] {self.to_email} - {self.subject[:50]}"

    @classmethod
    def generate_tracking_id(cls):
        """Generate a unique tracking ID for an email"""
        import uuid
        return str(uuid.uuid4()).replace('-', '')

    @classmethod
    def create_log(cls, organization, from_email, to_email, subject,
                   email_type='OTHER', provider='SMTP', **kwargs):
        """
        Create an email log entry with auto-generated tracking ID.
        Returns the EmailLog instance.
        """
        tracking_id = cls.generate_tracking_id()

        return cls.objects.create(
            organization=organization,
            tracking_id=tracking_id,
            from_email=from_email,
            to_email=to_email,
            subject=subject,
            email_type=email_type,
            provider=provider,
            **kwargs
        )

    def mark_sent(self, message_id=None, gmail_message_id=None, gmail_thread_id=None):
        """Mark email as sent with optional message IDs"""
        from django.utils import timezone

        self.status = 'SENT'
        self.sent_at = timezone.now()

        if message_id:
            self.message_id = message_id
        if gmail_message_id:
            self.gmail_message_id = gmail_message_id
        if gmail_thread_id:
            self.gmail_thread_id = gmail_thread_id

        self.save()

    def mark_failed(self, error_message):
        """Mark email as failed with error message"""
        self.status = 'FAILED'
        self.error_message = error_message
        self.retry_count += 1
        self.save()

    def update_gmail_ids(self, gmail_message_id, gmail_thread_id=None):
        """Update Gmail IDs after successful send via Gmail API"""
        self.gmail_message_id = gmail_message_id
        if gmail_thread_id:
            self.gmail_thread_id = gmail_thread_id
        self.save(update_fields=['gmail_message_id', 'gmail_thread_id'])


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

    # Google Sync Settings per Plan
    SYNC_FREQUENCY_CHOICES = [
        (0, 'Disabled'),
        (15, 'Every 15 minutes'),
        (30, 'Every 30 minutes'),
        (60, 'Every hour'),
        (120, 'Every 2 hours'),
        (360, 'Every 6 hours'),
        (720, 'Every 12 hours'),
        (1440, 'Once daily'),
        (-1, 'Manual only'),
    ]
    google_sync_enabled = models.BooleanField(
        default=False,
        help_text="Whether Google Sync is available for this plan"
    )
    google_sync_frequency_minutes = models.IntegerField(
        choices=SYNC_FREQUENCY_CHOICES,
        default=-1,
        help_text="Minimum interval between automatic syncs (-1 = manual only, 0 = disabled)"
    )
    google_tasks_enabled = models.BooleanField(
        default=False,
        help_text="Google Tasks sync available"
    )
    google_calendar_enabled = models.BooleanField(
        default=False,
        help_text="Google Calendar sync available"
    )
    google_drive_enabled = models.BooleanField(
        default=False,
        help_text="Google Drive sync available"
    )
    google_gmail_enabled = models.BooleanField(
        default=False,
        help_text="Gmail integration available"
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


# =============================================================================
# GOOGLE SYNC HUB MODELS
# =============================================================================

class GoogleConnection(TenantModel):
    """
    Stores Google OAuth credentials for users.
    Each user can connect their Google account for sync features.
    """
    CONNECTION_STATUS_CHOICES = [
        ('CONNECTED', 'Connected'),
        ('DISCONNECTED', 'Disconnected'),
        ('EXPIRED', 'Token Expired'),
        ('ERROR', 'Error'),
    ]

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='google_connection'
    )

    # OAuth tokens (encrypted)
    access_token = models.TextField(
        blank=True,
        null=True,
        help_text="Encrypted Google OAuth access token"
    )
    refresh_token = models.TextField(
        blank=True,
        null=True,
        help_text="Encrypted Google OAuth refresh token"
    )
    token_expiry = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When the access token expires"
    )

    # Google account info
    google_email = models.EmailField(
        blank=True,
        null=True,
        help_text="Connected Google account email"
    )
    google_user_id = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="Google user ID"
    )

    # Connection status
    status = models.CharField(
        max_length=20,
        choices=CONNECTION_STATUS_CHOICES,
        default='DISCONNECTED'
    )

    # Enabled services
    tasks_enabled = models.BooleanField(
        default=False,
        help_text="Google Tasks sync enabled"
    )
    calendar_enabled = models.BooleanField(
        default=False,
        help_text="Google Calendar sync enabled"
    )
    drive_enabled = models.BooleanField(
        default=False,
        help_text="Google Drive sync enabled"
    )
    gmail_enabled = models.BooleanField(
        default=False,
        help_text="Gmail integration enabled"
    )

    # Google resource IDs
    tasks_list_id = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="Default Google Tasks list ID for syncing"
    )
    calendar_id = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="Default Google Calendar ID for syncing"
    )
    drive_folder_id = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="Root Google Drive folder ID for NexPro files"
    )

    # Timestamps
    connected_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When the connection was established"
    )
    last_sync_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Last successful sync timestamp"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'google_connections'
        indexes = [
            models.Index(fields=['organization', 'status']),
            models.Index(fields=['user', 'status']),
        ]

    def __str__(self):
        return f"Google Connection: {self.user.email} ({self.status})"

    def encrypt_token(self, token, token_type='access'):
        """Encrypt OAuth token using organization's Fernet key"""
        key = self._get_encryption_key()
        fernet = Fernet(key.encode())
        encrypted = fernet.encrypt(token.encode()).decode()
        if token_type == 'access':
            self.access_token = encrypted
        else:
            self.refresh_token = encrypted

    def decrypt_token(self, token_type='access'):
        """Decrypt OAuth token"""
        key = self._get_encryption_key()
        fernet = Fernet(key.encode())
        token = self.access_token if token_type == 'access' else self.refresh_token
        if not token:
            return None
        return fernet.decrypt(token.encode()).decode()

    def _get_encryption_key(self):
        """Get encryption key - prefer organization's key, fallback to global"""
        if self.organization and self.organization.encryption_key:
            return self.organization.encryption_key
        if settings.FERNET_KEY:
            return settings.FERNET_KEY
        raise ValueError("No encryption key configured")


class GoogleSyncSettings(TenantModel):
    """
    Organization-level settings for Google Sync.
    Admins configure sync behavior and reminder settings here.
    """
    REMINDER_TIME_CHOICES = [
        (0, 'At due time'),
        (5, '5 minutes before'),
        (10, '10 minutes before'),
        (15, '15 minutes before'),
        (30, '30 minutes before'),
        (60, '1 hour before'),
        (120, '2 hours before'),
        (1440, '1 day before'),
        (2880, '2 days before'),
        (10080, '1 week before'),
    ]

    SYNC_FREQUENCY_CHOICES = [
        ('REALTIME', 'Real-time (on task changes)'),
        ('HOURLY', 'Every hour'),
        ('DAILY', 'Once daily'),
        ('MANUAL', 'Manual sync only'),
    ]

    # One settings per organization
    # (organization field from TenantModel)

    # Task sync settings
    sync_tasks_to_google = models.BooleanField(
        default=True,
        help_text="Sync NexPro tasks to Google Tasks"
    )
    sync_google_to_tasks = models.BooleanField(
        default=True,
        help_text="Sync Google Tasks changes back to NexPro (two-way sync)"
    )
    task_sync_frequency = models.CharField(
        max_length=20,
        choices=SYNC_FREQUENCY_CHOICES,
        default='REALTIME',
        help_text="How often to sync tasks"
    )

    # Calendar sync settings
    sync_tasks_to_calendar = models.BooleanField(
        default=True,
        help_text="Create Google Calendar events for tasks"
    )
    sync_calendar_to_tasks = models.BooleanField(
        default=False,
        help_text="Sync Calendar event changes back to NexPro"
    )
    calendar_sync_frequency = models.CharField(
        max_length=20,
        choices=SYNC_FREQUENCY_CHOICES,
        default='REALTIME',
        help_text="How often to sync calendar"
    )

    # Reminder settings (stored as JSON for flexibility)
    # Default reminders when creating calendar events
    calendar_reminder_1 = models.IntegerField(
        choices=REMINDER_TIME_CHOICES,
        default=1440,  # 1 day before
        help_text="First reminder time (minutes before due)"
    )
    calendar_reminder_2 = models.IntegerField(
        choices=REMINDER_TIME_CHOICES,
        default=60,  # 1 hour before
        help_text="Second reminder time (minutes before due)"
    )
    calendar_reminder_3 = models.IntegerField(
        choices=REMINDER_TIME_CHOICES,
        null=True,
        blank=True,
        help_text="Third reminder time (optional)"
    )

    # Reminder notification methods
    reminder_method_popup = models.BooleanField(
        default=True,
        help_text="Show popup reminders"
    )
    reminder_method_email = models.BooleanField(
        default=True,
        help_text="Send email reminders"
    )

    # Filter settings - what to sync
    sync_only_assigned_tasks = models.BooleanField(
        default=True,
        help_text="Only sync tasks assigned to the connected user"
    )
    sync_high_priority_only = models.BooleanField(
        default=False,
        help_text="Only sync high priority tasks"
    )
    sync_work_types = models.ManyToManyField(
        'WorkType',
        blank=True,
        related_name='google_sync_settings',
        help_text="Sync only these task categories (empty = all)"
    )

    # Drive settings
    auto_create_client_folders = models.BooleanField(
        default=True,
        help_text="Automatically create Google Drive folders for new clients"
    )
    drive_folder_structure = models.CharField(
        max_length=500,
        default='NexPro/{client_name}/{year}',
        help_text="Folder structure template: {client_name}, {year}, {work_type}"
    )
    auto_upload_attachments = models.BooleanField(
        default=False,
        help_text="Auto-upload task attachments to Google Drive"
    )
    auto_save_reports = models.BooleanField(
        default=False,
        help_text="Auto-save generated reports to Google Drive"
    )

    # Gmail settings
    send_notifications_via_gmail = models.BooleanField(
        default=False,
        help_text="Send task notifications via connected Gmail"
    )
    create_tasks_from_starred_emails = models.BooleanField(
        default=False,
        help_text="Create NexPro tasks from starred Gmail messages"
    )
    gmail_task_label = models.CharField(
        max_length=100,
        default='NexPro-Task',
        help_text="Gmail label to watch for task creation"
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'google_sync_settings'
        verbose_name = 'Google Sync Settings'
        verbose_name_plural = 'Google Sync Settings'

    def __str__(self):
        org_name = self.organization.name if self.organization else 'No Org'
        return f"Google Sync Settings - {org_name}"

    def get_reminder_minutes_list(self):
        """Return list of reminder times in minutes"""
        reminders = [self.calendar_reminder_1, self.calendar_reminder_2]
        if self.calendar_reminder_3:
            reminders.append(self.calendar_reminder_3)
        return [r for r in reminders if r is not None]


class GoogleSyncLog(TenantModel):
    """
    Log of all Google sync operations for debugging and audit.
    """
    SYNC_TYPE_CHOICES = [
        ('TASK_TO_GOOGLE', 'Task synced to Google Tasks'),
        ('TASK_FROM_GOOGLE', 'Task synced from Google Tasks'),
        ('CALENDAR_TO_GOOGLE', 'Event synced to Google Calendar'),
        ('CALENDAR_FROM_GOOGLE', 'Event synced from Google Calendar'),
        ('DRIVE_UPLOAD', 'File uploaded to Google Drive'),
        ('DRIVE_FOLDER_CREATE', 'Folder created in Google Drive'),
        ('GMAIL_SEND', 'Email sent via Gmail'),
        ('GMAIL_TASK_CREATE', 'Task created from Gmail'),
    ]

    STATUS_CHOICES = [
        ('SUCCESS', 'Success'),
        ('FAILED', 'Failed'),
        ('PENDING', 'Pending'),
        ('SKIPPED', 'Skipped'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='google_sync_logs'
    )
    sync_type = models.CharField(
        max_length=30,
        choices=SYNC_TYPE_CHOICES
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='PENDING'
    )

    # Related objects
    work_instance = models.ForeignKey(
        'WorkInstance',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='google_sync_logs'
    )

    # Google resource IDs
    google_task_id = models.CharField(
        max_length=255,
        blank=True,
        null=True
    )
    google_event_id = models.CharField(
        max_length=255,
        blank=True,
        null=True
    )
    google_file_id = models.CharField(
        max_length=255,
        blank=True,
        null=True
    )
    google_message_id = models.CharField(
        max_length=255,
        blank=True,
        null=True
    )

    # Details
    details = models.TextField(
        blank=True,
        null=True,
        help_text="Sync operation details"
    )
    error_message = models.TextField(
        blank=True,
        null=True,
        help_text="Error message if sync failed"
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'google_sync_logs'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['organization', 'sync_type', '-created_at']),
            models.Index(fields=['user', 'status']),
            models.Index(fields=['work_instance']),
        ]

    def __str__(self):
        return f"{self.get_sync_type_display()} - {self.status} ({self.created_at})"


class GoogleTaskMapping(TenantModel):
    """
    Maps NexPro WorkInstance to Google Task for two-way sync.
    """
    work_instance = models.OneToOneField(
        'WorkInstance',
        on_delete=models.CASCADE,
        related_name='google_task_mapping'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='google_task_mappings'
    )

    # Google Task identifiers
    google_task_id = models.CharField(
        max_length=255,
        help_text="Google Task ID"
    )
    google_tasklist_id = models.CharField(
        max_length=255,
        help_text="Google Task List ID"
    )

    # Sync tracking
    last_synced_at = models.DateTimeField(auto_now=True)
    nexpro_updated_at = models.DateTimeField(
        help_text="Last update time in NexPro (for conflict detection)"
    )
    google_updated_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Last update time in Google (for conflict detection)"
    )

    class Meta:
        db_table = 'google_task_mappings'
        indexes = [
            models.Index(fields=['google_task_id', 'google_tasklist_id']),
            models.Index(fields=['user', 'work_instance']),
        ]

    def __str__(self):
        return f"TaskMapping: {self.work_instance} <-> {self.google_task_id}"


class GoogleCalendarMapping(TenantModel):
    """
    Maps NexPro WorkInstance to Google Calendar Event for two-way sync.
    """
    work_instance = models.OneToOneField(
        'WorkInstance',
        on_delete=models.CASCADE,
        related_name='google_calendar_mapping'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='google_calendar_mappings'
    )

    # Google Calendar identifiers
    google_event_id = models.CharField(
        max_length=255,
        help_text="Google Calendar Event ID"
    )
    google_calendar_id = models.CharField(
        max_length=255,
        help_text="Google Calendar ID"
    )

    # Sync tracking
    last_synced_at = models.DateTimeField(auto_now=True)
    nexpro_updated_at = models.DateTimeField(
        help_text="Last update time in NexPro"
    )
    google_updated_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Last update time in Google"
    )

    class Meta:
        db_table = 'google_calendar_mappings'
        indexes = [
            models.Index(fields=['google_event_id', 'google_calendar_id']),
            models.Index(fields=['user', 'work_instance']),
        ]

    def __str__(self):
        return f"CalendarMapping: {self.work_instance} <-> {self.google_event_id}"


class GoogleDriveMapping(TenantModel):
    """
    Maps NexPro clients/folders to Google Drive folders.
    """
    # What this folder is for
    FOLDER_TYPE_CHOICES = [
        ('CLIENT', 'Client Folder'),
        ('WORK_TYPE', 'Task Category Folder'),
        ('YEAR', 'Year Folder'),
        ('TASK', 'Task Folder'),
    ]

    folder_type = models.CharField(
        max_length=20,
        choices=FOLDER_TYPE_CHOICES
    )

    # Related NexPro objects (one of these should be set)
    client = models.ForeignKey(
        'Client',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='google_drive_folders'
    )
    work_type = models.ForeignKey(
        'WorkType',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='google_drive_folders'
    )
    work_instance = models.ForeignKey(
        'WorkInstance',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='google_drive_folders'
    )

    # Year for year folders
    year = models.IntegerField(
        null=True,
        blank=True
    )

    # Google Drive identifiers
    google_folder_id = models.CharField(
        max_length=255,
        help_text="Google Drive Folder ID"
    )
    google_folder_name = models.CharField(
        max_length=255,
        help_text="Folder name in Google Drive"
    )
    parent_folder_id = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="Parent folder ID in Google Drive"
    )

    # Shared with users
    shared_with_users = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        blank=True,
        related_name='shared_google_folders'
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'google_drive_mappings'
        indexes = [
            models.Index(fields=['organization', 'folder_type']),
            models.Index(fields=['client']),
            models.Index(fields=['google_folder_id']),
        ]

    def __str__(self):
        return f"DriveFolder: {self.google_folder_name} ({self.folder_type})"


# =============================================================================
# GOOGLE API QUOTA TRACKING
# =============================================================================

class GoogleAPIQuotaUsage(models.Model):
    """
    Tracks daily Google API usage across the platform.
    Aggregates usage for quota monitoring and capacity planning.
    """
    API_TYPE_CHOICES = [
        ('TASKS', 'Google Tasks'),
        ('CALENDAR', 'Google Calendar'),
        ('DRIVE', 'Google Drive'),
        ('GMAIL', 'Gmail'),
    ]

    date = models.DateField(
        help_text="Date of usage tracking"
    )
    api_type = models.CharField(
        max_length=20,
        choices=API_TYPE_CHOICES,
        help_text="Which Google API"
    )

    # Usage counts
    queries_count = models.PositiveIntegerField(
        default=0,
        help_text="Number of API queries made"
    )
    quota_units_used = models.PositiveIntegerField(
        default=0,
        help_text="Quota units consumed (for Gmail)"
    )

    # Breakdown by operation type
    read_operations = models.PositiveIntegerField(
        default=0,
        help_text="Read/Get operations"
    )
    write_operations = models.PositiveIntegerField(
        default=0,
        help_text="Create/Update operations"
    )
    delete_operations = models.PositiveIntegerField(
        default=0,
        help_text="Delete operations"
    )

    # Stats
    unique_users = models.PositiveIntegerField(
        default=0,
        help_text="Number of unique users making requests"
    )
    unique_organizations = models.PositiveIntegerField(
        default=0,
        help_text="Number of unique organizations making requests"
    )

    # Error tracking
    failed_requests = models.PositiveIntegerField(
        default=0,
        help_text="Number of failed API requests"
    )
    rate_limit_hits = models.PositiveIntegerField(
        default=0,
        help_text="Number of rate limit errors encountered"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'google_api_quota_usage'
        unique_together = ['date', 'api_type']
        ordering = ['-date', 'api_type']
        indexes = [
            models.Index(fields=['date']),
            models.Index(fields=['api_type']),
        ]

    def __str__(self):
        return f"{self.api_type} Usage on {self.date}: {self.queries_count} queries"

    @classmethod
    def get_or_create_today(cls, api_type):
        """Get or create today's usage record for an API type"""
        from django.utils import timezone
        today = timezone.now().date()
        usage, _ = cls.objects.get_or_create(
            date=today,
            api_type=api_type,
            defaults={
                'queries_count': 0,
                'quota_units_used': 0,
            }
        )
        return usage

    @classmethod
    def increment_usage(cls, api_type, queries=1, quota_units=0,
                       operation_type='read', user=None, organization=None,
                       failed=False, rate_limited=False):
        """
        Increment usage counters for an API type.
        Thread-safe using F() expressions.
        """
        from django.db.models import F
        from django.utils import timezone

        today = timezone.now().date()

        # Get or create today's record
        usage, created = cls.objects.get_or_create(
            date=today,
            api_type=api_type,
            defaults={
                'queries_count': 0,
                'quota_units_used': 0,
            }
        )

        # Update counters using F() for thread safety
        update_fields = {
            'queries_count': F('queries_count') + queries,
            'quota_units_used': F('quota_units_used') + quota_units,
        }

        if operation_type == 'read':
            update_fields['read_operations'] = F('read_operations') + queries
        elif operation_type == 'write':
            update_fields['write_operations'] = F('write_operations') + queries
        elif operation_type == 'delete':
            update_fields['delete_operations'] = F('delete_operations') + queries

        if failed:
            update_fields['failed_requests'] = F('failed_requests') + 1
        if rate_limited:
            update_fields['rate_limit_hits'] = F('rate_limit_hits') + 1

        cls.objects.filter(pk=usage.pk).update(**update_fields)

        # Update unique users/orgs (this is approximate for performance)
        # A more accurate count would require a separate tracking table

        return usage

    @classmethod
    def get_usage_percentage(cls, api_type):
        """Get current usage as percentage of quota limit"""
        from django.utils import timezone
        today = timezone.now().date()

        try:
            usage = cls.objects.get(date=today, api_type=api_type)
            platform_settings = PlatformSettings.get_settings()

            quota_map = {
                'TASKS': platform_settings.google_tasks_daily_quota,
                'CALENDAR': platform_settings.google_calendar_daily_quota,
                'DRIVE': platform_settings.google_drive_daily_quota,
                'GMAIL': platform_settings.google_gmail_daily_quota,
            }

            quota_limit = quota_map.get(api_type, 0)
            if quota_limit == 0:
                return 0

            return round((usage.queries_count / quota_limit) * 100, 2)
        except cls.DoesNotExist:
            return 0

    @classmethod
    def get_daily_summary(cls, date=None):
        """Get summary of all API usage for a date"""
        from django.utils import timezone
        if date is None:
            date = timezone.now().date()

        platform_settings = PlatformSettings.get_settings()

        summary = {
            'date': date.isoformat(),
            'apis': {}
        }

        quota_map = {
            'TASKS': platform_settings.google_tasks_daily_quota,
            'CALENDAR': platform_settings.google_calendar_daily_quota,
            'DRIVE': platform_settings.google_drive_daily_quota,
            'GMAIL': platform_settings.google_gmail_daily_quota,
        }

        for api_type, _ in cls.API_TYPE_CHOICES:
            try:
                usage = cls.objects.get(date=date, api_type=api_type)
                quota_limit = quota_map.get(api_type, 0)
                percentage = round((usage.queries_count / quota_limit) * 100, 2) if quota_limit > 0 else 0

                summary['apis'][api_type] = {
                    'queries': usage.queries_count,
                    'quota_limit': quota_limit,
                    'percentage': percentage,
                    'quota_units': usage.quota_units_used,
                    'read_ops': usage.read_operations,
                    'write_ops': usage.write_operations,
                    'delete_ops': usage.delete_operations,
                    'failed': usage.failed_requests,
                    'rate_limits': usage.rate_limit_hits,
                    'status': 'critical' if percentage >= platform_settings.quota_critical_threshold
                             else 'warning' if percentage >= platform_settings.quota_warning_threshold
                             else 'normal'
                }
            except cls.DoesNotExist:
                summary['apis'][api_type] = {
                    'queries': 0,
                    'quota_limit': quota_map.get(api_type, 0),
                    'percentage': 0,
                    'status': 'normal'
                }

        return summary
