# Generated migration for encrypting sensitive fields in PlatformSettings

from django.db import migrations, models
from django.conf import settings
from cryptography.fernet import Fernet


def encrypt_existing_secrets(apps, schema_editor):
    """Encrypt existing plaintext secrets during migration"""
    PlatformSettings = apps.get_model('core', 'PlatformSettings')

    fernet_key = getattr(settings, 'FERNET_KEY', None)
    if not fernet_key:
        print("WARNING: FERNET_KEY not configured, skipping encryption of existing secrets")
        return

    fernet = Fernet(fernet_key.encode() if isinstance(fernet_key, str) else fernet_key)

    for platform_settings in PlatformSettings.objects.all():
        # Encrypt Google client secret if it exists and isn't already encrypted
        if hasattr(platform_settings, 'google_client_secret') and platform_settings.google_client_secret:
            old_value = platform_settings.google_client_secret
            # Check if it's already encrypted (Fernet tokens start with 'gAAAAA')
            if not old_value.startswith('gAAAAA'):
                encrypted = fernet.encrypt(old_value.encode()).decode()
                platform_settings.google_client_secret_encrypted = encrypted
                print(f"Encrypted Google client secret for platform settings")

        # Encrypt SMTP password if it exists and isn't already encrypted
        if hasattr(platform_settings, 'smtp_password') and platform_settings.smtp_password:
            old_value = platform_settings.smtp_password
            # Check if it's already encrypted
            if not old_value.startswith('gAAAAA'):
                encrypted = fernet.encrypt(old_value.encode()).decode()
                platform_settings.smtp_password_encrypted = encrypted
                print(f"Encrypted SMTP password for platform settings")

        platform_settings.save()


def decrypt_secrets_for_rollback(apps, schema_editor):
    """Decrypt secrets back to plaintext for rollback (not recommended in production)"""
    PlatformSettings = apps.get_model('core', 'PlatformSettings')

    fernet_key = getattr(settings, 'FERNET_KEY', None)
    if not fernet_key:
        print("WARNING: FERNET_KEY not configured, cannot decrypt secrets")
        return

    fernet = Fernet(fernet_key.encode() if isinstance(fernet_key, str) else fernet_key)

    for platform_settings in PlatformSettings.objects.all():
        # Decrypt Google client secret
        if platform_settings.google_client_secret_encrypted:
            try:
                decrypted = fernet.decrypt(platform_settings.google_client_secret_encrypted.encode()).decode()
                platform_settings.google_client_secret = decrypted
            except Exception:
                pass

        # Decrypt SMTP password
        if platform_settings.smtp_password_encrypted:
            try:
                decrypted = fernet.decrypt(platform_settings.smtp_password_encrypted.encode()).decode()
                platform_settings.smtp_password = decrypted
            except Exception:
                pass

        platform_settings.save()


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0026_add_google_oauth_to_platform_settings'),
    ]

    operations = [
        # Add new encrypted fields
        migrations.AddField(
            model_name='platformsettings',
            name='google_client_secret_encrypted',
            field=models.TextField(
                blank=True,
                default='',
                help_text='Google OAuth Client Secret (encrypted with Fernet)'
            ),
        ),
        migrations.AddField(
            model_name='platformsettings',
            name='smtp_password_encrypted',
            field=models.TextField(
                blank=True,
                default='',
                help_text='SMTP password (encrypted with Fernet)'
            ),
        ),

        # Run data migration to encrypt existing values
        migrations.RunPython(encrypt_existing_secrets, decrypt_secrets_for_rollback),

        # Remove old plaintext fields
        migrations.RemoveField(
            model_name='platformsettings',
            name='google_client_secret',
        ),
        migrations.RemoveField(
            model_name='platformsettings',
            name='smtp_password',
        ),
    ]
