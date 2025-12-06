"""
Gmail Integration Service for NexPro
Handles sending emails via Gmail and creating tasks from emails.
"""

import logging
import base64
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
from django.utils import timezone
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

from .google_oauth_service import GoogleOAuthService

logger = logging.getLogger(__name__)


class GoogleGmailService:
    """
    Service for Gmail integration with NexPro.
    Supports sending emails via Gmail and creating tasks from labeled emails.
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
        Get authenticated Gmail service.
        """
        if not self.service:
            self.credentials = GoogleOAuthService.get_credentials_from_connection(self.google_connection)
            if not self.credentials:
                raise ValueError("Failed to get valid credentials")
            self.service = build('gmail', 'v1', credentials=self.credentials)
        return self.service

    def send_email(self, to_email, subject, body_html, body_text=None, cc=None, bcc=None, attachments=None):
        """
        Send an email using the connected Gmail account.

        Args:
            to_email: Recipient email address (str or list)
            subject: Email subject
            body_html: HTML body content
            body_text: Plain text body (optional, will be derived from html if not provided)
            cc: CC recipients (str or list)
            bcc: BCC recipients (str or list)
            attachments: List of attachment dicts with 'filename', 'content', 'mime_type'

        Returns:
            Sent message object
        """
        from core.models import GoogleSyncLog

        service = self._get_service()

        try:
            # Create message
            message = MIMEMultipart('alternative')
            message['To'] = to_email if isinstance(to_email, str) else ', '.join(to_email)
            message['Subject'] = subject
            message['From'] = self.google_connection.google_email or 'me'

            if cc:
                message['Cc'] = cc if isinstance(cc, str) else ', '.join(cc)
            if bcc:
                message['Bcc'] = bcc if isinstance(bcc, str) else ', '.join(bcc)

            # Add body parts
            if body_text:
                message.attach(MIMEText(body_text, 'plain'))
            message.attach(MIMEText(body_html, 'html'))

            # Add attachments
            if attachments:
                for attachment in attachments:
                    part = MIMEBase('application', 'octet-stream')
                    part.set_payload(attachment['content'])
                    encoders.encode_base64(part)
                    part.add_header(
                        'Content-Disposition',
                        f'attachment; filename="{attachment["filename"]}"'
                    )
                    message.attach(part)

            # Encode and send
            raw_message = base64.urlsafe_b64encode(message.as_bytes()).decode('utf-8')

            sent_message = service.users().messages().send(
                userId='me',
                body={'raw': raw_message}
            ).execute()

            # Log the send
            GoogleSyncLog.objects.create(
                organization=self.google_connection.organization,
                user=self.google_connection.user,
                sync_type='GMAIL_SEND',
                status='SUCCESS',
                google_message_id=sent_message['id'],
                details=f"Sent email to: {to_email}, subject: {subject}"
            )

            logger.info(f"Sent email via Gmail: {sent_message['id']}")
            return sent_message

        except HttpError as e:
            logger.error(f"Error sending email via Gmail: {str(e)}")

            GoogleSyncLog.objects.create(
                organization=self.google_connection.organization,
                user=self.google_connection.user,
                sync_type='GMAIL_SEND',
                status='FAILED',
                error_message=str(e)
            )
            raise

    def send_task_notification(self, work_instance, notification_type='ASSIGNED'):
        """
        Send a task notification email via Gmail.

        notification_type: 'ASSIGNED', 'REMINDER', 'COMPLETED', 'OVERDUE'
        """
        client_work = work_instance.client_work
        client = client_work.client
        work_type = client_work.work_type

        # Determine recipient
        if notification_type == 'ASSIGNED' and work_instance.assigned_to:
            to_email = work_instance.assigned_to.email
            recipient_name = work_instance.assigned_to.get_full_name() or work_instance.assigned_to.email
        else:
            # Send to client
            to_email = client.email
            recipient_name = client.client_name

        # Build subject
        subject_map = {
            'ASSIGNED': f"[NexPro] Task Assigned: {work_type.work_name} - {client.client_name}",
            'REMINDER': f"[NexPro] Reminder: {work_type.work_name} due on {work_instance.due_date}",
            'COMPLETED': f"[NexPro] Task Completed: {work_type.work_name} - {client.client_name}",
            'OVERDUE': f"[NexPro] OVERDUE: {work_type.work_name} - {client.client_name}",
        }
        subject = subject_map.get(notification_type, f"[NexPro] {work_type.work_name} Update")

        # Build HTML body
        org = self.google_connection.organization
        org_name = org.firm_name or org.name if org else 'NexPro'

        body_html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }}
                .content {{ background: #f8fafc; padding: 20px; border: 1px solid #e2e8f0; }}
                .task-details {{ background: white; padding: 15px; border-radius: 8px; margin: 15px 0; }}
                .task-details table {{ width: 100%; border-collapse: collapse; }}
                .task-details td {{ padding: 8px; border-bottom: 1px solid #e2e8f0; }}
                .task-details td:first-child {{ font-weight: 600; color: #64748b; width: 120px; }}
                .footer {{ text-align: center; padding: 20px; color: #94a3b8; font-size: 12px; }}
                .button {{ display: inline-block; background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 15px; }}
                .status-badge {{ display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; }}
                .status-overdue {{ background: #fef2f2; color: #dc2626; }}
                .status-assigned {{ background: #eff6ff; color: #2563eb; }}
                .status-completed {{ background: #f0fdf4; color: #16a34a; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h2 style="margin: 0;">{org_name}</h2>
                    <p style="margin: 5px 0 0 0; opacity: 0.9;">Task Notification</p>
                </div>
                <div class="content">
                    <p>Dear {recipient_name},</p>
                    """

        if notification_type == 'ASSIGNED':
            body_html += f"""
                    <p>A new task has been assigned to you:</p>
            """
        elif notification_type == 'REMINDER':
            body_html += f"""
                    <p>This is a reminder for the following task:</p>
            """
        elif notification_type == 'OVERDUE':
            body_html += f"""
                    <p><span class="status-badge status-overdue">OVERDUE</span></p>
                    <p>The following task is overdue and requires immediate attention:</p>
            """
        elif notification_type == 'COMPLETED':
            body_html += f"""
                    <p><span class="status-badge status-completed">COMPLETED</span></p>
                    <p>The following task has been completed:</p>
            """

        body_html += f"""
                    <div class="task-details">
                        <table>
                            <tr>
                                <td>Client</td>
                                <td><strong>{client.client_name}</strong></td>
                            </tr>
                            <tr>
                                <td>Work Type</td>
                                <td>{work_type.work_name}</td>
                            </tr>
                            <tr>
                                <td>Period</td>
                                <td>{work_instance.period_label}</td>
                            </tr>
                            <tr>
                                <td>Due Date</td>
                                <td><strong>{work_instance.due_date.strftime('%B %d, %Y')}</strong></td>
                            </tr>
                            <tr>
                                <td>Status</td>
                                <td>{work_instance.get_status_display()}</td>
                            </tr>
        """

        if work_instance.remarks:
            body_html += f"""
                            <tr>
                                <td>Remarks</td>
                                <td>{work_instance.remarks}</td>
                            </tr>
            """

        body_html += f"""
                        </table>
                    </div>

                    <p>Thank you,<br><strong>{org_name}</strong></p>
                </div>
                <div class="footer">
                    <p>This email was sent via NexPro Practice Management System</p>
                    <p>© {timezone.now().year} {org_name}. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        """

        return self.send_email(to_email, subject, body_html)

    def get_messages_with_label(self, label_name, max_results=10):
        """
        Get messages with a specific label (for task creation feature).
        """
        service = self._get_service()

        try:
            # First, find the label ID
            labels_response = service.users().labels().list(userId='me').execute()
            labels = labels_response.get('labels', [])

            label_id = None
            for label in labels:
                if label['name'].lower() == label_name.lower():
                    label_id = label['id']
                    break

            if not label_id:
                logger.info(f"Label '{label_name}' not found")
                return []

            # Get messages with this label
            results = service.users().messages().list(
                userId='me',
                labelIds=[label_id],
                maxResults=max_results
            ).execute()

            messages = results.get('messages', [])

            # Get full message details
            full_messages = []
            for msg in messages:
                full_msg = service.users().messages().get(
                    userId='me',
                    id=msg['id'],
                    format='full'
                ).execute()
                full_messages.append(full_msg)

            return full_messages

        except HttpError as e:
            logger.error(f"Error getting labeled messages: {str(e)}")
            return []

    def get_starred_messages(self, max_results=10):
        """
        Get starred messages for task creation.
        """
        service = self._get_service()

        try:
            results = service.users().messages().list(
                userId='me',
                q='is:starred',
                maxResults=max_results
            ).execute()

            messages = results.get('messages', [])

            full_messages = []
            for msg in messages:
                full_msg = service.users().messages().get(
                    userId='me',
                    id=msg['id'],
                    format='full'
                ).execute()
                full_messages.append(full_msg)

            return full_messages

        except HttpError as e:
            logger.error(f"Error getting starred messages: {str(e)}")
            return []

    def create_task_from_email(self, message_id):
        """
        Create a NexPro task from an email message.
        Returns the created WorkInstance or None.
        """
        from core.models import GoogleSyncLog

        service = self._get_service()

        try:
            # Get the full message
            message = service.users().messages().get(
                userId='me',
                id=message_id,
                format='full'
            ).execute()

            # Extract message details
            headers = message.get('payload', {}).get('headers', [])
            subject = ''
            from_email = ''
            date_str = ''

            for header in headers:
                name = header.get('name', '').lower()
                if name == 'subject':
                    subject = header.get('value', '')
                elif name == 'from':
                    from_email = header.get('value', '')
                elif name == 'date':
                    date_str = header.get('value', '')

            # Extract snippet for description
            snippet = message.get('snippet', '')

            # Log the action
            GoogleSyncLog.objects.create(
                organization=self.google_connection.organization,
                user=self.google_connection.user,
                sync_type='GMAIL_TASK_CREATE',
                status='SUCCESS',
                google_message_id=message_id,
                details=f"Task creation initiated from email: {subject}"
            )

            # Return email details for task creation
            return {
                'message_id': message_id,
                'subject': subject,
                'from_email': from_email,
                'snippet': snippet,
                'date': date_str,
            }

        except HttpError as e:
            logger.error(f"Error getting email for task creation: {str(e)}")

            GoogleSyncLog.objects.create(
                organization=self.google_connection.organization,
                user=self.google_connection.user,
                sync_type='GMAIL_TASK_CREATE',
                status='FAILED',
                google_message_id=message_id,
                error_message=str(e)
            )
            return None

    def create_label(self, label_name):
        """
        Create a Gmail label if it doesn't exist.
        """
        service = self._get_service()

        try:
            # Check if label exists
            labels_response = service.users().labels().list(userId='me').execute()
            labels = labels_response.get('labels', [])

            for label in labels:
                if label['name'].lower() == label_name.lower():
                    return label

            # Create new label
            label = service.users().labels().create(
                userId='me',
                body={
                    'name': label_name,
                    'labelListVisibility': 'labelShow',
                    'messageListVisibility': 'show'
                }
            ).execute()

            logger.info(f"Created Gmail label: {label_name}")
            return label

        except HttpError as e:
            logger.error(f"Error creating label: {str(e)}")
            raise

    def remove_star_from_message(self, message_id):
        """
        Remove star from a message after task is created.
        """
        service = self._get_service()

        try:
            service.users().messages().modify(
                userId='me',
                id=message_id,
                body={'removeLabelIds': ['STARRED']}
            ).execute()

            logger.info(f"Removed star from message: {message_id}")
            return True

        except HttpError as e:
            logger.error(f"Error removing star: {str(e)}")
            return False

    def get_email_threads(self, query='', max_results=20):
        """
        Get email threads matching a query.
        Useful for linking emails to clients/tasks.
        """
        service = self._get_service()

        try:
            results = service.users().threads().list(
                userId='me',
                q=query,
                maxResults=max_results
            ).execute()

            return results.get('threads', [])

        except HttpError as e:
            logger.error(f"Error getting email threads: {str(e)}")
            return []
