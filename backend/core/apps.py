from django.apps import AppConfig


class CoreConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "core"

    def ready(self):
        """
        Import signal handlers when Django starts.
        This ensures signals are registered and will trigger on model events.
        """
        import core.signals  # noqa: F401
