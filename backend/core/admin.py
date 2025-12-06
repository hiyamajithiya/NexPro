from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import (
    User, Client, WorkType, ClientWorkMapping, WorkInstance,
    CredentialVault, EmailTemplate, ReminderRule, ReminderInstance
)


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ('username', 'email', 'first_name', 'last_name', 'role', 'is_staff')
    list_filter = ('role', 'is_staff', 'is_superuser', 'is_active')
    fieldsets = BaseUserAdmin.fieldsets + (
        ('Custom Fields', {'fields': ('role', 'mobile')}),
    )
    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        ('Custom Fields', {'fields': ('role', 'mobile')}),
    )


@admin.register(Client)
class ClientAdmin(admin.ModelAdmin):
    list_display = ('client_code', 'client_name', 'PAN', 'GSTIN', 'category', 'status', 'email', 'mobile')
    list_filter = ('status', 'category', 'created_at')
    search_fields = ('client_code', 'client_name', 'PAN', 'GSTIN', 'email')
    ordering = ('client_name',)
    date_hierarchy = 'created_at'


@admin.register(WorkType)
class WorkTypeAdmin(admin.ModelAdmin):
    list_display = ('work_name', 'statutory_form', 'default_frequency', 'is_active', 'created_at')
    list_filter = ('default_frequency', 'is_active', 'created_at')
    search_fields = ('work_name', 'statutory_form', 'description')
    ordering = ('work_name',)


@admin.register(ClientWorkMapping)
class ClientWorkMappingAdmin(admin.ModelAdmin):
    list_display = ('client', 'work_type', 'effective_frequency', 'start_from_period', 'active', 'created_at')
    list_filter = ('active', 'freq_override', 'work_type', 'created_at')
    search_fields = ('client__client_name', 'client__client_code', 'work_type__work_name')
    raw_id_fields = ('client', 'work_type')
    ordering = ('client', 'work_type')


@admin.register(WorkInstance)
class WorkInstanceAdmin(admin.ModelAdmin):
    list_display = ('id', 'get_client', 'get_work_type', 'period_label', 'due_date', 'status', 'assigned_to', 'completed_on')
    list_filter = ('status', 'due_date', 'assigned_to', 'created_at')
    search_fields = ('client_work__client__client_name', 'client_work__work_type__work_name', 'period_label')
    raw_id_fields = ('client_work', 'assigned_to')
    date_hierarchy = 'due_date'
    ordering = ('-due_date',)

    def get_client(self, obj):
        return obj.client_work.client.client_name
    get_client.short_description = 'Client'
    get_client.admin_order_field = 'client_work__client__client_name'

    def get_work_type(self, obj):
        return obj.client_work.work_type.work_name
    get_work_type.short_description = 'Task Category'
    get_work_type.admin_order_field = 'client_work__work_type__work_name'


@admin.register(CredentialVault)
class CredentialVaultAdmin(admin.ModelAdmin):
    list_display = ('client', 'portal_type', 'username', 'last_updated')
    list_filter = ('portal_type', 'last_updated')
    search_fields = ('client__client_name', 'client__client_code', 'username')
    raw_id_fields = ('client',)
    ordering = ('client', 'portal_type')


@admin.register(EmailTemplate)
class EmailTemplateAdmin(admin.ModelAdmin):
    list_display = ('template_name', 'work_type', 'is_active', 'created_at')
    list_filter = ('is_active', 'work_type', 'created_at')
    search_fields = ('template_name', 'subject_template', 'work_type__work_name')
    raw_id_fields = ('work_type',)
    ordering = ('work_type', 'template_name')


@admin.register(ReminderRule)
class ReminderRuleAdmin(admin.ModelAdmin):
    list_display = ('work_type', 'reminder_type', 'offset_days', 'repeat_if_pending', 'repeat_interval', 'max_repeats', 'is_active')
    list_filter = ('reminder_type', 'is_active', 'repeat_if_pending', 'work_type')
    search_fields = ('work_type__work_name',)
    raw_id_fields = ('work_type', 'email_template')
    ordering = ('work_type', 'offset_days')


@admin.register(ReminderInstance)
class ReminderInstanceAdmin(admin.ModelAdmin):
    list_display = ('id', 'get_client', 'get_work_type', 'scheduled_at', 'send_status', 'sent_at', 'repeat_count')
    list_filter = ('send_status', 'scheduled_at', 'sent_at')
    search_fields = ('work_instance__client_work__client__client_name', 'email_to')
    raw_id_fields = ('work_instance', 'reminder_rule')
    date_hierarchy = 'scheduled_at'
    ordering = ('-scheduled_at',)

    def get_client(self, obj):
        return obj.work_instance.client_work.client.client_name
    get_client.short_description = 'Client'

    def get_work_type(self, obj):
        return obj.work_instance.client_work.work_type.work_name
    get_work_type.short_description = 'Task Category'
