"""
Plan Service for NexPro Multi-Tenant SaaS

Handles subscription plans, limits, and feature access.
"""

from datetime import timedelta
from django.utils import timezone


class PlanService:
    """
    Service for managing subscription plans and enforcing limits.
    """

    # Plan configurations
    PLANS = {
        'FREE': {
            'name': 'Free Trial',
            'max_users': 2,
            'max_clients': 10,
            'trial_days': 30,
            'price_monthly': 0,
            'price_yearly': 0,
            'features': [
                'basic_tasks',
                'basic_clients',
                'dashboard',
            ],
            'description': '30-day free trial with basic features',
        },
        'STARTER': {
            'name': 'Starter',
            'max_users': 5,
            'max_clients': 50,
            'trial_days': 0,
            'price_monthly': 999,  # INR
            'price_yearly': 9990,  # INR (10% discount)
            'features': [
                'basic_tasks',
                'basic_clients',
                'dashboard',
                'email_reminders',
                'basic_reports',
                'excel_export',
            ],
            'description': 'Perfect for small firms getting started',
        },
        'PROFESSIONAL': {
            'name': 'Professional',
            'max_users': 15,
            'max_clients': 200,
            'trial_days': 0,
            'price_monthly': 2499,  # INR
            'price_yearly': 24990,  # INR (17% discount)
            'features': [
                'basic_tasks',
                'basic_clients',
                'dashboard',
                'email_reminders',
                'basic_reports',
                'excel_export',
                'advanced_reports',
                'task_automation',
                'bulk_upload',
                'priority_support',
            ],
            'description': 'For growing firms with advanced needs',
        },
        'ENTERPRISE': {
            'name': 'Enterprise',
            'max_users': -1,  # Unlimited
            'max_clients': -1,  # Unlimited
            'trial_days': 0,
            'price_monthly': 0,  # Custom pricing
            'price_yearly': 0,  # Custom pricing
            'features': [
                'all',  # All features
                'white_labeling',
                'api_access',
                'dedicated_support',
                'custom_integrations',
                'sla_guarantee',
            ],
            'description': 'Custom solution for large organizations',
        },
    }

    @classmethod
    def get_plan(cls, plan_code):
        """Get plan configuration by code."""
        return cls.PLANS.get(plan_code, cls.PLANS['FREE'])

    @classmethod
    def get_all_plans(cls):
        """Get all available plans."""
        return cls.PLANS

    @classmethod
    def get_plan_limit(cls, plan_code, limit_name):
        """
        Get a specific limit for a plan.
        Returns -1 for unlimited.
        """
        plan = cls.get_plan(plan_code)
        return plan.get(limit_name, 0)

    @classmethod
    def can_add_user(cls, organization):
        """Check if organization can add more users."""
        plan = cls.get_plan(organization.plan)
        max_users = plan['max_users']

        if max_users == -1:  # Unlimited
            return True, None

        current_count = organization.users.count()
        if current_count >= max_users:
            return False, f"User limit reached ({max_users} users). Please upgrade your plan."

        return True, None

    @classmethod
    def can_add_client(cls, organization):
        """Check if organization can add more clients."""
        plan = cls.get_plan(organization.plan)
        max_clients = plan['max_clients']

        if max_clients == -1:  # Unlimited
            return True, None

        current_count = organization.client_set.count()
        if current_count >= max_clients:
            return False, f"Client limit reached ({max_clients} clients). Please upgrade your plan."

        return True, None

    @classmethod
    def has_feature(cls, organization, feature_name):
        """Check if organization has access to a feature."""
        plan = cls.get_plan(organization.plan)
        features = plan.get('features', [])

        # Enterprise has all features
        if 'all' in features:
            return True

        return feature_name in features

    @classmethod
    def get_usage_stats(cls, organization):
        """Get current usage statistics for an organization."""
        plan = cls.get_plan(organization.plan)

        user_count = organization.users.count()
        client_count = organization.client_set.count()

        return {
            'plan': organization.plan,
            'plan_name': plan['name'],
            'users': {
                'current': user_count,
                'max': plan['max_users'],
                'percentage': cls._calculate_percentage(user_count, plan['max_users']),
            },
            'clients': {
                'current': client_count,
                'max': plan['max_clients'],
                'percentage': cls._calculate_percentage(client_count, plan['max_clients']),
            },
            'features': plan['features'],
        }

    @classmethod
    def _calculate_percentage(cls, current, maximum):
        """Calculate usage percentage."""
        if maximum == -1:  # Unlimited
            return 0
        if maximum == 0:
            return 100
        return round((current / maximum) * 100, 1)

    @classmethod
    def setup_trial(cls, organization):
        """
        Set up trial period for a new organization.
        """
        plan = cls.get_plan('FREE')
        trial_days = plan['trial_days']

        organization.plan = 'FREE'
        organization.status = 'TRIAL'
        organization.trial_ends_at = timezone.now() + timedelta(days=trial_days)
        organization.max_users = plan['max_users']
        organization.max_clients = plan['max_clients']
        organization.save()

        return organization

    @classmethod
    def upgrade_plan(cls, organization, new_plan_code):
        """
        Upgrade organization to a new plan.
        """
        if new_plan_code not in cls.PLANS:
            raise ValueError(f"Invalid plan code: {new_plan_code}")

        plan = cls.get_plan(new_plan_code)

        organization.plan = new_plan_code
        organization.status = 'ACTIVE'
        organization.max_users = plan['max_users']
        organization.max_clients = plan['max_clients']
        organization.trial_ends_at = None
        organization.save()

        return organization

    @classmethod
    def check_trial_expiry(cls, organization):
        """
        Check if organization's trial has expired.
        Returns (is_expired, days_remaining)
        """
        if organization.status != 'TRIAL':
            return False, None

        if not organization.trial_ends_at:
            return False, None

        now = timezone.now()
        if now >= organization.trial_ends_at:
            return True, 0

        days_remaining = (organization.trial_ends_at - now).days
        return False, days_remaining

    @classmethod
    def expire_trial(cls, organization):
        """
        Handle trial expiration - suspend the organization.
        """
        organization.status = 'SUSPENDED'
        organization.save()
        return organization

    @classmethod
    def get_upgrade_options(cls, current_plan):
        """
        Get available upgrade options from current plan.
        """
        plan_order = ['FREE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE']
        current_index = plan_order.index(current_plan) if current_plan in plan_order else 0

        upgrade_options = []
        for plan_code in plan_order[current_index + 1:]:
            plan = cls.get_plan(plan_code)
            upgrade_options.append({
                'code': plan_code,
                'name': plan['name'],
                'price_monthly': plan['price_monthly'],
                'price_yearly': plan['price_yearly'],
                'max_users': plan['max_users'],
                'max_clients': plan['max_clients'],
                'features': plan['features'],
                'description': plan['description'],
            })

        return upgrade_options
