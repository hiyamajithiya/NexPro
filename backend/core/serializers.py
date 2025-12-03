from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import get_user_model
from .models import (
    Organization, OrganizationEmail, Subscription,
    Client, WorkType, WorkTypeAssignment, ClientWorkMapping, WorkInstance,
    EmailTemplate, ReminderRule, ReminderInstance, Notification, TaskDocument,
    ReportConfiguration, PlatformSettings, SubscriptionPlan, CredentialVault
)
from .services.plan_service import PlanService

User = get_user_model()


# =============================================================================
# ORGANIZATION & SUBSCRIPTION SERIALIZERS
# =============================================================================

class OrganizationSerializer(serializers.ModelSerializer):
    """Serializer for Organization model"""
    user_count = serializers.ReadOnlyField()
    client_count = serializers.ReadOnlyField()
    is_active = serializers.ReadOnlyField()

    class Meta:
        model = Organization
        fields = [
            'id', 'name', 'slug', 'subdomain', 'email', 'phone',
            'address', 'city', 'state', 'country', 'pincode',
            'logo', 'primary_color', 'plan', 'status', 'trial_ends_at',
            'max_users', 'max_clients', 'firm_name', 'default_from_email',
            'gstin', 'pan', 'user_count', 'client_count', 'is_active',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'slug', 'plan', 'status', 'trial_ends_at',
            'max_users', 'max_clients', 'encryption_key',
            'created_at', 'updated_at'
        ]


class OrganizationMinimalSerializer(serializers.ModelSerializer):
    """Minimal serializer for embedding organization in other responses"""

    class Meta:
        model = Organization
        fields = ['id', 'name', 'slug', 'firm_name', 'logo', 'plan', 'status']


class SubscriptionSerializer(serializers.ModelSerializer):
    """Serializer for Subscription model"""
    organization_name = serializers.CharField(source='organization.name', read_only=True)

    class Meta:
        model = Subscription
        fields = '__all__'
        read_only_fields = ['organization', 'created_at', 'updated_at']


class OrganizationEmailSerializer(serializers.ModelSerializer):
    """Serializer for OrganizationEmail model - multiple email addresses per organization"""
    work_types_count = serializers.SerializerMethodField()

    class Meta:
        model = OrganizationEmail
        fields = [
            'id', 'email_address', 'display_name',
            'use_custom_smtp', 'smtp_host', 'smtp_port', 'smtp_username',
            'smtp_use_tls', 'is_active', 'is_default',
            'work_types_count', 'created_at', 'updated_at'
        ]
        read_only_fields = ['organization', 'created_at', 'updated_at']
        extra_kwargs = {
            'smtp_password': {'write_only': True, 'required': False},
        }

    def get_work_types_count(self, obj):
        """Count of work types using this email"""
        return obj.work_types.count()

    def create(self, validated_data):
        request = self.context.get('request')
        if request and hasattr(request, 'organization'):
            validated_data['organization'] = request.organization
        return super().create(validated_data)


class OrganizationEmailWriteSerializer(OrganizationEmailSerializer):
    """Write serializer that includes smtp_password"""
    smtp_password = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta(OrganizationEmailSerializer.Meta):
        fields = OrganizationEmailSerializer.Meta.fields + ['smtp_password']


class OrganizationRegistrationSerializer(serializers.Serializer):
    """Serializer for new organization registration"""
    # Organization fields
    organization_name = serializers.CharField(max_length=255)
    organization_email = serializers.EmailField()
    organization_phone = serializers.CharField(max_length=20, required=False, allow_blank=True)

    # Admin user fields
    admin_email = serializers.EmailField()
    admin_password = serializers.CharField(write_only=True, min_length=8)
    admin_first_name = serializers.CharField(max_length=150)
    admin_last_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    admin_mobile = serializers.CharField(max_length=15, required=False, allow_blank=True)

    def validate_organization_email(self, value):
        """Check if organization email is unique"""
        if Organization.objects.filter(email=value).exists():
            raise serializers.ValidationError("An organization with this email already exists.")
        return value

    def validate_admin_email(self, value):
        """Check if admin email is unique"""
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value

    def create(self, validated_data):
        """Create organization and admin user"""
        # Create organization
        organization = Organization.objects.create(
            name=validated_data['organization_name'],
            email=validated_data['organization_email'],
            phone=validated_data.get('organization_phone', ''),
        )

        # Set up trial
        PlanService.setup_trial(organization)

        # Create admin user
        user = User.objects.create(
            username=validated_data['admin_email'],
            email=validated_data['admin_email'],
            first_name=validated_data['admin_first_name'],
            last_name=validated_data.get('admin_last_name', ''),
            mobile=validated_data.get('admin_mobile', ''),
            organization=organization,
            role='ADMIN',
        )
        user.set_password(validated_data['admin_password'])
        user.save()

        return {
            'organization': organization,
            'user': user,
        }


# =============================================================================
# AUTHENTICATION SERIALIZERS
# =============================================================================

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Custom JWT serializer that includes user and organization data in response"""

    def validate(self, attrs):
        data = super().validate(attrs)

        # Add user info to response
        data['user_id'] = self.user.id
        data['username'] = self.user.username
        data['email'] = self.user.email
        data['role'] = self.user.role
        data['first_name'] = self.user.first_name
        data['last_name'] = self.user.last_name
        data['is_platform_admin'] = self.user.is_platform_admin

        # Add organization info to response
        if self.user.organization:
            org = self.user.organization
            data['organization'] = {
                'id': str(org.id),
                'name': org.name,
                'slug': org.slug,
                'firm_name': org.firm_name,
                'plan': org.plan,
                'status': org.status,
                'logo': org.logo.url if org.logo else None,
                'primary_color': org.primary_color,
            }
        else:
            data['organization'] = None

        return data


# =============================================================================
# USER SERIALIZERS
# =============================================================================

class UserSerializer(serializers.ModelSerializer):
    """Serializer for User model"""
    password = serializers.CharField(write_only=True, required=False)
    organization_name = serializers.CharField(source='organization.name', read_only=True)
    assigned_work_types = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'role', 'mobile', 'password', 'is_active',
            'organization', 'organization_name', 'is_platform_admin',
            'assigned_work_types',
            # Employee details
            'pan', 'aadhar', 'salary', 'joining_date',
            # Notification preferences
            'notify_email_reminders', 'notify_task_assignments',
            'notify_overdue_alerts', 'notify_weekly_reports'
        ]
        extra_kwargs = {
            'password': {'write_only': True},
            'username': {'read_only': True},
            'organization': {'read_only': True},
            'is_platform_admin': {'read_only': True},
        }

    def get_assigned_work_types(self, obj):
        """Get list of work types assigned to this user"""
        assignments = obj.work_type_assignments.filter(is_active=True).select_related('work_type')
        return [
            {
                'id': a.id,
                'work_type_id': a.work_type.id,
                'work_type_name': a.work_type.work_name,
                'statutory_form': a.work_type.statutory_form,
            }
            for a in assignments
        ]

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        # Set username as email
        email = validated_data.get('email', '')
        validated_data['username'] = email

        # Get organization from context (set by view)
        request = self.context.get('request')
        if request and hasattr(request, 'organization'):
            validated_data['organization'] = request.organization

        user = User.objects.create(**validated_data)
        if password:
            user.set_password(password)
            user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        # If email is being updated, also update username
        if 'email' in validated_data:
            validated_data['username'] = validated_data['email']
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance


# =============================================================================
# TENANT-SCOPED MODEL SERIALIZERS
# =============================================================================

class TenantModelSerializer(serializers.ModelSerializer):
    """
    Base serializer for tenant-scoped models.
    Automatically sets organization from request context.
    """

    def create(self, validated_data):
        request = self.context.get('request')
        if request and hasattr(request, 'organization'):
            validated_data['organization'] = request.organization
        return super().create(validated_data)


class ClientSerializer(TenantModelSerializer):
    """Serializer for Client model"""
    work_count = serializers.SerializerMethodField()

    class Meta:
        model = Client
        fields = '__all__'
        read_only_fields = ['organization']

    def get_work_count(self, obj):
        return obj.work_mappings.filter(active=True).count()


class WorkTypeSerializer(TenantModelSerializer):
    """Serializer for WorkType model"""
    period_info = serializers.SerializerMethodField()
    sender_email_display = serializers.CharField(source='sender_email.email_address', read_only=True)
    sender_email_name = serializers.CharField(source='sender_email.display_name', read_only=True)

    class Meta:
        model = WorkType
        fields = '__all__'
        read_only_fields = ['organization']

    def get_period_info(self, obj):
        """Get current period information for this work type"""
        try:
            period_dates = obj.get_period_dates()
            return {
                'period_start': period_dates['period_start'].isoformat(),
                'period_end': period_dates['period_end'].isoformat(),
                'due_date': period_dates['due_date'].isoformat(),
                'client_reminder_start': period_dates['client_reminder_start'].isoformat(),
                'client_reminder_end': period_dates['client_reminder_end'].isoformat(),
                'employee_reminder_start': period_dates['employee_reminder_start'].isoformat(),
                'employee_reminder_end': period_dates['employee_reminder_end'].isoformat(),
            }
        except Exception:
            return None


class WorkTypeAssignmentSerializer(TenantModelSerializer):
    """Serializer for WorkType to Employee assignment"""
    work_type_name = serializers.CharField(source='work_type.work_name', read_only=True)
    statutory_form = serializers.CharField(source='work_type.statutory_form', read_only=True)
    employee_name = serializers.SerializerMethodField()
    employee_email = serializers.CharField(source='employee.email', read_only=True)
    assigned_by_name = serializers.SerializerMethodField()

    class Meta:
        model = WorkTypeAssignment
        fields = [
            'id', 'work_type', 'work_type_name', 'statutory_form',
            'employee', 'employee_name', 'employee_email',
            'is_active', 'assigned_at', 'assigned_by', 'assigned_by_name', 'notes'
        ]
        read_only_fields = ['organization', 'assigned_at', 'assigned_by']

    def get_employee_name(self, obj):
        return obj.employee.get_full_name() or obj.employee.email

    def get_assigned_by_name(self, obj):
        if obj.assigned_by:
            return obj.assigned_by.get_full_name() or obj.assigned_by.email
        return None

    def create(self, validated_data):
        request = self.context.get('request')
        if request:
            validated_data['assigned_by'] = request.user
        return super().create(validated_data)


class ClientWorkMappingSerializer(TenantModelSerializer):
    """Serializer for ClientWorkMapping model"""
    client_name = serializers.CharField(source='client.client_name', read_only=True)
    work_type_name = serializers.CharField(source='work_type.work_name', read_only=True)
    effective_frequency = serializers.ReadOnlyField()

    class Meta:
        model = ClientWorkMapping
        fields = '__all__'
        read_only_fields = ['organization']


class WorkInstanceSerializer(TenantModelSerializer):
    """Serializer for WorkInstance model"""
    client_name = serializers.CharField(source='client_work.client.client_name', read_only=True)
    client_code = serializers.CharField(source='client_work.client.client_code', read_only=True)
    client_id = serializers.IntegerField(source='client_work.client.id', read_only=True)
    work_type_name = serializers.CharField(source='client_work.work_type.work_name', read_only=True)
    work_type_id = serializers.IntegerField(source='client_work.work_type.id', read_only=True)
    statutory_form = serializers.CharField(source='client_work.work_type.statutory_form', read_only=True)
    assigned_to_name = serializers.CharField(source='assigned_to.get_full_name', read_only=True)

    # Time tracking computed fields
    current_time_spent = serializers.SerializerMethodField()
    formatted_time_spent = serializers.SerializerMethodField()

    # Document count for attachment indicator
    document_count = serializers.SerializerMethodField()

    class Meta:
        model = WorkInstance
        fields = '__all__'
        read_only_fields = ['organization', 'timer_started_at', 'total_time_spent', 'is_timer_running']
        extra_kwargs = {
            # Make client_work not required for updates (it's only set on create)
            'client_work': {'required': False},
            'period_label': {'required': False},
        }

    def get_current_time_spent(self, obj):
        """Get total time spent including current running session in seconds"""
        return obj.get_current_time_spent()

    def get_formatted_time_spent(self, obj):
        """Get formatted time spent as HH:MM:SS"""
        return obj.format_time_spent()

    def get_document_count(self, obj):
        """Get the count of documents attached to this work instance"""
        return obj.documents.count()


class EmailTemplateSerializer(TenantModelSerializer):
    """Serializer for EmailTemplate model"""
    work_type_name = serializers.CharField(source='work_type.work_name', read_only=True)

    class Meta:
        model = EmailTemplate
        fields = '__all__'
        read_only_fields = ['organization']


class ReminderRuleSerializer(TenantModelSerializer):
    """Serializer for ReminderRule model"""
    work_type_name = serializers.CharField(source='work_type.work_name', read_only=True)
    email_template_name = serializers.CharField(source='email_template.template_name', read_only=True)

    class Meta:
        model = ReminderRule
        fields = '__all__'
        read_only_fields = ['organization']


class ReminderInstanceSerializer(TenantModelSerializer):
    """Serializer for ReminderInstance model"""
    client_name = serializers.CharField(source='work_instance.client_work.client.client_name', read_only=True)
    work_type_name = serializers.CharField(source='work_instance.client_work.work_type.work_name', read_only=True)
    period_label = serializers.CharField(source='work_instance.period_label', read_only=True)

    class Meta:
        model = ReminderInstance
        fields = '__all__'
        read_only_fields = ['organization']


class NotificationSerializer(TenantModelSerializer):
    """Serializer for Notification model"""
    work_instance_details = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = '__all__'
        read_only_fields = ['organization', 'user', 'created_at']

    def get_work_instance_details(self, obj):
        if obj.work_instance:
            return {
                'id': obj.work_instance.id,
                'client_name': obj.work_instance.client_work.client.client_name,
                'work_type': obj.work_instance.client_work.work_type.work_name,
                'period': obj.work_instance.period_label,
                'due_date': obj.work_instance.due_date.isoformat(),
                'status': obj.work_instance.status,
            }
        return None


class TaskDocumentSerializer(TenantModelSerializer):
    """Serializer for TaskDocument model"""
    uploaded_by_name = serializers.SerializerMethodField()
    download_url = serializers.SerializerMethodField()

    class Meta:
        model = TaskDocument
        fields = [
            'id', 'work_instance', 'file', 'file_name', 'file_size',
            'file_type', 'description', 'uploaded_by', 'uploaded_by_name',
            'uploaded_at', 'download_url'
        ]
        read_only_fields = ['organization', 'uploaded_by', 'uploaded_at', 'file_name', 'file_size', 'file_type']

    def get_uploaded_by_name(self, obj):
        if obj.uploaded_by:
            return obj.uploaded_by.get_full_name() or obj.uploaded_by.email
        return None

    def get_download_url(self, obj):
        request = self.context.get('request')
        if obj.file and request:
            return request.build_absolute_uri(obj.file.url)
        return None

    def create(self, validated_data):
        request = self.context.get('request')
        if request:
            validated_data['uploaded_by'] = request.user
            if hasattr(request, 'organization'):
                validated_data['organization'] = request.organization

        # Extract file info from uploaded file
        file = validated_data.get('file')
        if file:
            validated_data['file_name'] = file.name
            validated_data['file_size'] = file.size
            validated_data['file_type'] = file.content_type

        return super().create(validated_data)


class ReportConfigurationSerializer(TenantModelSerializer):
    """Serializer for ReportConfiguration model"""
    organization_name = serializers.CharField(source='organization.name', read_only=True)
    frequency_display = serializers.CharField(source='get_frequency_display', read_only=True)
    report_period_display = serializers.CharField(source='get_report_period_display', read_only=True)
    day_of_week_display = serializers.CharField(source='get_day_of_week_display', read_only=True)
    recipient_list = serializers.SerializerMethodField()

    class Meta:
        model = ReportConfiguration
        fields = [
            'id', 'name', 'is_active',
            'frequency', 'frequency_display',
            'day_of_week', 'day_of_week_display',
            'day_of_month', 'send_time',
            'recipient_emails', 'recipient_list',
            'include_summary', 'include_client_wise', 'include_employee_wise',
            'include_work_type_wise', 'include_status_breakdown',
            'include_overdue_list', 'include_upcoming_dues', 'include_charts',
            'report_period', 'report_period_display',
            'last_sent_at', 'last_sent_status',
            'organization', 'organization_name',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['organization', 'last_sent_at', 'last_sent_status', 'created_at', 'updated_at']

    def get_recipient_list(self, obj):
        """Return list of recipient emails"""
        return obj.get_recipient_list()


# =============================================================================
# PLATFORM SETTINGS SERIALIZER (Super Admin)
# =============================================================================

class PlatformSettingsSerializer(serializers.ModelSerializer):
    """Serializer for PlatformSettings singleton model"""
    # Don't expose password in GET, only accept in writes
    smtp_password = serializers.CharField(
        write_only=True,
        required=False,
        allow_blank=True,
        style={'input_type': 'password'}
    )
    smtp_password_set = serializers.SerializerMethodField()

    class Meta:
        model = PlatformSettings
        fields = [
            'id',
            'platform_name',
            'support_email',
            'enable_signups',
            'maintenance_mode',
            'default_trial_days',
            'max_free_users',
            'max_free_clients',
            'require_email_verification',
            'allow_password_reset',
            # SMTP Email Configuration
            'smtp_host',
            'smtp_port',
            'smtp_username',
            'smtp_password',
            'smtp_password_set',
            'smtp_use_tls',
            'smtp_use_ssl',
            'smtp_from_email',
            'smtp_from_name',
            'smtp_enabled',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'smtp_password_set']

    def get_smtp_password_set(self, obj):
        """Return whether SMTP password is configured (not the actual password)"""
        return bool(obj.smtp_password)

    def update(self, instance, validated_data):
        """Only update smtp_password if a new value is provided"""
        smtp_password = validated_data.get('smtp_password', None)
        if smtp_password == '' or smtp_password is None:
            # Don't clear existing password if empty/not provided
            validated_data.pop('smtp_password', None)
        return super().update(instance, validated_data)


# =============================================================================
# SUBSCRIPTION PLAN SERIALIZER (Super Admin)
# =============================================================================

class SubscriptionPlanSerializer(serializers.ModelSerializer):
    """Serializer for SubscriptionPlan model"""
    organizations_count = serializers.SerializerMethodField()

    class Meta:
        model = SubscriptionPlan
        fields = [
            'id',
            'code',
            'name',
            'description',
            'price_monthly',
            'price_yearly',
            'currency',
            'max_users',
            'max_clients',
            'max_storage_mb',
            'features',
            'is_active',
            'is_default',
            'sort_order',
            'organizations_count',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'organizations_count', 'created_at', 'updated_at']

    def get_organizations_count(self, obj):
        """Count organizations using this plan"""
        return Organization.objects.filter(plan=obj.code).count()


# =============================================================================
# CREDENTIAL VAULT SERIALIZER
# =============================================================================

class CredentialVaultSerializer(TenantModelSerializer):
    """Serializer for CredentialVault model - secure client portal credentials"""
    client_name = serializers.CharField(source='client.client_name', read_only=True)
    client_code = serializers.CharField(source='client.client_code', read_only=True)
    portal_type_display = serializers.CharField(source='get_portal_type_display', read_only=True)
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)
    has_password = serializers.SerializerMethodField()

    class Meta:
        model = CredentialVault
        fields = [
            'id', 'client', 'client_name', 'client_code',
            'portal_type', 'portal_type_display', 'portal_name', 'login_url',
            'username', 'password', 'has_password', 'extra_info',
            'last_updated', 'created_at'
        ]
        read_only_fields = ['organization', 'last_updated', 'created_at']

    def get_has_password(self, obj):
        """Return whether password is set (not the actual password)"""
        return bool(obj.password_enc)

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        instance = super().create(validated_data)
        if password:
            instance.encrypt_password(password)
            instance.save()
        return instance

    def update(self, validated_data, instance):
        password = validated_data.pop('password', None)
        instance = super().update(instance, validated_data)
        if password:
            instance.encrypt_password(password)
            instance.save()
        return instance


class CredentialVaultDecryptedSerializer(CredentialVaultSerializer):
    """Serializer that includes decrypted password - use with caution"""
    decrypted_password = serializers.SerializerMethodField()

    class Meta(CredentialVaultSerializer.Meta):
        fields = CredentialVaultSerializer.Meta.fields + ['decrypted_password']

    def get_decrypted_password(self, obj):
        """Decrypt and return the password"""
        try:
            return obj.decrypt_password()
        except Exception:
            return None
