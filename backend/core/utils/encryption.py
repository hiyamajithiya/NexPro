"""
Encryption utilities for NexPro
Provides centralized encryption/decryption for sensitive data.
Uses Fernet symmetric encryption (AES-128-CBC with HMAC).
"""

import logging
from cryptography.fernet import Fernet, InvalidToken
from django.conf import settings

logger = logging.getLogger(__name__)


class EncryptionError(Exception):
    """Custom exception for encryption errors"""
    pass


class EncryptionService:
    """
    Centralized encryption service for sensitive data.
    Uses platform-level Fernet key for encryption.
    """

    _fernet = None

    @classmethod
    def _get_fernet(cls):
        """Get or create Fernet instance with platform key"""
        if cls._fernet is None:
            key = getattr(settings, 'FERNET_KEY', None)
            if not key:
                raise EncryptionError(
                    "FERNET_KEY not configured. Generate one with: "
                    "python -c 'from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())'"
                )
            try:
                cls._fernet = Fernet(key.encode() if isinstance(key, str) else key)
            except Exception as e:
                raise EncryptionError(f"Invalid FERNET_KEY: {str(e)}")
        return cls._fernet

    @classmethod
    def encrypt(cls, plaintext):
        """
        Encrypt a plaintext string.

        Args:
            plaintext: String to encrypt

        Returns:
            Encrypted string (base64 encoded)

        Raises:
            EncryptionError: If encryption fails
        """
        if not plaintext:
            return ''

        try:
            fernet = cls._get_fernet()
            encrypted = fernet.encrypt(plaintext.encode('utf-8'))
            return encrypted.decode('utf-8')
        except Exception as e:
            logger.error(f"Encryption failed: {str(e)}")
            raise EncryptionError(f"Encryption failed: {str(e)}")

    @classmethod
    def decrypt(cls, ciphertext):
        """
        Decrypt an encrypted string.

        Args:
            ciphertext: Encrypted string (base64 encoded)

        Returns:
            Decrypted plaintext string

        Raises:
            EncryptionError: If decryption fails
        """
        if not ciphertext:
            return ''

        try:
            fernet = cls._get_fernet()
            decrypted = fernet.decrypt(ciphertext.encode('utf-8'))
            return decrypted.decode('utf-8')
        except InvalidToken:
            logger.error("Decryption failed: Invalid token or key mismatch")
            raise EncryptionError("Decryption failed: Invalid token or corrupted data")
        except Exception as e:
            logger.error(f"Decryption failed: {str(e)}")
            raise EncryptionError(f"Decryption failed: {str(e)}")

    @classmethod
    def is_encrypted(cls, value):
        """
        Check if a value appears to be encrypted (Fernet format).
        Fernet tokens start with 'gAAAAA'.

        Args:
            value: String to check

        Returns:
            Boolean indicating if value appears encrypted
        """
        if not value or not isinstance(value, str):
            return False
        return value.startswith('gAAAAA')

    @classmethod
    def encrypt_if_needed(cls, value):
        """
        Encrypt a value only if it's not already encrypted.

        Args:
            value: String to potentially encrypt

        Returns:
            Encrypted string
        """
        if not value:
            return ''
        if cls.is_encrypted(value):
            return value
        return cls.encrypt(value)

    @classmethod
    def generate_key(cls):
        """
        Generate a new Fernet encryption key.

        Returns:
            New Fernet key as string
        """
        return Fernet.generate_key().decode('utf-8')


def encrypt_field(value):
    """Convenience function for encrypting a field value"""
    return EncryptionService.encrypt(value)


def decrypt_field(value):
    """Convenience function for decrypting a field value"""
    return EncryptionService.decrypt(value)


def mask_sensitive_value(value, visible_chars=4):
    """
    Mask a sensitive value for display/logging.
    Shows only first few characters followed by asterisks.

    Args:
        value: Sensitive string to mask
        visible_chars: Number of characters to show at start

    Returns:
        Masked string like "abc*****"
    """
    if not value:
        return ''
    if len(value) <= visible_chars:
        return '*' * len(value)
    return value[:visible_chars] + '*' * (len(value) - visible_chars)
