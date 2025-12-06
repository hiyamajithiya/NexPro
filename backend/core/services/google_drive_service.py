"""
Google Drive Sync Service for NexPro
Handles file storage and folder management in Google Drive.
"""

import logging
import io
import os
from datetime import datetime
from django.utils import timezone
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload, MediaIoBaseUpload
from googleapiclient.errors import HttpError

from .google_oauth_service import GoogleOAuthService

logger = logging.getLogger(__name__)


class GoogleDriveService:
    """
    Service for managing files and folders in Google Drive for NexPro.
    Supports auto-creation of client folders and file uploads.
    """

    def __init__(self, google_connection):
        """
        Initialize with a GoogleConnection object.
        """
        self.google_connection = google_connection
        self.credentials = None
        self.service = None

    def _get_service(self):
        """
        Get authenticated Google Drive service.
        """
        if not self.service:
            self.credentials = GoogleOAuthService.get_credentials_from_connection(self.google_connection)
            if not self.credentials:
                raise ValueError("Failed to get valid credentials")
            self.service = build('drive', 'v3', credentials=self.credentials)
        return self.service

    def get_or_create_root_folder(self, folder_name='NexPro'):
        """
        Get or create the root NexPro folder in Google Drive.
        Returns the folder ID.
        """
        service = self._get_service()

        # Check if we already have a root folder ID stored
        if self.google_connection.drive_folder_id:
            try:
                folder = service.files().get(
                    fileId=self.google_connection.drive_folder_id,
                    fields='id, name, trashed'
                ).execute()

                if not folder.get('trashed'):
                    return folder['id']
            except HttpError as e:
                if e.resp.status != 404:
                    raise
                # Folder was deleted, create a new one

        # Search for existing NexPro folder
        query = f"name='{folder_name}' and mimeType='application/vnd.google-apps.folder' and trashed=false"
        results = service.files().list(
            q=query,
            spaces='drive',
            fields='files(id, name)'
        ).execute()

        files = results.get('files', [])
        if files:
            folder_id = files[0]['id']
            self.google_connection.drive_folder_id = folder_id
            self.google_connection.save(update_fields=['drive_folder_id'])
            return folder_id

        # Create new root folder
        folder_metadata = {
            'name': folder_name,
            'mimeType': 'application/vnd.google-apps.folder'
        }

        folder = service.files().create(
            body=folder_metadata,
            fields='id'
        ).execute()

        self.google_connection.drive_folder_id = folder['id']
        self.google_connection.save(update_fields=['drive_folder_id'])

        logger.info(f"Created NexPro root folder: {folder['id']}")
        return folder['id']

    def create_folder(self, folder_name, parent_folder_id=None):
        """
        Create a folder in Google Drive.
        Returns the folder ID.
        """
        service = self._get_service()

        folder_metadata = {
            'name': folder_name,
            'mimeType': 'application/vnd.google-apps.folder'
        }

        if parent_folder_id:
            folder_metadata['parents'] = [parent_folder_id]

        folder = service.files().create(
            body=folder_metadata,
            fields='id'
        ).execute()

        logger.info(f"Created folder '{folder_name}': {folder['id']}")
        return folder['id']

    def get_or_create_folder(self, folder_name, parent_folder_id=None):
        """
        Get existing folder or create if not exists.
        """
        service = self._get_service()

        # Build search query
        query = f"name='{folder_name}' and mimeType='application/vnd.google-apps.folder' and trashed=false"
        if parent_folder_id:
            query += f" and '{parent_folder_id}' in parents"

        results = service.files().list(
            q=query,
            spaces='drive',
            fields='files(id, name)'
        ).execute()

        files = results.get('files', [])
        if files:
            return files[0]['id']

        return self.create_folder(folder_name, parent_folder_id)

    def create_client_folder_structure(self, client, sync_settings=None):
        """
        Create folder structure for a client based on settings.
        Default structure: NexPro / {client_name} / {year} / {work_types...}
        """
        from core.models import GoogleDriveMapping, GoogleSyncLog, GoogleSyncSettings

        if sync_settings is None:
            try:
                sync_settings = GoogleSyncSettings.objects.get(
                    organization=self.google_connection.organization
                )
            except GoogleSyncSettings.DoesNotExist:
                sync_settings = None

        try:
            # Get root folder
            root_folder_id = self.get_or_create_root_folder()

            # Create client folder
            client_folder_id = self.get_or_create_folder(
                client.client_name,
                root_folder_id
            )

            # Save mapping for client folder
            client_mapping, _ = GoogleDriveMapping.objects.update_or_create(
                organization=self.google_connection.organization,
                client=client,
                folder_type='CLIENT',
                defaults={
                    'google_folder_id': client_folder_id,
                    'google_folder_name': client.client_name,
                    'parent_folder_id': root_folder_id,
                }
            )

            # Create year folder
            current_year = datetime.now().year
            year_folder_id = self.get_or_create_folder(
                str(current_year),
                client_folder_id
            )

            # Save mapping for year folder
            year_mapping, _ = GoogleDriveMapping.objects.update_or_create(
                organization=self.google_connection.organization,
                client=client,
                folder_type='YEAR',
                year=current_year,
                defaults={
                    'google_folder_id': year_folder_id,
                    'google_folder_name': str(current_year),
                    'parent_folder_id': client_folder_id,
                }
            )

            # Create work type subfolders
            work_types = client.work_mappings.filter(active=True).values_list(
                'work_type__work_name', flat=True
            ).distinct()

            for work_type_name in work_types:
                work_type_folder_id = self.get_or_create_folder(
                    work_type_name,
                    year_folder_id
                )

            # Log the sync
            GoogleSyncLog.objects.create(
                organization=client.organization,
                user=self.google_connection.user,
                sync_type='DRIVE_FOLDER_CREATE',
                status='SUCCESS',
                details=f"Created folder structure for client: {client.client_name}"
            )

            logger.info(f"Created folder structure for client: {client.client_name}")
            return client_mapping

        except HttpError as e:
            logger.error(f"Error creating client folder structure: {str(e)}")

            GoogleSyncLog.objects.create(
                organization=client.organization,
                user=self.google_connection.user,
                sync_type='DRIVE_FOLDER_CREATE',
                status='FAILED',
                error_message=str(e)
            )
            raise

    def upload_file(self, file_path, file_name, parent_folder_id=None, mime_type=None):
        """
        Upload a file to Google Drive.
        Returns the file ID.
        """
        service = self._get_service()

        if not parent_folder_id:
            parent_folder_id = self.get_or_create_root_folder()

        file_metadata = {
            'name': file_name,
            'parents': [parent_folder_id]
        }

        media = MediaFileUpload(
            file_path,
            mimetype=mime_type,
            resumable=True
        )

        file = service.files().create(
            body=file_metadata,
            media_body=media,
            fields='id, webViewLink'
        ).execute()

        logger.info(f"Uploaded file '{file_name}': {file['id']}")
        return file

    def upload_file_content(self, content, file_name, parent_folder_id=None, mime_type='application/octet-stream'):
        """
        Upload file content (bytes or file-like object) to Google Drive.
        Returns the file object with id and webViewLink.
        """
        service = self._get_service()

        if not parent_folder_id:
            parent_folder_id = self.get_or_create_root_folder()

        file_metadata = {
            'name': file_name,
            'parents': [parent_folder_id]
        }

        # Handle different content types
        if isinstance(content, bytes):
            content = io.BytesIO(content)

        media = MediaIoBaseUpload(
            content,
            mimetype=mime_type,
            resumable=True
        )

        file = service.files().create(
            body=file_metadata,
            media_body=media,
            fields='id, webViewLink'
        ).execute()

        logger.info(f"Uploaded file content '{file_name}': {file['id']}")
        return file

    def upload_task_attachment(self, task_document, work_instance):
        """
        Upload a task document to the appropriate client folder in Google Drive.
        """
        from core.models import GoogleDriveMapping, GoogleSyncLog

        client = work_instance.client_work.client
        work_type = work_instance.client_work.work_type

        try:
            # Get or create client folder structure
            client_mapping = GoogleDriveMapping.objects.filter(
                organization=work_instance.organization,
                client=client,
                folder_type='CLIENT'
            ).first()

            if not client_mapping:
                self.create_client_folder_structure(client)
                client_mapping = GoogleDriveMapping.objects.get(
                    organization=work_instance.organization,
                    client=client,
                    folder_type='CLIENT'
                )

            # Get or create year folder
            current_year = work_instance.due_date.year if work_instance.due_date else datetime.now().year
            year_folder_id = self.get_or_create_folder(
                str(current_year),
                client_mapping.google_folder_id
            )

            # Get or create work type folder
            work_type_folder_id = self.get_or_create_folder(
                work_type.work_name,
                year_folder_id
            )

            # Upload the file
            file_path = task_document.file.path
            file_name = task_document.file_name

            uploaded_file = self.upload_file(
                file_path,
                file_name,
                work_type_folder_id,
                task_document.file_type
            )

            # Log the upload
            GoogleSyncLog.objects.create(
                organization=work_instance.organization,
                user=self.google_connection.user,
                sync_type='DRIVE_UPLOAD',
                status='SUCCESS',
                work_instance=work_instance,
                google_file_id=uploaded_file['id'],
                details=f"Uploaded: {file_name}"
            )

            logger.info(f"Uploaded task attachment to Drive: {file_name}")
            return uploaded_file

        except Exception as e:
            logger.error(f"Error uploading task attachment: {str(e)}")

            GoogleSyncLog.objects.create(
                organization=work_instance.organization,
                user=self.google_connection.user,
                sync_type='DRIVE_UPLOAD',
                status='FAILED',
                work_instance=work_instance,
                error_message=str(e)
            )
            raise

    def upload_report(self, report_content, report_name, client=None, work_instance=None):
        """
        Upload a generated report (PDF) to Google Drive.
        """
        from core.models import GoogleDriveMapping, GoogleSyncLog

        try:
            # Determine the upload folder
            if client:
                client_mapping = GoogleDriveMapping.objects.filter(
                    organization=self.google_connection.organization,
                    client=client,
                    folder_type='CLIENT'
                ).first()

                if client_mapping:
                    parent_folder_id = client_mapping.google_folder_id
                else:
                    parent_folder_id = self.get_or_create_root_folder()
            else:
                # Upload to root/Reports folder
                root_folder_id = self.get_or_create_root_folder()
                parent_folder_id = self.get_or_create_folder('Reports', root_folder_id)

            # Upload the report
            uploaded_file = self.upload_file_content(
                report_content,
                report_name,
                parent_folder_id,
                'application/pdf'
            )

            # Log the upload
            GoogleSyncLog.objects.create(
                organization=self.google_connection.organization,
                user=self.google_connection.user,
                sync_type='DRIVE_UPLOAD',
                status='SUCCESS',
                work_instance=work_instance,
                google_file_id=uploaded_file['id'],
                details=f"Uploaded report: {report_name}"
            )

            logger.info(f"Uploaded report to Drive: {report_name}")
            return uploaded_file

        except Exception as e:
            logger.error(f"Error uploading report: {str(e)}")
            raise

    def list_folder_contents(self, folder_id):
        """
        List all files and folders in a folder.
        """
        service = self._get_service()

        try:
            results = service.files().list(
                q=f"'{folder_id}' in parents and trashed=false",
                spaces='drive',
                fields='files(id, name, mimeType, size, createdTime, webViewLink)',
                orderBy='name'
            ).execute()

            return results.get('files', [])

        except HttpError as e:
            logger.error(f"Error listing folder contents: {str(e)}")
            return []

    def share_folder_with_user(self, folder_id, email, role='reader'):
        """
        Share a folder with a user.
        role can be: 'reader', 'writer', 'commenter'
        """
        service = self._get_service()

        try:
            permission = {
                'type': 'user',
                'role': role,
                'emailAddress': email
            }

            result = service.permissions().create(
                fileId=folder_id,
                body=permission,
                sendNotificationEmail=True
            ).execute()

            logger.info(f"Shared folder {folder_id} with {email}")
            return result

        except HttpError as e:
            logger.error(f"Error sharing folder: {str(e)}")
            raise

    def delete_file(self, file_id):
        """
        Delete a file from Google Drive.
        """
        service = self._get_service()

        try:
            service.files().delete(fileId=file_id).execute()
            logger.info(f"Deleted file: {file_id}")
            return True

        except HttpError as e:
            if e.resp.status != 404:
                logger.error(f"Error deleting file: {str(e)}")
                raise
            return False

    def get_storage_quota(self):
        """
        Get the user's Google Drive storage quota information.
        """
        service = self._get_service()

        try:
            about = service.about().get(fields='storageQuota').execute()
            quota = about.get('storageQuota', {})

            return {
                'limit': int(quota.get('limit', 0)),
                'usage': int(quota.get('usage', 0)),
                'usageInDrive': int(quota.get('usageInDrive', 0)),
                'usageInDriveTrash': int(quota.get('usageInDriveTrash', 0)),
            }

        except HttpError as e:
            logger.error(f"Error getting storage quota: {str(e)}")
            return None
