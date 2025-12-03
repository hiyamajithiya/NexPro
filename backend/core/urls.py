from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    UserViewSet, ClientViewSet, WorkTypeViewSet, WorkTypeAssignmentViewSet,
    ClientWorkMappingViewSet, WorkInstanceViewSet, EmailTemplateViewSet,
    ReminderRuleViewSet, ReminderInstanceViewSet, NotificationViewSet,
    DashboardViewSet, CustomTokenObtainPairView, OrganizationViewSet,
    OrganizationEmailViewSet, RegisterView, PlatformAdminViewSet,
    TaskDocumentViewSet, ReportConfigurationViewSet, SubscriptionPlanViewSet,
    CredentialVaultViewSet,
    SendSignupOTPView, VerifySignupOTPView, ResendSignupOTPView,
    ForgotPasswordView, VerifyPasswordResetOTPView, ResetPasswordView
)

router = DefaultRouter()
router.register(r'users', UserViewSet, basename='user')
router.register(r'clients', ClientViewSet, basename='client')
router.register(r'work-types', WorkTypeViewSet, basename='worktype')
router.register(r'work-type-assignments', WorkTypeAssignmentViewSet, basename='worktypeassignment')
router.register(r'client-works', ClientWorkMappingViewSet, basename='clientwork')
router.register(r'tasks', WorkInstanceViewSet, basename='workinstance')
router.register(r'email-templates', EmailTemplateViewSet, basename='emailtemplate')
router.register(r'reminder-rules', ReminderRuleViewSet, basename='reminderrule')
router.register(r'reminders', ReminderInstanceViewSet, basename='reminderinstance')
router.register(r'notifications', NotificationViewSet, basename='notification')
router.register(r'dashboard', DashboardViewSet, basename='dashboard')
router.register(r'organizations', OrganizationViewSet, basename='organization')
router.register(r'organization-emails', OrganizationEmailViewSet, basename='organizationemail')
router.register(r'platform-admin', PlatformAdminViewSet, basename='platform-admin')
router.register(r'subscription-plans', SubscriptionPlanViewSet, basename='subscriptionplan')
router.register(r'task-documents', TaskDocumentViewSet, basename='taskdocument')
router.register(r'report-configurations', ReportConfigurationViewSet, basename='reportconfiguration')
router.register(r'credentials', CredentialVaultViewSet, basename='credentialvault')

urlpatterns = [
    path('', include(router.urls)),
    # Authentication endpoints
    path('auth/register/', RegisterView.as_view(), name='register'),
    path('auth/login/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    # OTP-based signup (new flow)
    path('auth/signup/send-otp/', SendSignupOTPView.as_view(), name='signup_send_otp'),
    path('auth/signup/verify-otp/', VerifySignupOTPView.as_view(), name='signup_verify_otp'),
    path('auth/signup/resend-otp/', ResendSignupOTPView.as_view(), name='signup_resend_otp'),

    # Password reset with OTP
    path('auth/forgot-password/', ForgotPasswordView.as_view(), name='forgot_password'),
    path('auth/verify-reset-otp/', VerifyPasswordResetOTPView.as_view(), name='verify_reset_otp'),
    path('auth/reset-password/', ResetPasswordView.as_view(), name='reset_password'),
]
