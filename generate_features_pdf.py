"""
NexPro Features PDF Generator
Generates a comprehensive PDF document listing all implemented features.
"""

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, cm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
from datetime import datetime

def create_features_pdf():
    """Generate PDF with all NexPro features."""

    # Create PDF document
    filename = "NexPro_Features_List.pdf"
    doc = SimpleDocTemplate(
        filename,
        pagesize=A4,
        rightMargin=0.75*inch,
        leftMargin=0.75*inch,
        topMargin=0.75*inch,
        bottomMargin=0.75*inch
    )

    # Styles
    styles = getSampleStyleSheet()

    # Custom styles
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        spaceAfter=30,
        alignment=TA_CENTER,
        textColor=colors.HexColor('#6366f1')
    )

    subtitle_style = ParagraphStyle(
        'Subtitle',
        parent=styles['Normal'],
        fontSize=12,
        spaceAfter=20,
        alignment=TA_CENTER,
        textColor=colors.HexColor('#64748b')
    )

    category_style = ParagraphStyle(
        'Category',
        parent=styles['Heading2'],
        fontSize=14,
        spaceBefore=20,
        spaceAfter=10,
        textColor=colors.HexColor('#4f46e5'),
        borderColor=colors.HexColor('#e2e8f0'),
        borderWidth=1,
        borderPadding=5
    )

    feature_style = ParagraphStyle(
        'Feature',
        parent=styles['Normal'],
        fontSize=10,
        spaceBefore=3,
        spaceAfter=3,
        leftIndent=20,
        bulletIndent=10
    )

    section_header_style = ParagraphStyle(
        'SectionHeader',
        parent=styles['Heading3'],
        fontSize=11,
        spaceBefore=10,
        spaceAfter=5,
        textColor=colors.HexColor('#1e293b')
    )

    # Features data organized by category
    features = {
        "1. User & Organization Management": {
            "count": 9,
            "features": [
                "Multi-tenant organization support with complete data isolation",
                "User registration with organization creation (automatic tenant setup)",
                "JWT-based authentication with access and refresh tokens",
                "Role-based access control (Admin, Manager, Staff roles)",
                "Platform Admin (superuser) functionality for system-wide management",
                "User profile management with avatar upload",
                "Password reset via email with secure token links",
                "Organization settings and branding customization",
                "User invitation system with email notifications"
            ]
        },
        "2. Client Management": {
            "count": 8,
            "features": [
                "Full CRUD operations for client records",
                "Client categorization (Individual, Company, Partnership, Trust, LLP, HUF)",
                "Client status tracking (Active, Inactive, Pending)",
                "Contact information management (email, phone, address)",
                "Client search and filtering capabilities",
                "Client-wise task tracking and history",
                "Client notes and additional details storage",
                "Bulk client operations support"
            ]
        },
        "3. Task/Work Management": {
            "count": 12,
            "features": [
                "Complete task lifecycle management (CRUD operations)",
                "Task status workflow (Pending, In Progress, Under Review, Completed, Cancelled)",
                "Priority levels (Low, Medium, High, Critical)",
                "Task assignment to employees with workload visibility",
                "Due date tracking with automated reminders",
                "Recurring task support (Daily, Weekly, Monthly, Quarterly, Yearly, Custom)",
                "Task templates for quick creation",
                "File attachments for tasks",
                "Task comments and activity history",
                "Bulk task operations (status update, assignment, deletion)",
                "Task filtering by status, priority, client, assignee, date range",
                "Task search functionality"
            ]
        },
        "4. Work Types & Templates": {
            "count": 10,
            "features": [
                "Custom work type creation and management",
                "Work type categorization by service area",
                "Default due date settings per work type",
                "Recurring schedule configuration for work types",
                "Work type-based task templates",
                "Template library with predefined task structures",
                "Template cloning and customization",
                "Checklist items within templates",
                "Work type statistics and usage tracking",
                "Color coding for visual identification"
            ]
        },
        "5. Employee Management": {
            "count": 6,
            "features": [
                "Employee profile management",
                "Role assignment (Admin, Manager, Staff)",
                "Employee workload dashboard",
                "Task assignment history per employee",
                "Employee performance metrics",
                "Active/Inactive status management"
            ]
        },
        "6. Calendar & Scheduling": {
            "count": 4,
            "features": [
                "Interactive calendar view (Month, Week, Day)",
                "Task visualization on calendar by due date",
                "Drag-and-drop task rescheduling",
                "Color-coded events by status/priority"
            ]
        },
        "7. Reports & Analytics": {
            "count": 12,
            "features": [
                "Dashboard with key metrics and charts",
                "Task status distribution (pie charts)",
                "Client summary reports",
                "Work type analysis reports",
                "Staff productivity reports",
                "Status analysis reports",
                "Ad-hoc report generation with custom filters",
                "Date range presets (Today, Last 7 Days, Last 30 Days, This Month, etc.)",
                "PDF export for all report types",
                "Excel/CSV export functionality",
                "Print-friendly report formatting",
                "Saved report configurations"
            ]
        },
        "8. Notifications & Reminders": {
            "count": 11,
            "features": [
                "In-app notification center",
                "Email notifications for task assignments",
                "Due date reminder emails (configurable days before)",
                "Overdue task alerts",
                "Task status change notifications",
                "New task assignment notifications",
                "Comment mention notifications",
                "Daily digest emails (optional)",
                "Notification preferences per user",
                "Mark as read/unread functionality",
                "Bulk notification management"
            ]
        },
        "9. Credential Vault": {
            "count": 7,
            "features": [
                "Secure credential storage for client accounts",
                "Encrypted password storage",
                "Credential categorization (Tax Portal, Banking, Email, etc.)",
                "Copy-to-clipboard functionality for quick access",
                "Password visibility toggle",
                "Credential sharing within organization",
                "Audit logging for credential access"
            ]
        },
        "10. Platform Administration (Super Admin)": {
            "count": 11,
            "features": [
                "Organization management (view, edit, suspend)",
                "Trial management and extension",
                "User management across all organizations",
                "Subscription plan management",
                "Platform-wide analytics and metrics",
                "System health monitoring",
                "Email template management",
                "Platform settings configuration",
                "Audit logs viewing",
                "Bulk organization operations",
                "Revenue and subscription analytics"
            ]
        },
        "11. Subscription & Billing": {
            "count": 14,
            "features": [
                "Multiple subscription plans (Free, Starter, Professional, Enterprise)",
                "Trial period management (configurable duration)",
                "Feature limits by plan (clients, users, storage)",
                "Plan upgrade/downgrade functionality",
                "Subscription status tracking (Active, Trial, Expired, Cancelled)",
                "Billing history and invoices",
                "Payment integration ready (Razorpay/Stripe)",
                "Grace period handling for expired subscriptions",
                "Subscription renewal reminders",
                "Custom plan creation (Admin)",
                "Plan comparison display",
                "Usage tracking against plan limits",
                "Overage notifications",
                "Subscription analytics dashboard"
            ]
        },
        "12. Security & Compliance": {
            "count": 24,
            "features": [
                "JWT token-based authentication",
                "Token refresh mechanism",
                "Password hashing with Django's PBKDF2",
                "CORS configuration for API security",
                "CSRF protection",
                "XSS prevention",
                "SQL injection protection (Django ORM)",
                "Rate limiting on sensitive endpoints",
                "Secure password reset flow",
                "Session management",
                "Multi-tenant data isolation",
                "Role-based permission checks",
                "API endpoint authentication",
                "Secure file upload handling",
                "Environment variable configuration",
                "HTTPS enforcement (production)",
                "Secure cookie settings",
                "Input validation and sanitization",
                "Error handling without information leakage",
                "Audit trail for sensitive operations",
                "Credential encryption at rest",
                "Secure headers configuration",
                "Privacy policy and terms of service",
                "Cookie consent management"
            ]
        },
        "13. Settings & Configuration": {
            "count": 14,
            "features": [
                "Organization profile settings",
                "Notification preferences",
                "Email settings and templates",
                "Default task settings",
                "Working days configuration",
                "Date format preferences",
                "Timezone settings",
                "Logo and branding upload",
                "User preference management",
                "API key management",
                "Integration settings",
                "Backup configuration",
                "Data export options",
                "Account deletion/deactivation"
            ]
        }
    }

    # Build document content
    content = []

    # Title
    content.append(Paragraph("NexPro", title_style))
    content.append(Paragraph("Practice Management System", subtitle_style))
    content.append(Paragraph("Complete Features List", subtitle_style))
    content.append(Spacer(1, 10))
    content.append(Paragraph(f"Generated on: {datetime.now().strftime('%B %d, %Y')}", subtitle_style))
    content.append(Spacer(1, 30))

    # Executive Summary
    summary_style = ParagraphStyle(
        'Summary',
        parent=styles['Normal'],
        fontSize=11,
        spaceAfter=20,
        alignment=TA_JUSTIFY,
        leading=16
    )

    total_features = sum(cat["count"] for cat in features.values())

    summary_text = f"""
    NexPro is a comprehensive multi-tenant SaaS practice management solution designed specifically
    for Chartered Accountants and accounting firms. The platform offers <b>{total_features} fully implemented features</b>
    across <b>{len(features)} functional categories</b>, providing end-to-end management of clients, tasks,
    employees, credentials, and business operations.
    """
    content.append(Paragraph(summary_text.strip(), summary_style))
    content.append(Spacer(1, 20))

    # Summary Table
    summary_data = [["Category", "Features"]]
    for category, data in features.items():
        cat_name = category.split(". ", 1)[1] if ". " in category else category
        summary_data.append([cat_name, str(data["count"])])
    summary_data.append(["TOTAL", str(total_features)])

    summary_table = Table(summary_data, colWidths=[4.5*inch, 1*inch])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#6366f1')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('ALIGN', (1, 0), (1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 11),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
        ('TOPPADDING', (0, 0), (-1, 0), 10),
        ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#e0e7ff')),
        ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
        ('FONTSIZE', (0, 1), (-1, -1), 10),
        ('TOPPADDING', (0, 1), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 6),
        ('ROWBACKGROUNDS', (0, 1), (-1, -2), [colors.white, colors.HexColor('#f8fafc')]),
    ]))
    content.append(summary_table)
    content.append(PageBreak())

    # Detailed Features by Category
    content.append(Paragraph("Detailed Feature List", title_style))
    content.append(Spacer(1, 20))

    for category, data in features.items():
        # Category header
        content.append(Paragraph(f"{category} ({data['count']} features)", category_style))

        # Features list
        for feature in data["features"]:
            bullet_text = f"• {feature}"
            content.append(Paragraph(bullet_text, feature_style))

        content.append(Spacer(1, 10))

    # Footer section
    content.append(Spacer(1, 30))
    footer_style = ParagraphStyle(
        'Footer',
        parent=styles['Normal'],
        fontSize=9,
        alignment=TA_CENTER,
        textColor=colors.HexColor('#94a3b8')
    )
    content.append(Paragraph("─" * 60, footer_style))
    content.append(Spacer(1, 10))
    content.append(Paragraph("NexPro Practice Management System", footer_style))
    content.append(Paragraph("© 2024 All Rights Reserved", footer_style))

    # Build PDF
    doc.build(content)
    print(f"PDF generated successfully: {filename}")
    return filename

if __name__ == "__main__":
    create_features_pdf()
