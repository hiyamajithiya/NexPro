"""
Report generation service for creating PDF reports with charts and graphs.
Uses ReportLab for PDF generation and Matplotlib for chart creation.
"""

import io
import os
from datetime import datetime, date
from django.db.models import Count, Q
from django.conf import settings
from django.core.mail import EmailMessage

# ReportLab imports
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, cm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    Image, PageBreak, HRFlowable
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT

# Matplotlib for charts
import matplotlib
matplotlib.use('Agg')  # Non-interactive backend
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches

from core.models import (
    WorkInstance, Client, WorkType, User, Organization, ReportConfiguration
)


class ReportService:
    """Service for generating and sending PDF reports"""

    # Color scheme for charts
    STATUS_COLORS = {
        'NOT_STARTED': '#9E9E9E',  # Gray
        'STARTED': '#2196F3',      # Blue
        'PAUSED': '#FF9800',       # Orange
        'COMPLETED': '#4CAF50',    # Green
        'OVERDUE': '#F44336',      # Red
    }

    @staticmethod
    def get_report_data(organization, start_date, end_date):
        """
        Fetch all report data for the given organization and date range.
        Returns a dictionary with various statistics and breakdowns.
        """
        # Base queryset for this organization's tasks
        tasks = WorkInstance.objects.filter(
            organization=organization
        )

        # Filter tasks that have due dates in the period or were updated in the period
        period_tasks = tasks.filter(
            Q(due_date__gte=start_date, due_date__lte=end_date) |
            Q(completed_on__gte=start_date, completed_on__lte=end_date)
        )

        # Overall counts
        total_tasks = period_tasks.count()
        status_counts = dict(period_tasks.values('status').annotate(count=Count('id')).values_list('status', 'count'))

        # All-time overdue count (tasks currently overdue)
        all_overdue = tasks.filter(status='OVERDUE').count()

        # Summary statistics
        summary = {
            'total_tasks': total_tasks,
            'completed': status_counts.get('COMPLETED', 0),
            'overdue': status_counts.get('OVERDUE', 0),
            'in_progress': status_counts.get('STARTED', 0) + status_counts.get('PAUSED', 0),
            'not_started': status_counts.get('NOT_STARTED', 0),
            'all_overdue': all_overdue,
            'period_start': start_date,
            'period_end': end_date,
        }

        # Calculate completion rate
        if total_tasks > 0:
            summary['completion_rate'] = round((summary['completed'] / total_tasks) * 100, 1)
        else:
            summary['completion_rate'] = 0

        # Client-wise breakdown
        client_wise = period_tasks.values(
            'client_work__client__client_name',
            'client_work__client__client_code'
        ).annotate(
            total=Count('id'),
            completed=Count('id', filter=Q(status='COMPLETED')),
            overdue=Count('id', filter=Q(status='OVERDUE')),
            pending=Count('id', filter=Q(status__in=['NOT_STARTED', 'STARTED', 'PAUSED']))
        ).order_by('-total')[:20]  # Top 20 clients

        # Employee-wise breakdown
        employee_wise = period_tasks.exclude(
            assigned_to__isnull=True
        ).values(
            'assigned_to__first_name',
            'assigned_to__last_name',
            'assigned_to__email'
        ).annotate(
            total=Count('id'),
            completed=Count('id', filter=Q(status='COMPLETED')),
            overdue=Count('id', filter=Q(status='OVERDUE')),
            pending=Count('id', filter=Q(status__in=['NOT_STARTED', 'STARTED', 'PAUSED']))
        ).order_by('-total')

        # Work type-wise breakdown
        work_type_wise = period_tasks.values(
            'client_work__work_type__work_name',
            'client_work__work_type__statutory_form'
        ).annotate(
            total=Count('id'),
            completed=Count('id', filter=Q(status='COMPLETED')),
            overdue=Count('id', filter=Q(status='OVERDUE')),
            pending=Count('id', filter=Q(status__in=['NOT_STARTED', 'STARTED', 'PAUSED']))
        ).order_by('-total')

        # Status breakdown for charts
        status_breakdown = {
            'NOT_STARTED': status_counts.get('NOT_STARTED', 0),
            'STARTED': status_counts.get('STARTED', 0),
            'PAUSED': status_counts.get('PAUSED', 0),
            'COMPLETED': status_counts.get('COMPLETED', 0),
            'OVERDUE': status_counts.get('OVERDUE', 0),
        }

        # Overdue tasks list
        overdue_tasks = tasks.filter(status='OVERDUE').select_related(
            'client_work__client',
            'client_work__work_type',
            'assigned_to'
        ).values(
            'client_work__client__client_name',
            'client_work__work_type__work_name',
            'period_label',
            'due_date',
            'assigned_to__first_name',
            'assigned_to__last_name'
        ).order_by('due_date')[:50]  # Limit to 50

        # Upcoming dues (next 7 days)
        today = date.today()
        upcoming_tasks = tasks.filter(
            due_date__gte=today,
            due_date__lte=today.replace(day=today.day + 7) if today.day <= 24 else today,
            status__in=['NOT_STARTED', 'STARTED', 'PAUSED']
        ).select_related(
            'client_work__client',
            'client_work__work_type',
            'assigned_to'
        ).values(
            'client_work__client__client_name',
            'client_work__work_type__work_name',
            'period_label',
            'due_date',
            'assigned_to__first_name',
            'assigned_to__last_name'
        ).order_by('due_date')[:30]

        return {
            'summary': summary,
            'status_breakdown': status_breakdown,
            'client_wise': list(client_wise),
            'employee_wise': list(employee_wise),
            'work_type_wise': list(work_type_wise),
            'overdue_tasks': list(overdue_tasks),
            'upcoming_tasks': list(upcoming_tasks),
        }

    @staticmethod
    def create_status_pie_chart(status_breakdown):
        """Create a pie chart showing task status distribution"""
        # Filter out zero values
        labels = []
        sizes = []
        colors_list = []

        status_labels = {
            'NOT_STARTED': 'Not Started',
            'STARTED': 'Started',
            'PAUSED': 'Paused',
            'COMPLETED': 'Completed',
            'OVERDUE': 'Overdue',
        }

        for status, count in status_breakdown.items():
            if count > 0:
                labels.append(f"{status_labels.get(status, status)} ({count})")
                sizes.append(count)
                colors_list.append(ReportService.STATUS_COLORS.get(status, '#666666'))

        if not sizes:
            return None

        fig, ax = plt.subplots(figsize=(6, 4))
        wedges, texts, autotexts = ax.pie(
            sizes,
            labels=labels,
            colors=colors_list,
            autopct='%1.1f%%',
            startangle=90,
            pctdistance=0.75
        )

        ax.set_title('Task Status Distribution', fontsize=12, fontweight='bold', pad=10)

        # Style the percentage text
        for autotext in autotexts:
            autotext.set_fontsize(9)
            autotext.set_color('white')
            autotext.set_weight('bold')

        plt.tight_layout()

        # Save to buffer
        buffer = io.BytesIO()
        plt.savefig(buffer, format='png', dpi=150, bbox_inches='tight', facecolor='white')
        plt.close(fig)
        buffer.seek(0)

        return buffer

    @staticmethod
    def create_employee_bar_chart(employee_wise):
        """Create a horizontal bar chart showing employee-wise task distribution"""
        if not employee_wise:
            return None

        # Get employee names and counts
        employees = []
        completed = []
        pending = []
        overdue = []

        for emp in employee_wise[:10]:  # Top 10 employees
            name = f"{emp.get('assigned_to__first_name', '') or ''} {emp.get('assigned_to__last_name', '') or ''}".strip()
            if not name:
                name = emp.get('assigned_to__email', 'Unknown')
            employees.append(name[:20])  # Truncate long names
            completed.append(emp.get('completed', 0))
            pending.append(emp.get('pending', 0))
            overdue.append(emp.get('overdue', 0))

        if not employees:
            return None

        fig, ax = plt.subplots(figsize=(8, 5))

        y_pos = range(len(employees))
        bar_height = 0.25

        # Create stacked horizontal bars
        bars1 = ax.barh([y - bar_height for y in y_pos], completed, bar_height,
                        label='Completed', color=ReportService.STATUS_COLORS['COMPLETED'])
        bars2 = ax.barh(y_pos, pending, bar_height,
                        label='Pending', color=ReportService.STATUS_COLORS['STARTED'])
        bars3 = ax.barh([y + bar_height for y in y_pos], overdue, bar_height,
                        label='Overdue', color=ReportService.STATUS_COLORS['OVERDUE'])

        ax.set_yticks(y_pos)
        ax.set_yticklabels(employees)
        ax.set_xlabel('Number of Tasks')
        ax.set_title('Employee-wise Task Distribution', fontsize=12, fontweight='bold')
        ax.legend(loc='lower right')
        ax.invert_yaxis()

        plt.tight_layout()

        # Save to buffer
        buffer = io.BytesIO()
        plt.savefig(buffer, format='png', dpi=150, bbox_inches='tight', facecolor='white')
        plt.close(fig)
        buffer.seek(0)

        return buffer

    @staticmethod
    def create_work_type_chart(work_type_wise):
        """Create a bar chart showing task category-wise task distribution"""
        if not work_type_wise:
            return None

        work_types = []
        totals = []
        completed = []

        for wt in work_type_wise[:8]:  # Top 8 task categories
            name = wt.get('client_work__work_type__work_name', 'Unknown')
            work_types.append(name[:15])  # Truncate long names
            totals.append(wt.get('total', 0))
            completed.append(wt.get('completed', 0))

        if not work_types:
            return None

        fig, ax = plt.subplots(figsize=(8, 4))

        x = range(len(work_types))
        width = 0.35

        bars1 = ax.bar([i - width/2 for i in x], totals, width,
                       label='Total', color='#2196F3')
        bars2 = ax.bar([i + width/2 for i in x], completed, width,
                       label='Completed', color='#4CAF50')

        ax.set_xlabel('Task Category')
        ax.set_ylabel('Number of Tasks')
        ax.set_title('Task Category-wise Task Distribution', fontsize=12, fontweight='bold')
        ax.set_xticks(x)
        ax.set_xticklabels(work_types, rotation=45, ha='right')
        ax.legend()

        plt.tight_layout()

        # Save to buffer
        buffer = io.BytesIO()
        plt.savefig(buffer, format='png', dpi=150, bbox_inches='tight', facecolor='white')
        plt.close(fig)
        buffer.seek(0)

        return buffer

    @staticmethod
    def generate_pdf_report(report_config, data):
        """
        Generate a PDF report based on configuration and data.
        Returns: BytesIO buffer containing the PDF
        """
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=0.75*inch,
            leftMargin=0.75*inch,
            topMargin=0.75*inch,
            bottomMargin=0.75*inch
        )

        # Styles
        styles = getSampleStyleSheet()
        styles.add(ParagraphStyle(
            name='ReportTitle',
            parent=styles['Heading1'],
            fontSize=18,
            spaceAfter=20,
            alignment=TA_CENTER,
            textColor=colors.HexColor('#1a237e')
        ))
        styles.add(ParagraphStyle(
            name='SectionTitle',
            parent=styles['Heading2'],
            fontSize=14,
            spaceBefore=15,
            spaceAfter=10,
            textColor=colors.HexColor('#303f9f')
        ))
        styles.add(ParagraphStyle(
            name='SubTitle',
            parent=styles['Normal'],
            fontSize=10,
            alignment=TA_CENTER,
            textColor=colors.grey
        ))

        elements = []

        # Title
        org_name = report_config.organization.name if report_config.organization else 'Organization'
        elements.append(Paragraph(f"{org_name} - Task Report", styles['ReportTitle']))

        # Subtitle with date range
        summary = data['summary']
        date_range = f"Period: {summary['period_start'].strftime('%d %b %Y')} - {summary['period_end'].strftime('%d %b %Y')}"
        elements.append(Paragraph(date_range, styles['SubTitle']))
        elements.append(Paragraph(f"Generated on: {datetime.now().strftime('%d %b %Y at %H:%M')}", styles['SubTitle']))
        elements.append(Spacer(1, 20))

        # Horizontal line
        elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#e0e0e0')))
        elements.append(Spacer(1, 15))

        # Summary Section
        if report_config.include_summary:
            elements.append(Paragraph("Executive Summary", styles['SectionTitle']))

            summary_data = [
                ['Metric', 'Value'],
                ['Total Tasks', str(summary['total_tasks'])],
                ['Completed', f"{summary['completed']} ({summary['completion_rate']}%)"],
                ['In Progress', str(summary['in_progress'])],
                ['Not Started', str(summary['not_started'])],
                ['Overdue', str(summary['overdue'])],
                ['All Overdue Tasks (Current)', str(summary['all_overdue'])],
            ]

            summary_table = Table(summary_data, colWidths=[3*inch, 2*inch])
            summary_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#3f51b5')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 11),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
                ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#f5f5f5')),
                ('TEXTCOLOR', (0, 1), (-1, -1), colors.black),
                ('FONTSIZE', (0, 1), (-1, -1), 10),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e0e0e0')),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('TOPPADDING', (0, 1), (-1, -1), 6),
                ('BOTTOMPADDING', (0, 1), (-1, -1), 6),
            ]))
            elements.append(summary_table)
            elements.append(Spacer(1, 20))

        # Status Breakdown Chart
        if report_config.include_charts and report_config.include_status_breakdown:
            pie_chart_buffer = ReportService.create_status_pie_chart(data['status_breakdown'])
            if pie_chart_buffer:
                elements.append(Paragraph("Status Distribution", styles['SectionTitle']))
                img = Image(pie_chart_buffer, width=5*inch, height=3.5*inch)
                elements.append(img)
                elements.append(Spacer(1, 20))

        # Employee-wise breakdown
        if report_config.include_employee_wise and data['employee_wise']:
            elements.append(Paragraph("Employee-wise Task Breakdown", styles['SectionTitle']))

            # Add chart if enabled
            if report_config.include_charts:
                emp_chart_buffer = ReportService.create_employee_bar_chart(data['employee_wise'])
                if emp_chart_buffer:
                    img = Image(emp_chart_buffer, width=6*inch, height=4*inch)
                    elements.append(img)
                    elements.append(Spacer(1, 10))

            # Table
            emp_data = [['Employee', 'Total', 'Completed', 'Pending', 'Overdue']]
            for emp in data['employee_wise'][:15]:
                name = f"{emp.get('assigned_to__first_name', '') or ''} {emp.get('assigned_to__last_name', '') or ''}".strip()
                if not name:
                    name = emp.get('assigned_to__email', 'Unknown')
                emp_data.append([
                    name[:25],
                    str(emp.get('total', 0)),
                    str(emp.get('completed', 0)),
                    str(emp.get('pending', 0)),
                    str(emp.get('overdue', 0))
                ])

            emp_table = Table(emp_data, colWidths=[2.5*inch, 0.8*inch, 1*inch, 0.9*inch, 0.9*inch])
            emp_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#3f51b5')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 10),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
                ('BACKGROUND', (0, 1), (-1, -1), colors.white),
                ('TEXTCOLOR', (0, 1), (-1, -1), colors.black),
                ('FONTSIZE', (0, 1), (-1, -1), 9),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e0e0e0')),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f9f9f9')]),
            ]))
            elements.append(emp_table)
            elements.append(Spacer(1, 20))

        # Task Category-wise breakdown
        if report_config.include_work_type_wise and data['work_type_wise']:
            elements.append(Paragraph("Task Category-wise Task Breakdown", styles['SectionTitle']))

            # Add chart if enabled
            if report_config.include_charts:
                wt_chart_buffer = ReportService.create_work_type_chart(data['work_type_wise'])
                if wt_chart_buffer:
                    img = Image(wt_chart_buffer, width=6*inch, height=3.5*inch)
                    elements.append(img)
                    elements.append(Spacer(1, 10))

            # Table
            wt_data = [['Task Category', 'Total', 'Completed', 'Pending', 'Overdue']]
            for wt in data['work_type_wise'][:15]:
                name = wt.get('client_work__work_type__work_name', 'Unknown')
                form = wt.get('client_work__work_type__statutory_form', '')
                display_name = f"{name}" + (f" ({form})" if form else "")
                wt_data.append([
                    display_name[:30],
                    str(wt.get('total', 0)),
                    str(wt.get('completed', 0)),
                    str(wt.get('pending', 0)),
                    str(wt.get('overdue', 0))
                ])

            wt_table = Table(wt_data, colWidths=[2.5*inch, 0.8*inch, 1*inch, 0.9*inch, 0.9*inch])
            wt_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#3f51b5')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 10),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
                ('BACKGROUND', (0, 1), (-1, -1), colors.white),
                ('TEXTCOLOR', (0, 1), (-1, -1), colors.black),
                ('FONTSIZE', (0, 1), (-1, -1), 9),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e0e0e0')),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f9f9f9')]),
            ]))
            elements.append(wt_table)
            elements.append(Spacer(1, 20))

        # Client-wise breakdown
        if report_config.include_client_wise and data['client_wise']:
            elements.append(Paragraph("Client-wise Task Breakdown", styles['SectionTitle']))

            client_data = [['Client', 'Code', 'Total', 'Completed', 'Pending', 'Overdue']]
            for client in data['client_wise'][:20]:
                client_data.append([
                    (client.get('client_work__client__client_name', 'Unknown') or 'Unknown')[:25],
                    (client.get('client_work__client__client_code', '') or '')[:10],
                    str(client.get('total', 0)),
                    str(client.get('completed', 0)),
                    str(client.get('pending', 0)),
                    str(client.get('overdue', 0))
                ])

            client_table = Table(client_data, colWidths=[2*inch, 0.8*inch, 0.7*inch, 0.9*inch, 0.8*inch, 0.8*inch])
            client_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#3f51b5')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (2, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 9),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
                ('BACKGROUND', (0, 1), (-1, -1), colors.white),
                ('TEXTCOLOR', (0, 1), (-1, -1), colors.black),
                ('FONTSIZE', (0, 1), (-1, -1), 8),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e0e0e0')),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f9f9f9')]),
            ]))
            elements.append(client_table)
            elements.append(Spacer(1, 20))

        # Overdue Tasks List
        if report_config.include_overdue_list and data['overdue_tasks']:
            elements.append(PageBreak())
            elements.append(Paragraph("Overdue Tasks", styles['SectionTitle']))

            overdue_data = [['Client', 'Task Category', 'Period', 'Due Date', 'Assigned To']]
            for task in data['overdue_tasks'][:30]:
                assigned = f"{task.get('assigned_to__first_name', '') or ''} {task.get('assigned_to__last_name', '') or ''}".strip()
                if not assigned:
                    assigned = 'Unassigned'
                due_date = task.get('due_date')
                if due_date:
                    due_date_str = due_date.strftime('%d-%b-%Y') if hasattr(due_date, 'strftime') else str(due_date)
                else:
                    due_date_str = 'N/A'

                overdue_data.append([
                    (task.get('client_work__client__client_name', 'Unknown') or 'Unknown')[:20],
                    (task.get('client_work__work_type__work_name', 'Unknown') or 'Unknown')[:20],
                    (task.get('period_label', '') or '')[:15],
                    due_date_str,
                    assigned[:15]
                ])

            overdue_table = Table(overdue_data, colWidths=[1.5*inch, 1.5*inch, 1.2*inch, 1*inch, 1.3*inch])
            overdue_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#d32f2f')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 9),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
                ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#ffebee')),
                ('TEXTCOLOR', (0, 1), (-1, -1), colors.black),
                ('FONTSIZE', (0, 1), (-1, -1), 8),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e0e0e0')),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ]))
            elements.append(overdue_table)
            elements.append(Spacer(1, 20))

        # Upcoming Due Tasks
        if report_config.include_upcoming_dues and data['upcoming_tasks']:
            elements.append(Paragraph("Upcoming Due Tasks (Next 7 Days)", styles['SectionTitle']))

            upcoming_data = [['Client', 'Task Category', 'Period', 'Due Date', 'Assigned To']]
            for task in data['upcoming_tasks'][:20]:
                assigned = f"{task.get('assigned_to__first_name', '') or ''} {task.get('assigned_to__last_name', '') or ''}".strip()
                if not assigned:
                    assigned = 'Unassigned'
                due_date = task.get('due_date')
                if due_date:
                    due_date_str = due_date.strftime('%d-%b-%Y') if hasattr(due_date, 'strftime') else str(due_date)
                else:
                    due_date_str = 'N/A'

                upcoming_data.append([
                    (task.get('client_work__client__client_name', 'Unknown') or 'Unknown')[:20],
                    (task.get('client_work__work_type__work_name', 'Unknown') or 'Unknown')[:20],
                    (task.get('period_label', '') or '')[:15],
                    due_date_str,
                    assigned[:15]
                ])

            upcoming_table = Table(upcoming_data, colWidths=[1.5*inch, 1.5*inch, 1.2*inch, 1*inch, 1.3*inch])
            upcoming_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#ff9800')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 9),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
                ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#fff8e1')),
                ('TEXTCOLOR', (0, 1), (-1, -1), colors.black),
                ('FONTSIZE', (0, 1), (-1, -1), 8),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e0e0e0')),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ]))
            elements.append(upcoming_table)

        # Build PDF
        doc.build(elements)
        buffer.seek(0)

        return buffer

    @staticmethod
    def send_report_email(report_config, pdf_buffer):
        """
        Send the generated PDF report via email.
        Returns: (success: bool, error_message: str or None)
        """
        try:
            recipients = report_config.get_recipient_list()
            if not recipients:
                return False, "No recipients configured"

            org_name = report_config.organization.name if report_config.organization else 'NexCA'
            subject = f"{org_name} - {report_config.name} - {datetime.now().strftime('%d %b %Y')}"

            body = f"""
Dear Admin,

Please find attached the {report_config.name} for {org_name}.

Report Period: {report_config.get_report_period_display()}
Generated on: {datetime.now().strftime('%d %b %Y at %H:%M')}

This is an automated report. For any questions, please contact your system administrator.

Best regards,
NexCA Report System
            """

            email = EmailMessage(
                subject=subject,
                body=body,
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=recipients
            )

            # Attach PDF
            filename = f"{org_name.replace(' ', '_')}_Report_{datetime.now().strftime('%Y%m%d')}.pdf"
            email.attach(filename, pdf_buffer.getvalue(), 'application/pdf')

            email.send(fail_silently=False)

            return True, None

        except Exception as e:
            return False, str(e)

    @staticmethod
    def generate_and_send_report(report_config):
        """
        Generate and send a report based on configuration.
        Updates the report_config with last_sent info.
        Returns: (success: bool, error_message: str or None)
        """
        from django.utils import timezone

        try:
            # Get date range
            start_date, end_date = report_config.get_period_dates()

            # Fetch data
            data = ReportService.get_report_data(
                report_config.organization,
                start_date,
                end_date
            )

            # Generate PDF
            pdf_buffer = ReportService.generate_pdf_report(report_config, data)

            # Send email
            success, error = ReportService.send_report_email(report_config, pdf_buffer)

            # Update config
            report_config.last_sent_at = timezone.now()
            report_config.last_sent_status = 'SUCCESS' if success else f'FAILED: {error}'
            report_config.save(update_fields=['last_sent_at', 'last_sent_status'])

            return success, error

        except Exception as e:
            report_config.last_sent_at = timezone.now()
            report_config.last_sent_status = f'ERROR: {str(e)}'
            report_config.save(update_fields=['last_sent_at', 'last_sent_status'])
            return False, str(e)

    @staticmethod
    def should_send_report_today(report_config):
        """
        Check if a report should be sent today based on its frequency configuration.
        """
        today = date.today()
        weekday = today.weekday()  # 0 = Monday, 6 = Sunday

        if report_config.frequency == 'DAILY':
            return True
        elif report_config.frequency == 'WEEKLY':
            return weekday == report_config.day_of_week
        elif report_config.frequency == 'MONTHLY':
            return today.day == report_config.day_of_month

        return False

    @staticmethod
    def get_adhoc_report_data(organization, start_date, end_date, report_type, filters=None):
        """
        Fetch ad-hoc report data based on report type and filters.
        Returns a dictionary with statistics based on report type.
        """
        from django.db.models import Sum
        from django.db.models.functions import Coalesce
        from datetime import timedelta

        filters = filters or {}

        # Base queryset for this organization's tasks
        tasks = WorkInstance.objects.filter(organization=organization)

        # Apply date filters
        if start_date:
            tasks = tasks.filter(due_date__gte=start_date)
        if end_date:
            tasks = tasks.filter(due_date__lte=end_date)

        # Apply optional filters
        if filters.get('client_id') and filters['client_id'] != 'ALL':
            tasks = tasks.filter(client_work__client_id=filters['client_id'])
        if filters.get('work_type_id') and filters['work_type_id'] != 'ALL':
            tasks = tasks.filter(client_work__work_type_id=filters['work_type_id'])
        if filters.get('status') and filters['status'] != 'ALL':
            tasks = tasks.filter(status=filters['status'])
        if filters.get('assigned_to') and filters['assigned_to'] != 'ALL':
            tasks = tasks.filter(assigned_to_id=filters['assigned_to'])

        # Get all filtered tasks for detail table
        task_list = list(tasks.select_related(
            'client_work__client',
            'client_work__work_type',
            'assigned_to'
        ).values(
            'id', 'status', 'due_date', 'period_label', 'completed_on',
            'client_work__client__client_name',
            'client_work__client__client_code',
            'client_work__work_type__work_name',
            'assigned_to__first_name',
            'assigned_to__last_name',
            'assigned_to__username',
            'time_spent_minutes'
        ))

        # Calculate summary statistics
        total_tasks = tasks.count()
        status_counts = dict(tasks.values('status').annotate(count=Count('id')).values_list('status', 'count'))

        summary = {
            'total_tasks': total_tasks,
            'completed': status_counts.get('COMPLETED', 0),
            'overdue': status_counts.get('OVERDUE', 0),
            'in_progress': status_counts.get('STARTED', 0) + status_counts.get('PAUSED', 0),
            'not_started': status_counts.get('NOT_STARTED', 0),
            'period_start': start_date,
            'period_end': end_date,
            'report_type': report_type,
        }

        if total_tasks > 0:
            summary['completion_rate'] = round((summary['completed'] / total_tasks) * 100, 1)
        else:
            summary['completion_rate'] = 0

        # Generate specific report data based on type
        if report_type == 'TASK_SUMMARY':
            chart_data = {
                'NOT_STARTED': status_counts.get('NOT_STARTED', 0),
                'STARTED': status_counts.get('STARTED', 0),
                'PAUSED': status_counts.get('PAUSED', 0),
                'COMPLETED': status_counts.get('COMPLETED', 0),
                'OVERDUE': status_counts.get('OVERDUE', 0),
            }
            return {'summary': summary, 'status_breakdown': chart_data, 'tasks': task_list}

        elif report_type == 'CLIENT_SUMMARY':
            client_wise = tasks.values(
                'client_work__client__client_name',
                'client_work__client__client_code'
            ).annotate(
                total=Count('id'),
                completed=Count('id', filter=Q(status='COMPLETED')),
                overdue=Count('id', filter=Q(status='OVERDUE')),
                pending=Count('id', filter=Q(status__in=['NOT_STARTED', 'STARTED', 'PAUSED']))
            ).order_by('-total')[:20]
            return {'summary': summary, 'client_wise': list(client_wise), 'tasks': task_list}

        elif report_type == 'WORK_TYPE_SUMMARY':
            work_type_wise = tasks.values(
                'client_work__work_type__work_name',
                'client_work__work_type__statutory_form'
            ).annotate(
                total=Count('id'),
                completed=Count('id', filter=Q(status='COMPLETED')),
                overdue=Count('id', filter=Q(status='OVERDUE')),
                pending=Count('id', filter=Q(status__in=['NOT_STARTED', 'STARTED', 'PAUSED']))
            ).order_by('-total')
            return {'summary': summary, 'work_type_wise': list(work_type_wise), 'tasks': task_list}

        elif report_type == 'STAFF_PRODUCTIVITY':
            employee_wise = tasks.exclude(
                assigned_to__isnull=True
            ).values(
                'assigned_to__first_name',
                'assigned_to__last_name',
                'assigned_to__email'
            ).annotate(
                total=Count('id'),
                completed=Count('id', filter=Q(status='COMPLETED')),
                overdue=Count('id', filter=Q(status='OVERDUE')),
                pending=Count('id', filter=Q(status__in=['NOT_STARTED', 'STARTED', 'PAUSED'])),
                total_time=Coalesce(Sum('time_spent_minutes'), 0)
            ).order_by('-total')
            return {'summary': summary, 'employee_wise': list(employee_wise), 'tasks': task_list}

        elif report_type == 'STATUS_ANALYSIS':
            status_breakdown = {
                'NOT_STARTED': status_counts.get('NOT_STARTED', 0),
                'STARTED': status_counts.get('STARTED', 0),
                'PAUSED': status_counts.get('PAUSED', 0),
                'COMPLETED': status_counts.get('COMPLETED', 0),
                'OVERDUE': status_counts.get('OVERDUE', 0),
            }
            return {'summary': summary, 'status_breakdown': status_breakdown, 'tasks': task_list}

        return {'summary': summary, 'tasks': task_list}

    @staticmethod
    def generate_adhoc_pdf_report(organization, report_type, data, title=None):
        """
        Generate a PDF for ad-hoc reports with custom parameters.
        Returns: BytesIO buffer containing the PDF
        """
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=0.75*inch,
            leftMargin=0.75*inch,
            topMargin=0.75*inch,
            bottomMargin=0.75*inch
        )

        # Styles
        styles = getSampleStyleSheet()
        styles.add(ParagraphStyle(
            name='ReportTitle',
            parent=styles['Heading1'],
            fontSize=18,
            spaceAfter=20,
            alignment=TA_CENTER,
            textColor=colors.HexColor('#1a237e')
        ))
        styles.add(ParagraphStyle(
            name='SectionTitle',
            parent=styles['Heading2'],
            fontSize=14,
            spaceBefore=15,
            spaceAfter=10,
            textColor=colors.HexColor('#303f9f')
        ))
        styles.add(ParagraphStyle(
            name='SubTitle',
            parent=styles['Normal'],
            fontSize=10,
            alignment=TA_CENTER,
            textColor=colors.grey
        ))

        elements = []

        # Report type labels
        report_type_labels = {
            'TASK_SUMMARY': 'Task Summary Report',
            'CLIENT_SUMMARY': 'Client Summary Report',
            'WORK_TYPE_SUMMARY': 'Task Category Summary Report',
            'STAFF_PRODUCTIVITY': 'Staff Productivity Report',
            'STATUS_ANALYSIS': 'Status Analysis Report',
        }

        # Title
        org_name = organization.name if organization else 'Organization'
        report_title = title or report_type_labels.get(report_type, 'Ad-hoc Report')
        elements.append(Paragraph(f"{org_name} - {report_title}", styles['ReportTitle']))

        # Subtitle with date range
        summary = data.get('summary', {})
        period_start = summary.get('period_start')
        period_end = summary.get('period_end')
        if period_start and period_end:
            if hasattr(period_start, 'strftime'):
                date_range = f"Period: {period_start.strftime('%d %b %Y')} - {period_end.strftime('%d %b %Y')}"
            else:
                date_range = f"Period: {period_start} - {period_end}"
            elements.append(Paragraph(date_range, styles['SubTitle']))
        elements.append(Paragraph(f"Generated on: {datetime.now().strftime('%d %b %Y at %H:%M')}", styles['SubTitle']))
        elements.append(Spacer(1, 20))

        # Horizontal line
        elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#e0e0e0')))
        elements.append(Spacer(1, 15))

        # Summary Section
        elements.append(Paragraph("Executive Summary", styles['SectionTitle']))
        summary_data = [
            ['Metric', 'Value'],
            ['Total Tasks', str(summary.get('total_tasks', 0))],
            ['Completed', f"{summary.get('completed', 0)} ({summary.get('completion_rate', 0)}%)"],
            ['In Progress', str(summary.get('in_progress', 0))],
            ['Not Started', str(summary.get('not_started', 0))],
            ['Overdue', str(summary.get('overdue', 0))],
        ]

        summary_table = Table(summary_data, colWidths=[3*inch, 2*inch])
        summary_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#3f51b5')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 11),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
            ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#f5f5f5')),
            ('TEXTCOLOR', (0, 1), (-1, -1), colors.black),
            ('FONTSIZE', (0, 1), (-1, -1), 10),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e0e0e0')),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 1), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 1), (-1, -1), 6),
        ]))
        elements.append(summary_table)
        elements.append(Spacer(1, 20))

        # Status Chart
        if 'status_breakdown' in data:
            pie_chart_buffer = ReportService.create_status_pie_chart(data['status_breakdown'])
            if pie_chart_buffer:
                elements.append(Paragraph("Status Distribution", styles['SectionTitle']))
                img = Image(pie_chart_buffer, width=5*inch, height=3.5*inch)
                elements.append(img)
                elements.append(Spacer(1, 20))

        # Client-wise breakdown
        if 'client_wise' in data and data['client_wise']:
            elements.append(Paragraph("Client-wise Task Breakdown", styles['SectionTitle']))
            client_data = [['Client', 'Code', 'Total', 'Completed', 'Pending', 'Overdue']]
            for client in data['client_wise'][:20]:
                client_data.append([
                    (client.get('client_work__client__client_name', 'Unknown') or 'Unknown')[:25],
                    (client.get('client_work__client__client_code', '') or '')[:10],
                    str(client.get('total', 0)),
                    str(client.get('completed', 0)),
                    str(client.get('pending', 0)),
                    str(client.get('overdue', 0))
                ])

            client_table = Table(client_data, colWidths=[2*inch, 0.8*inch, 0.7*inch, 0.9*inch, 0.8*inch, 0.8*inch])
            client_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#3f51b5')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (2, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 9),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
                ('BACKGROUND', (0, 1), (-1, -1), colors.white),
                ('TEXTCOLOR', (0, 1), (-1, -1), colors.black),
                ('FONTSIZE', (0, 1), (-1, -1), 8),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e0e0e0')),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f9f9f9')]),
            ]))
            elements.append(client_table)
            elements.append(Spacer(1, 20))

        # Task Category-wise breakdown
        if 'work_type_wise' in data and data['work_type_wise']:
            elements.append(Paragraph("Task Category-wise Task Breakdown", styles['SectionTitle']))

            # Chart
            wt_chart_buffer = ReportService.create_work_type_chart(data['work_type_wise'])
            if wt_chart_buffer:
                img = Image(wt_chart_buffer, width=6*inch, height=3.5*inch)
                elements.append(img)
                elements.append(Spacer(1, 10))

            wt_data = [['Task Category', 'Total', 'Completed', 'Pending', 'Overdue']]
            for wt in data['work_type_wise'][:15]:
                name = wt.get('client_work__work_type__work_name', 'Unknown')
                wt_data.append([
                    name[:30],
                    str(wt.get('total', 0)),
                    str(wt.get('completed', 0)),
                    str(wt.get('pending', 0)),
                    str(wt.get('overdue', 0))
                ])

            wt_table = Table(wt_data, colWidths=[2.5*inch, 0.8*inch, 1*inch, 0.9*inch, 0.9*inch])
            wt_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#3f51b5')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 10),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
                ('BACKGROUND', (0, 1), (-1, -1), colors.white),
                ('TEXTCOLOR', (0, 1), (-1, -1), colors.black),
                ('FONTSIZE', (0, 1), (-1, -1), 9),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e0e0e0')),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f9f9f9')]),
            ]))
            elements.append(wt_table)
            elements.append(Spacer(1, 20))

        # Employee-wise breakdown
        if 'employee_wise' in data and data['employee_wise']:
            elements.append(Paragraph("Staff Productivity Summary", styles['SectionTitle']))

            # Chart
            emp_chart_buffer = ReportService.create_employee_bar_chart(data['employee_wise'])
            if emp_chart_buffer:
                img = Image(emp_chart_buffer, width=6*inch, height=4*inch)
                elements.append(img)
                elements.append(Spacer(1, 10))

            emp_data = [['Employee', 'Total', 'Completed', 'Pending', 'Overdue', 'Time (hrs)']]
            for emp in data['employee_wise'][:15]:
                name = f"{emp.get('assigned_to__first_name', '') or ''} {emp.get('assigned_to__last_name', '') or ''}".strip()
                if not name:
                    name = emp.get('assigned_to__email', 'Unknown')
                time_hrs = round(emp.get('total_time', 0) / 60, 1) if emp.get('total_time') else 0
                emp_data.append([
                    name[:25],
                    str(emp.get('total', 0)),
                    str(emp.get('completed', 0)),
                    str(emp.get('pending', 0)),
                    str(emp.get('overdue', 0)),
                    str(time_hrs)
                ])

            emp_table = Table(emp_data, colWidths=[2*inch, 0.7*inch, 0.9*inch, 0.8*inch, 0.8*inch, 0.9*inch])
            emp_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#3f51b5')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 10),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
                ('BACKGROUND', (0, 1), (-1, -1), colors.white),
                ('TEXTCOLOR', (0, 1), (-1, -1), colors.black),
                ('FONTSIZE', (0, 1), (-1, -1), 9),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e0e0e0')),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f9f9f9')]),
            ]))
            elements.append(emp_table)
            elements.append(Spacer(1, 20))

        # Task Details Table (limited to 50)
        tasks = data.get('tasks', [])
        if tasks:
            elements.append(PageBreak())
            elements.append(Paragraph(f"Task Details ({len(tasks)} records)", styles['SectionTitle']))

            task_data = [['Client', 'Task Category', 'Period', 'Due Date', 'Status', 'Assigned To']]
            for task in tasks[:50]:
                assigned = f"{task.get('assigned_to__first_name', '') or ''} {task.get('assigned_to__last_name', '') or ''}".strip()
                if not assigned:
                    assigned = task.get('assigned_to__username', 'Unassigned')
                due_date = task.get('due_date')
                if due_date:
                    due_date_str = due_date.strftime('%d-%b-%Y') if hasattr(due_date, 'strftime') else str(due_date)
                else:
                    due_date_str = 'N/A'
                status = task.get('status', 'N/A').replace('_', ' ')

                task_data.append([
                    (task.get('client_work__client__client_name', 'Unknown') or 'Unknown')[:20],
                    (task.get('client_work__work_type__work_name', 'Unknown') or 'Unknown')[:18],
                    (task.get('period_label', '') or '')[:12],
                    due_date_str,
                    status[:12],
                    assigned[:12]
                ])

            task_table = Table(task_data, colWidths=[1.4*inch, 1.3*inch, 0.9*inch, 0.9*inch, 0.9*inch, 1*inch])
            task_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#3f51b5')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 8),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 6),
                ('BACKGROUND', (0, 1), (-1, -1), colors.white),
                ('TEXTCOLOR', (0, 1), (-1, -1), colors.black),
                ('FONTSIZE', (0, 1), (-1, -1), 7),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e0e0e0')),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f9f9f9')]),
            ]))
            elements.append(task_table)

            if len(tasks) > 50:
                elements.append(Spacer(1, 10))
                elements.append(Paragraph(
                    f"Showing first 50 of {len(tasks)} records. Export to CSV for full data.",
                    styles['SubTitle']
                ))

        # Build PDF
        doc.build(elements)
        buffer.seek(0)

        return buffer
