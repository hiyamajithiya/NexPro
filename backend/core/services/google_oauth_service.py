"""
Google OAuth Service for NexPro
Handles Google OAuth authentication and token management.
"""

import json
import logging
from datetime import datetime, timedelta
from django.conf import settings
from django.utils import timezone
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from google.auth.transport.requests import Request
from googleapiclient.discovery import build

logger = logging.getLogger(__name__)

# OAuth Scopes for all Google services
SCOPES = [
    'https://www.googleapis.com/auth/tasks',           # Google Tasks
    'https://www.googleapis.com/auth/calendar',        # Google Calendar
    'https://www.googleapis.com/auth/drive.file',      # Google Drive (limited to app files)
    'https://www.googleapis.com/auth/gmail.send',      # Gmail send
    'https://www.googleapis.com/auth/gmail.readonly',  # Gmail read
    'https://www.googleapis.com/auth/userinfo.email',  # User email info
    'https://www.googleapis.com/auth/userinfo.profile', # User profile info
]


def get_platform_google_credentials():
    """
    Get Google OAuth credentials from PlatformSettings database.
    Returns (client_id, client_secret, enabled) tuple.
    """
    from core.models import PlatformSettings
    try:
        platform_settings = PlatformSettings.get_settings()
        return (
            platform_settings.google_client_id or '',
            platform_settings.google_client_secret or '',
            platform_settings.google_oauth_enabled
        )
    except Exception as e:
        logger.error(f"Error fetching Google OAuth from PlatformSettings: {str(e)}")
        return ('', '', False)


class GoogleOAuthService:
    """
    Service for handling Google OAuth authentication.
    """

    @staticmethod
    def get_client_config():
        """
        Get Google OAuth client configuration from PlatformSettings database.
        Returns a dict suitable for google_auth_oauthlib.
        """
        client_id, client_secret, enabled = get_platform_google_credentials()

        return {
            "web": {
                "client_id": client_id,
                "client_secret": client_secret,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "redirect_uris": [
                    getattr(settings, 'GOOGLE_REDIRECT_URI', 'http://localhost:8000/api/google/callback/')
                ],
            }
        }

    @staticmethod
    def is_oauth_configured():
        """
        Check if Google OAuth is properly configured in Platform Settings.
        Returns True if client_id and client_secret are set and OAuth is enabled.
        """
        client_id, client_secret, enabled = get_platform_google_credentials()
        return bool(client_id and client_secret and enabled)

    @staticmethod
    def create_auth_flow(redirect_uri=None):
        """
        Create OAuth flow for initiating authentication.
        """
        if not GoogleOAuthService.is_oauth_configured():
            raise ValueError("Google OAuth not configured. Super Admin must configure Google OAuth in Platform Settings.")

        client_config = GoogleOAuthService.get_client_config()

        flow = Flow.from_client_config(
            client_config,
            scopes=SCOPES,
            redirect_uri=redirect_uri or client_config['web']['redirect_uris'][0]
        )

        return flow

    @staticmethod
    def get_authorization_url(redirect_uri=None, state=None):
        """
        Generate authorization URL for user to grant access.
        Returns: (auth_url, state)
        """
        flow = GoogleOAuthService.create_auth_flow(redirect_uri)

        authorization_url, state = flow.authorization_url(
            access_type='offline',  # For refresh token
            include_granted_scopes='true',
            prompt='consent',  # Force consent screen to get refresh token
            state=state
        )

        return authorization_url, state

    @staticmethod
    def exchange_code_for_tokens(code, redirect_uri=None):
        """
        Exchange authorization code for access and refresh tokens.
        Returns credentials object.
        """
        flow = GoogleOAuthService.create_auth_flow(redirect_uri)
        flow.fetch_token(code=code)

        return flow.credentials

    @staticmethod
    def get_credentials_from_connection(google_connection):
        """
        Build Credentials object from stored GoogleConnection.
        """
        if google_connection.status != 'CONNECTED':
            return None

        try:
            access_token = google_connection.decrypt_token('access')
            refresh_token = google_connection.decrypt_token('refresh')

            if not access_token:
                return None

            # Get client credentials from PlatformSettings
            client_id, client_secret, _ = get_platform_google_credentials()

            credentials = Credentials(
                token=access_token,
                refresh_token=refresh_token,
                token_uri="https://oauth2.googleapis.com/token",
                client_id=client_id,
                client_secret=client_secret,
                scopes=SCOPES
            )

            # Check if token is expired and refresh if needed
            if credentials.expired and credentials.refresh_token:
                credentials.refresh(Request())
                # Update stored tokens
                google_connection.encrypt_token(credentials.token, 'access')
                google_connection.token_expiry = credentials.expiry
                google_connection.save(update_fields=['access_token', 'token_expiry', 'updated_at'])

            return credentials

        except Exception as e:
            logger.error(f"Error getting credentials for user {google_connection.user.email}: {str(e)}")
            google_connection.status = 'ERROR'
            google_connection.save(update_fields=['status', 'updated_at'])
            return None

    @staticmethod
    def save_credentials_to_connection(google_connection, credentials):
        """
        Save OAuth credentials to GoogleConnection model.
        """
        google_connection.encrypt_token(credentials.token, 'access')

        if credentials.refresh_token:
            google_connection.encrypt_token(credentials.refresh_token, 'refresh')

        google_connection.token_expiry = credentials.expiry
        google_connection.status = 'CONNECTED'
        google_connection.connected_at = timezone.now()

        # Get user info from Google
        try:
            service = build('oauth2', 'v2', credentials=credentials)
            user_info = service.userinfo().get().execute()
            google_connection.google_email = user_info.get('email')
            google_connection.google_user_id = user_info.get('id')
        except Exception as e:
            logger.warning(f"Could not fetch Google user info: {str(e)}")

        google_connection.save()

        return google_connection

    @staticmethod
    def disconnect(google_connection):
        """
        Disconnect Google account - clear tokens and reset status.
        """
        google_connection.access_token = None
        google_connection.refresh_token = None
        google_connection.token_expiry = None
        google_connection.status = 'DISCONNECTED'
        google_connection.google_email = None
        google_connection.google_user_id = None
        google_connection.tasks_enabled = False
        google_connection.calendar_enabled = False
        google_connection.drive_enabled = False
        google_connection.gmail_enabled = False
        google_connection.tasks_list_id = None
        google_connection.calendar_id = None
        google_connection.drive_folder_id = None
        google_connection.connected_at = None
        google_connection.last_sync_at = None
        google_connection.save()

        return google_connection

    @staticmethod
    def is_connected(google_connection):
        """
        Check if connection is valid and tokens are not expired.
        """
        if not google_connection or google_connection.status != 'CONNECTED':
            return False

        # Check if token is expired
        if google_connection.token_expiry:
            if timezone.now() > google_connection.token_expiry:
                # Try to refresh
                credentials = GoogleOAuthService.get_credentials_from_connection(google_connection)
                if credentials and not credentials.expired:
                    return True
                return False

        return True

    @staticmethod
    def get_task_lists(credentials):
        """
        Get list of Google Task lists for the user.
        """
        try:
            service = build('tasks', 'v1', credentials=credentials)
            results = service.tasklists().list().execute()
            return results.get('items', [])
        except Exception as e:
            logger.error(f"Error fetching task lists: {str(e)}")
            return []

    @staticmethod
    def get_calendars(credentials):
        """
        Get list of Google Calendars for the user.
        """
        try:
            service = build('calendar', 'v3', credentials=credentials)
            results = service.calendarList().list().execute()
            return results.get('items', [])
        except Exception as e:
            logger.error(f"Error fetching calendars: {str(e)}")
            return []

    @staticmethod
    def verify_connection(google_connection):
        """
        Verify the connection by making a simple API call.
        Returns True if connection is valid.
        """
        try:
            credentials = GoogleOAuthService.get_credentials_from_connection(google_connection)
            if not credentials:
                return False

            # Try to get user info as a verification
            service = build('oauth2', 'v2', credentials=credentials)
            user_info = service.userinfo().get().execute()

            return user_info is not None

        except Exception as e:
            logger.error(f"Connection verification failed: {str(e)}")
            return False
