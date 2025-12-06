import React, { useState, useEffect, useRef } from 'react';
import {
  Container,
  Typography,
  Box,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Divider,
  TextField,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  FormControlLabel,
  Switch,
  Snackbar,
  ButtonGroup,
  Tooltip as MuiTooltip,
} from '@mui/material';
import {
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  Assessment as AssessmentIcon,
  Schedule as ScheduleIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Send as SendIcon,
  PictureAsPdf as PdfIcon,
  Print as PrintIcon,
  TableChart as ExcelIcon,
  CalendarToday as CalendarIcon,
  TrendingUp as TrendingUpIcon,
  People as PeopleIcon,
  Business as BusinessIcon,
  Assignment as AssignmentIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format, subDays, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, subMonths } from 'date-fns';
import { tasksAPI, clientsAPI, workTypesAPI, usersAPI, reportConfigurationsAPI } from '../services/api';
import { DataGrid } from '@mui/x-data-grid';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export default function Reports() {
  // Tab state
  const [activeTab, setActiveTab] = useState(0);

  // Ad-hoc report states
  const [reportType, setReportType] = useState('TASK_SUMMARY');
  const [filters, setFilters] = useState({
    startDate: null,
    endDate: null,
    client: 'ALL',
    workType: 'ALL',
    status: 'ALL',
    assignedTo: 'ALL',
  });
  const [clients, setClients] = useState([]);
  const [workTypes, setWorkTypes] = useState([]);
  const [users, setUsers] = useState([]);
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pdfLoading, setPdfLoading] = useState(false);
  const reportRef = useRef(null);

  // Quick date range presets
  const datePresets = [
    { label: 'Today', getValue: () => ({ start: new Date(), end: new Date() }) },
    { label: 'Last 7 Days', getValue: () => ({ start: subDays(new Date(), 7), end: new Date() }) },
    { label: 'Last 30 Days', getValue: () => ({ start: subDays(new Date(), 30), end: new Date() }) },
    { label: 'This Month', getValue: () => ({ start: startOfMonth(new Date()), end: endOfMonth(new Date()) }) },
    { label: 'Last Month', getValue: () => ({ start: startOfMonth(subMonths(new Date(), 1)), end: endOfMonth(subMonths(new Date(), 1)) }) },
    { label: 'This Quarter', getValue: () => ({ start: startOfQuarter(new Date()), end: endOfQuarter(new Date()) }) },
    { label: 'This Year', getValue: () => ({ start: startOfYear(new Date()), end: new Date() }) },
  ];

  // Scheduled report states
  const [scheduledReports, setScheduledReports] = useState([]);
  const [openScheduleDialog, setOpenScheduleDialog] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [scheduleFormData, setScheduleFormData] = useState({
    name: '',
    is_active: true,
    frequency: 'WEEKLY',
    day_of_week: 0,
    day_of_month: 1,
    send_time: '09:00:00',
    recipient_emails: '',
    include_summary: true,
    include_client_wise: true,
    include_employee_wise: true,
    include_work_type_wise: true,
    include_status_breakdown: true,
    include_overdue_list: true,
    include_upcoming_dues: true,
    include_charts: true,
    report_period: 'LAST_7_DAYS',
  });

  useEffect(() => {
    loadFilterOptions();
    if (activeTab === 1) {
      fetchScheduledReports();
    }
  }, [activeTab]);

  const loadFilterOptions = async () => {
    try {
      const [clientsRes, workTypesRes, usersRes] = await Promise.all([
        clientsAPI.getAll({ status: 'ACTIVE' }),
        workTypesAPI.getAll({ is_active: true }),
        usersAPI.getAll({ is_active: true }),
      ]);
      // Ensure all arrays are properly set
      const clientsData = clientsRes.data;
      const workTypesData = workTypesRes.data;
      const usersData = usersRes.data;

      setClients(Array.isArray(clientsData) ? clientsData : (clientsData.results || []));
      setWorkTypes(Array.isArray(workTypesData) ? workTypesData : (workTypesData.results || []));
      setUsers(Array.isArray(usersData) ? usersData : (usersData.results || []));
    } catch (error) {
      console.error('Error loading filter options:', error);
      setClients([]);
      setWorkTypes([]);
      setUsers([]);
    }
  };

  // Scheduled Reports Functions
  const fetchScheduledReports = async () => {
    setScheduleLoading(true);
    try {
      const response = await reportConfigurationsAPI.getAll();
      const data = response.data;
      setScheduledReports(Array.isArray(data) ? data : (data.results || []));
    } catch (error) {
      console.error('Error fetching scheduled reports:', error);
      showSnackbar('Failed to fetch scheduled reports', 'error');
      setScheduledReports([]);
    } finally {
      setScheduleLoading(false);
    }
  };

  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  const handleOpenScheduleDialog = (schedule = null) => {
    if (schedule) {
      setEditingSchedule(schedule);
      setScheduleFormData({
        name: schedule.name || '',
        is_active: schedule.is_active ?? true,
        frequency: schedule.frequency || 'WEEKLY',
        day_of_week: schedule.day_of_week ?? 0,
        day_of_month: schedule.day_of_month ?? 1,
        send_time: schedule.send_time || '09:00:00',
        recipient_emails: schedule.recipient_emails || '',
        include_summary: schedule.include_summary ?? true,
        include_client_wise: schedule.include_client_wise ?? true,
        include_employee_wise: schedule.include_employee_wise ?? true,
        include_work_type_wise: schedule.include_work_type_wise ?? true,
        include_status_breakdown: schedule.include_status_breakdown ?? true,
        include_overdue_list: schedule.include_overdue_list ?? true,
        include_upcoming_dues: schedule.include_upcoming_dues ?? true,
        include_charts: schedule.include_charts ?? true,
        report_period: schedule.report_period || 'LAST_7_DAYS',
      });
    } else {
      setEditingSchedule(null);
      setScheduleFormData({
        name: '',
        is_active: true,
        frequency: 'WEEKLY',
        day_of_week: 0,
        day_of_month: 1,
        send_time: '09:00:00',
        recipient_emails: '',
        include_summary: true,
        include_client_wise: true,
        include_employee_wise: true,
        include_work_type_wise: true,
        include_status_breakdown: true,
        include_overdue_list: true,
        include_upcoming_dues: true,
        include_charts: true,
        report_period: 'LAST_7_DAYS',
      });
    }
    setOpenScheduleDialog(true);
  };

  const handleCloseScheduleDialog = () => {
    setOpenScheduleDialog(false);
    setEditingSchedule(null);
  };

  const handleSaveSchedule = async () => {
    try {
      if (editingSchedule) {
        await reportConfigurationsAPI.update(editingSchedule.id, scheduleFormData);
        showSnackbar('Scheduled report updated successfully', 'success');
      } else {
        await reportConfigurationsAPI.create(scheduleFormData);
        showSnackbar('Scheduled report created successfully', 'success');
      }
      handleCloseScheduleDialog();
      fetchScheduledReports();
    } catch (error) {
      showSnackbar(error.response?.data?.detail || 'Operation failed', 'error');
    }
  };

  const handleDeleteSchedule = async (id) => {
    if (window.confirm('Are you sure you want to delete this scheduled report?')) {
      try {
        await reportConfigurationsAPI.delete(id);
        showSnackbar('Scheduled report deleted successfully', 'success');
        fetchScheduledReports();
      } catch (error) {
        showSnackbar('Failed to delete scheduled report', 'error');
      }
    }
  };

  const handleSendNow = async (id) => {
    try {
      showSnackbar('Sending report...', 'info');
      await reportConfigurationsAPI.sendNow(id);
      showSnackbar('Report sent successfully', 'success');
      fetchScheduledReports();
    } catch (error) {
      showSnackbar(error.response?.data?.error || 'Failed to send report', 'error');
    }
  };

  const handleDownloadPdf = async (id) => {
    try {
      const response = await reportConfigurationsAPI.downloadPdf(id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `report_${format(new Date(), 'yyyyMMdd')}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      showSnackbar('Failed to download PDF', 'error');
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const generateReport = async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (filters.client !== 'ALL') params['client_work__client'] = filters.client;
      if (filters.workType !== 'ALL') params['client_work__work_type'] = filters.workType;
      if (filters.status !== 'ALL') params.status = filters.status;
      if (filters.assignedTo !== 'ALL') params.assigned_to = filters.assignedTo;
      if (filters.startDate) params.due_date__gte = format(filters.startDate, 'yyyy-MM-dd');
      if (filters.endDate) params.due_date__lte = format(filters.endDate, 'yyyy-MM-dd');

      const response = await tasksAPI.getAll(params);
      const tasks = response.data.results || response.data;

      const processedData = processReportData(tasks, reportType);
      setReportData(processedData);
    } catch (err) {
      setError('Failed to generate report');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const processReportData = (tasks, type) => {
    switch (type) {
      case 'TASK_SUMMARY':
        return generateTaskSummary(tasks);
      case 'CLIENT_SUMMARY':
        return generateClientSummary(tasks);
      case 'WORK_TYPE_SUMMARY':
        return generateWorkTypeSummary(tasks);
      case 'STAFF_PRODUCTIVITY':
        return generateStaffProductivity(tasks);
      case 'STATUS_ANALYSIS':
        return generateStatusAnalysis(tasks);
      default:
        return null;
    }
  };

  const generateTaskSummary = (tasks) => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'COMPLETED').length;
    const overdue = tasks.filter(t => t.status === 'OVERDUE').length;
    const pending = tasks.filter(t => ['NOT_STARTED', 'STARTED', 'IN_PROGRESS'].includes(t.status)).length;

    const chartData = [
      { name: 'Completed', value: completed },
      { name: 'Overdue', value: overdue },
      { name: 'Pending', value: pending },
    ];

    return {
      summary: { total, completed, overdue, pending },
      chartData,
      tasks,
    };
  };

  const generateClientSummary = (tasks) => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'COMPLETED').length;
    const overdue = tasks.filter(t => t.status === 'OVERDUE').length;
    const pending = tasks.filter(t => ['NOT_STARTED', 'STARTED', 'IN_PROGRESS'].includes(t.status)).length;

    const clientMap = {};
    tasks.forEach(task => {
      const clientName = task.client_name;
      if (!clientMap[clientName]) {
        clientMap[clientName] = { total: 0, completed: 0, pending: 0, overdue: 0 };
      }
      clientMap[clientName].total++;
      if (task.status === 'COMPLETED') clientMap[clientName].completed++;
      else if (task.status === 'OVERDUE') clientMap[clientName].overdue++;
      else clientMap[clientName].pending++;
    });

    const chartData = Object.entries(clientMap)
      .map(([name, data]) => ({
        name,
        total: data.total,
        completed: data.completed,
        pending: data.pending,
        overdue: data.overdue,
      }))
      .slice(0, 10);

    const uniqueClients = Object.keys(clientMap).length;

    return {
      summary: { total, completed, overdue, pending, uniqueClients },
      clientMap,
      chartData,
      tasks
    };
  };

  const generateWorkTypeSummary = (tasks) => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'COMPLETED').length;
    const overdue = tasks.filter(t => t.status === 'OVERDUE').length;
    const pending = tasks.filter(t => ['NOT_STARTED', 'STARTED', 'IN_PROGRESS'].includes(t.status)).length;

    const workTypeMap = {};
    tasks.forEach(task => {
      const workType = task.work_type_name;
      if (!workTypeMap[workType]) {
        workTypeMap[workType] = { total: 0, completed: 0, pending: 0, overdue: 0 };
      }
      workTypeMap[workType].total++;
      if (task.status === 'COMPLETED') workTypeMap[workType].completed++;
      else if (task.status === 'OVERDUE') workTypeMap[workType].overdue++;
      else workTypeMap[workType].pending++;
    });

    const chartData = Object.entries(workTypeMap).map(([name, data]) => ({
      name,
      total: data.total,
      completed: data.completed,
      pending: data.pending,
      overdue: data.overdue,
    }));

    const uniqueWorkTypes = Object.keys(workTypeMap).length;

    return {
      summary: { total, completed, overdue, pending, uniqueWorkTypes },
      workTypeMap,
      chartData,
      tasks
    };
  };

  const generateStaffProductivity = (tasks) => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'COMPLETED').length;
    const overdue = tasks.filter(t => t.status === 'OVERDUE').length;
    const pending = tasks.filter(t => ['NOT_STARTED', 'STARTED', 'IN_PROGRESS'].includes(t.status)).length;

    const staffMap = {};
    tasks.forEach(task => {
      const staffName = task.assigned_to_name || 'Unassigned';
      if (!staffMap[staffName]) {
        staffMap[staffName] = { total: 0, completed: 0, pending: 0, overdue: 0 };
      }
      staffMap[staffName].total++;
      if (task.status === 'COMPLETED') staffMap[staffName].completed++;
      else if (task.status === 'OVERDUE') staffMap[staffName].overdue++;
      else staffMap[staffName].pending++;
    });

    const chartData = Object.entries(staffMap).map(([name, data]) => ({
      name,
      total: data.total,
      completed: data.completed,
      pending: data.pending,
      overdue: data.overdue,
    }));

    const uniqueStaff = Object.keys(staffMap).filter(s => s !== 'Unassigned').length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      summary: { total, completed, overdue, pending, uniqueStaff, completionRate },
      staffMap,
      chartData,
      tasks
    };
  };

  const generateStatusAnalysis = (tasks) => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'COMPLETED').length;
    const overdue = tasks.filter(t => t.status === 'OVERDUE').length;
    const pending = tasks.filter(t => ['NOT_STARTED', 'STARTED', 'IN_PROGRESS'].includes(t.status)).length;

    const statusMap = {
      'NOT_STARTED': 0,
      'STARTED': 0,
      'IN_PROGRESS': 0,
      'COMPLETED': 0,
      'OVERDUE': 0,
    };

    tasks.forEach(task => {
      statusMap[task.status]++;
    });

    const chartData = Object.entries(statusMap).map(([name, value]) => ({
      name: name.replace(/_/g, ' '),
      value,
    }));

    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      summary: { total, completed, overdue, pending, completionRate },
      statusMap,
      chartData,
      tasks
    };
  };

  const exportToCSV = () => {
    if (!reportData || !reportData.tasks) return;

    const headers = ['Client', 'Task Category', 'Period', 'Due Date', 'Status', 'Assigned To'];
    const rows = reportData.tasks.map(task => [
      task.client_name,
      task.work_type_name,
      task.period_label,
      format(new Date(task.due_date), 'dd-MMM-yyyy'),
      task.status,
      task.assigned_to_name || 'Unassigned',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report_${reportType}_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`;
    a.click();
  };

  // Export to Excel (XLSX format using CSV with proper formatting)
  const exportToExcel = () => {
    if (!reportData || !reportData.tasks) return;

    // Create Excel-compatible CSV with UTF-8 BOM for proper encoding
    const BOM = '\uFEFF';
    const headers = ['Client', 'Task Category', 'Period', 'Due Date', 'Status', 'Assigned To', 'Client Code'];
    const rows = reportData.tasks.map(task => [
      `"${(task.client_name || '').replace(/"/g, '""')}"`,
      `"${(task.work_type_name || '').replace(/"/g, '""')}"`,
      `"${(task.period_label || '').replace(/"/g, '""')}"`,
      format(new Date(task.due_date), 'dd-MMM-yyyy'),
      task.status.replace(/_/g, ' '),
      `"${(task.assigned_to_name || 'Unassigned').replace(/"/g, '""')}"`,
      task.client_code || '',
    ]);

    const csvContent = BOM + [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\r\n');

    const blob = new Blob([csvContent], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report_${reportType}_${format(new Date(), 'yyyyMMdd_HHmmss')}.xls`;
    a.click();
    showSnackbar('Excel file downloaded successfully', 'success');
  };

  // Export to PDF
  const exportToPDF = async () => {
    setPdfLoading(true);
    try {
      const params = {
        report_type: reportType,
        start_date: filters.startDate ? format(filters.startDate, 'yyyy-MM-dd') : null,
        end_date: filters.endDate ? format(filters.endDate, 'yyyy-MM-dd') : null,
        client: filters.client,
        work_type: filters.workType,
        status: filters.status,
        assigned_to: filters.assignedTo,
      };

      const response = await reportConfigurationsAPI.generateAdHocPdf(params);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `report_${reportType}_${format(new Date(), 'yyyyMMdd_HHmmss')}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      showSnackbar('PDF downloaded successfully', 'success');
    } catch (error) {
      console.error('Failed to generate PDF:', error);
      showSnackbar('Failed to generate PDF. Please try again.', 'error');
    } finally {
      setPdfLoading(false);
    }
  };

  // Print report
  const handlePrint = () => {
    if (!reportData) {
      showSnackbar('Please generate a report first', 'warning');
      return;
    }

    const printWindow = window.open('', '_blank');
    const reportTypeLabels = {
      'TASK_SUMMARY': 'Task Summary Report',
      'CLIENT_SUMMARY': 'Client Summary Report',
      'WORK_TYPE_SUMMARY': 'Task Category Summary Report',
      'STAFF_PRODUCTIVITY': 'Staff Productivity Report',
      'STATUS_ANALYSIS': 'Status Analysis Report',
    };

    const title = reportTypeLabels[reportType] || 'Report';
    const dateRange = filters.startDate && filters.endDate
      ? `${format(filters.startDate, 'dd-MMM-yyyy')} to ${format(filters.endDate, 'dd-MMM-yyyy')}`
      : 'All Time';

    // Generate summary HTML
    let summaryHtml = '';
    if (reportData.summary) {
      summaryHtml = `
        <div class="summary-cards">
          <div class="card total"><span class="label">Total Tasks</span><span class="value">${reportData.summary.total}</span></div>
          <div class="card completed"><span class="label">Completed</span><span class="value">${reportData.summary.completed}</span></div>
          <div class="card pending"><span class="label">Pending</span><span class="value">${reportData.summary.pending}</span></div>
          <div class="card overdue"><span class="label">Overdue</span><span class="value">${reportData.summary.overdue}</span></div>
        </div>
      `;
    }

    // Generate table HTML
    const tableRows = reportData.tasks.slice(0, 100).map(task => `
      <tr>
        <td>${task.client_name || 'N/A'}</td>
        <td>${task.work_type_name || 'N/A'}</td>
        <td>${task.period_label || 'N/A'}</td>
        <td>${format(new Date(task.due_date), 'dd-MMM-yyyy')}</td>
        <td><span class="status-${task.status.toLowerCase()}">${task.status.replace(/_/g, ' ')}</span></td>
        <td>${task.assigned_to_name || 'Unassigned'}</td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; margin: 20px; color: #333; }
          h1 { color: #6366f1; margin-bottom: 5px; }
          .subtitle { color: #666; margin-bottom: 20px; }
          .summary-cards { display: flex; gap: 15px; margin-bottom: 25px; flex-wrap: wrap; }
          .card { padding: 15px 25px; border-radius: 10px; color: white; text-align: center; min-width: 120px; }
          .card .label { display: block; font-size: 12px; opacity: 0.9; }
          .card .value { display: block; font-size: 28px; font-weight: bold; margin-top: 5px; }
          .card.total { background: linear-gradient(135deg, #667eea, #764ba2); }
          .card.completed { background: linear-gradient(135deg, #11998e, #38ef7d); }
          .card.pending { background: linear-gradient(135deg, #f093fb, #f5576c); }
          .card.overdue { background: linear-gradient(135deg, #eb3349, #f45c43); }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { background: #6366f1; color: white; padding: 12px 8px; text-align: left; }
          td { padding: 10px 8px; border-bottom: 1px solid #eee; }
          tr:nth-child(even) { background: #f9f9f9; }
          .status-completed { background: #10b981; color: white; padding: 3px 8px; border-radius: 4px; font-size: 11px; }
          .status-overdue { background: #ef4444; color: white; padding: 3px 8px; border-radius: 4px; font-size: 11px; }
          .status-in_progress, .status-started { background: #f59e0b; color: white; padding: 3px 8px; border-radius: 4px; font-size: 11px; }
          .status-not_started { background: #9ca3af; color: white; padding: 3px 8px; border-radius: 4px; font-size: 11px; }
          .footer { margin-top: 30px; text-align: center; color: #999; font-size: 12px; }
          @media print { body { margin: 0; } }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <p class="subtitle">Period: ${dateRange} | Generated: ${format(new Date(), 'dd-MMM-yyyy HH:mm')}</p>
        ${summaryHtml}
        <table>
          <thead>
            <tr>
              <th>Client</th>
              <th>Task Category</th>
              <th>Period</th>
              <th>Due Date</th>
              <th>Status</th>
              <th>Assigned To</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
        ${reportData.tasks.length > 100 ? `<p class="footer">Showing first 100 of ${reportData.tasks.length} records</p>` : ''}
        <p class="footer">NexPro Practice Management System</p>
        <script>window.print(); window.close();</script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Apply date preset
  const applyDatePreset = (preset) => {
    const { start, end } = preset.getValue();
    setFilters(prev => ({ ...prev, startDate: start, endDate: end }));
  };

  const renderChart = () => {
    if (!reportData || !reportData.chartData) return null;

    if (reportType === 'TASK_SUMMARY' || reportType === 'STATUS_ANALYSIS') {
      return (
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={reportData.chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {reportData.chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      );
    }

    return (
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={reportData.chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="completed" fill="#4caf50" name="Completed" />
          <Bar dataKey="pending" fill="#ff9800" name="Pending" />
          <Bar dataKey="overdue" fill="#f44336" name="Overdue" />
        </BarChart>
      </ResponsiveContainer>
    );
  };

  // Scheduled reports columns for DataGrid
  const scheduledReportsColumns = [
    { field: 'name', headerName: 'Report Name', flex: 1, minWidth: 180 },
    {
      field: 'frequency',
      headerName: 'Frequency',
      width: 120,
      renderCell: (params) => (
        <Chip label={params.row.frequency_display || params.value} size="small" color="primary" variant="outlined" />
      ),
    },
    { field: 'report_period_display', headerName: 'Period', width: 150 },
    {
      field: 'is_active',
      headerName: 'Status',
      width: 100,
      renderCell: (params) => (
        <Chip
          label={params.value ? 'Active' : 'Inactive'}
          size="small"
          color={params.value ? 'success' : 'default'}
        />
      ),
    },
    { field: 'recipient_emails', headerName: 'Recipients', flex: 1, minWidth: 200 },
    {
      field: 'last_sent_at',
      headerName: 'Last Sent',
      width: 160,
      renderCell: (params) =>
        params.value ? format(new Date(params.value), 'dd-MMM-yyyy HH:mm') : 'Never',
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 180,
      sortable: false,
      renderCell: (params) => (
        <Box>
          <IconButton size="small" color="primary" onClick={() => handleOpenScheduleDialog(params.row)} title="Edit">
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton size="small" color="success" onClick={() => handleSendNow(params.row.id)} title="Send Now">
            <SendIcon fontSize="small" />
          </IconButton>
          <IconButton size="small" color="info" onClick={() => handleDownloadPdf(params.row.id)} title="Download PDF">
            <PdfIcon fontSize="small" />
          </IconButton>
          <IconButton size="small" color="error" onClick={() => handleDeleteSchedule(params.row.id)} title="Delete">
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>
      ),
    },
  ];

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Container maxWidth="xl">
        <Box sx={{ mb: 4 }}>
          <Card
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              mb: 3,
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <AssessmentIcon sx={{ fontSize: 40 }} />
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 600 }}>
                      Reports & Analytics
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.5 }}>
                      Generate reports on-demand or schedule automated PDF reports via email
                    </Typography>
                  </Box>
                </Box>
                {activeTab === 1 && (
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => handleOpenScheduleDialog()}
                    sx={{
                      bgcolor: 'white',
                      color: 'primary.main',
                      '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' },
                    }}
                  >
                    New Scheduled Report
                  </Button>
                )}
              </Box>
            </CardContent>
          </Card>

          {/* Tabs */}
          <Card sx={{ mb: 3, borderRadius: 3, boxShadow: 2 }}>
            <Tabs
              value={activeTab}
              onChange={(e, newValue) => setActiveTab(newValue)}
              sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
            >
              <Tab icon={<AssessmentIcon />} label="Ad-hoc Reports" />
              <Tab icon={<ScheduleIcon />} label="Scheduled Reports" />
            </Tabs>
          </Card>

          {/* Ad-hoc Reports Tab */}
          {activeTab === 0 && (
            <>
              <Card sx={{ p: 3, mb: 3, borderRadius: 3, boxShadow: 3 }}>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                  Report Configuration
                </Typography>
                {/* Quick Date Presets */}
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                    Quick Date Range:
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {datePresets.map((preset) => (
                      <Chip
                        key={preset.label}
                        label={preset.label}
                        onClick={() => applyDatePreset(preset)}
                        variant="outlined"
                        color="primary"
                        size="small"
                        icon={<CalendarIcon sx={{ fontSize: 16 }} />}
                        sx={{
                          cursor: 'pointer',
                          '&:hover': { bgcolor: 'primary.light', color: 'white' }
                        }}
                      />
                    ))}
                  </Box>
                </Box>

                <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Report Type</InputLabel>
                <Select
                  value={reportType}
                  label="Report Type"
                  onChange={(e) => setReportType(e.target.value)}
                >
                  <MenuItem value="TASK_SUMMARY">Task Summary</MenuItem>
                  <MenuItem value="CLIENT_SUMMARY">Client Summary</MenuItem>
                  <MenuItem value="WORK_TYPE_SUMMARY">Task Category Summary</MenuItem>
                  <MenuItem value="STAFF_PRODUCTIVITY">Staff Productivity</MenuItem>
                  <MenuItem value="STATUS_ANALYSIS">Status Analysis</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={4}>
              <DatePicker
                label="Start Date"
                value={filters.startDate}
                onChange={(date) => handleFilterChange('startDate', date)}
                slotProps={{ textField: { fullWidth: true } }}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <DatePicker
                label="End Date"
                value={filters.endDate}
                onChange={(date) => handleFilterChange('endDate', date)}
                slotProps={{ textField: { fullWidth: true } }}
              />
            </Grid>

            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Client</InputLabel>
                <Select
                  value={filters.client}
                  label="Client"
                  onChange={(e) => handleFilterChange('client', e.target.value)}
                >
                  <MenuItem value="ALL">All Clients</MenuItem>
                  {Array.isArray(clients) && clients.map(client => (
                    <MenuItem key={client.id} value={client.id}>
                      {client.client_name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Task Category</InputLabel>
                <Select
                  value={filters.workType}
                  label="Task Category"
                  onChange={(e) => handleFilterChange('workType', e.target.value)}
                >
                  <MenuItem value="ALL">All Task Categories</MenuItem>
                  {Array.isArray(workTypes) && workTypes.map(type => (
                    <MenuItem key={type.id} value={type.id}>
                      {type.work_name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={filters.status}
                  label="Status"
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                >
                  <MenuItem value="ALL">All Statuses</MenuItem>
                  <MenuItem value="NOT_STARTED">Not Started</MenuItem>
                  <MenuItem value="STARTED">Started</MenuItem>
                  <MenuItem value="IN_PROGRESS">In Progress</MenuItem>
                  <MenuItem value="COMPLETED">Completed</MenuItem>
                  <MenuItem value="OVERDUE">Overdue</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Assigned To</InputLabel>
                <Select
                  value={filters.assignedTo}
                  label="Assigned To"
                  onChange={(e) => handleFilterChange('assignedTo', e.target.value)}
                >
                  <MenuItem value="ALL">All Staff</MenuItem>
                  {Array.isArray(users) && users.map(user => (
                    <MenuItem key={user.id} value={user.id}>
                      {user.username}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <Box display="flex" gap={2} flexWrap="wrap" alignItems="center">
                <Button
                  variant="contained"
                  startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <RefreshIcon />}
                  onClick={generateReport}
                  disabled={loading}
                  sx={{ minWidth: 160 }}
                >
                  {loading ? 'Generating...' : 'Generate Report'}
                </Button>
                {reportData && (
                  <>
                    <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
                    <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
                      Export:
                    </Typography>
                    <ButtonGroup variant="outlined" size="small">
                      <MuiTooltip title="Export to CSV">
                        <Button onClick={exportToCSV} startIcon={<DownloadIcon />}>
                          CSV
                        </Button>
                      </MuiTooltip>
                      <MuiTooltip title="Export to Excel">
                        <Button onClick={exportToExcel} startIcon={<ExcelIcon />}>
                          Excel
                        </Button>
                      </MuiTooltip>
                      <MuiTooltip title="Download PDF Report">
                        <Button
                          onClick={exportToPDF}
                          startIcon={pdfLoading ? <CircularProgress size={16} /> : <PdfIcon />}
                          disabled={pdfLoading}
                        >
                          PDF
                        </Button>
                      </MuiTooltip>
                      <MuiTooltip title="Print Report">
                        <Button onClick={handlePrint} startIcon={<PrintIcon />}>
                          Print
                        </Button>
                      </MuiTooltip>
                    </ButtonGroup>
                  </>
                )}
              </Box>
            </Grid>
          </Grid>
        </Card>

        {/* Report Results */}
        {loading && (
          <Box display="flex" justifyContent="center" p={4}>
            <CircularProgress />
          </Box>
        )}

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {reportData && !loading && (
          <>
            {/* Summary Cards - Universal for all report types */}
            {reportData.summary && (
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={6} sm={4} md={2}>
                  <Card sx={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    borderRadius: 3,
                    boxShadow: 3,
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    '&:hover': { transform: 'translateY(-4px)', boxShadow: 6 },
                  }}>
                    <CardContent sx={{ py: 2, px: 2, '&:last-child': { pb: 2 } }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <AssignmentIcon sx={{ fontSize: 18, opacity: 0.9 }} />
                        <Typography variant="caption" sx={{ opacity: 0.9 }}>Total</Typography>
                      </Box>
                      <Typography variant="h5" sx={{ fontWeight: 700 }}>{reportData.summary.total}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6} sm={4} md={2}>
                  <Card sx={{
                    background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
                    color: 'white',
                    borderRadius: 3,
                    boxShadow: 3,
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    '&:hover': { transform: 'translateY(-4px)', boxShadow: 6 },
                  }}>
                    <CardContent sx={{ py: 2, px: 2, '&:last-child': { pb: 2 } }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <TrendingUpIcon sx={{ fontSize: 18, opacity: 0.9 }} />
                        <Typography variant="caption" sx={{ opacity: 0.9 }}>Completed</Typography>
                      </Box>
                      <Typography variant="h5" sx={{ fontWeight: 700 }}>{reportData.summary.completed}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6} sm={4} md={2}>
                  <Card sx={{
                    background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                    color: 'white',
                    borderRadius: 3,
                    boxShadow: 3,
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    '&:hover': { transform: 'translateY(-4px)', boxShadow: 6 },
                  }}>
                    <CardContent sx={{ py: 2, px: 2, '&:last-child': { pb: 2 } }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <CalendarIcon sx={{ fontSize: 18, opacity: 0.9 }} />
                        <Typography variant="caption" sx={{ opacity: 0.9 }}>Pending</Typography>
                      </Box>
                      <Typography variant="h5" sx={{ fontWeight: 700 }}>{reportData.summary.pending}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6} sm={4} md={2}>
                  <Card sx={{
                    background: 'linear-gradient(135deg, #eb3349 0%, #f45c43 100%)',
                    color: 'white',
                    borderRadius: 3,
                    boxShadow: 3,
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    '&:hover': { transform: 'translateY(-4px)', boxShadow: 6 },
                  }}>
                    <CardContent sx={{ py: 2, px: 2, '&:last-child': { pb: 2 } }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <ScheduleIcon sx={{ fontSize: 18, opacity: 0.9 }} />
                        <Typography variant="caption" sx={{ opacity: 0.9 }}>Overdue</Typography>
                      </Box>
                      <Typography variant="h5" sx={{ fontWeight: 700 }}>{reportData.summary.overdue}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                {/* Contextual 5th card based on report type */}
                {reportType === 'CLIENT_SUMMARY' && reportData.summary.uniqueClients && (
                  <Grid item xs={6} sm={4} md={2}>
                    <Card sx={{
                      background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                      color: 'white',
                      borderRadius: 3,
                      boxShadow: 3,
                      transition: 'transform 0.2s, box-shadow 0.2s',
                      '&:hover': { transform: 'translateY(-4px)', boxShadow: 6 },
                    }}>
                      <CardContent sx={{ py: 2, px: 2, '&:last-child': { pb: 2 } }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                          <BusinessIcon sx={{ fontSize: 18, opacity: 0.9 }} />
                          <Typography variant="caption" sx={{ opacity: 0.9 }}>Clients</Typography>
                        </Box>
                        <Typography variant="h5" sx={{ fontWeight: 700 }}>{reportData.summary.uniqueClients}</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                )}
                {reportType === 'WORK_TYPE_SUMMARY' && reportData.summary.uniqueWorkTypes && (
                  <Grid item xs={6} sm={4} md={2}>
                    <Card sx={{
                      background: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
                      color: 'white',
                      borderRadius: 3,
                      boxShadow: 3,
                      transition: 'transform 0.2s, box-shadow 0.2s',
                      '&:hover': { transform: 'translateY(-4px)', boxShadow: 6 },
                    }}>
                      <CardContent sx={{ py: 2, px: 2, '&:last-child': { pb: 2 } }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                          <AssessmentIcon sx={{ fontSize: 18, opacity: 0.9 }} />
                          <Typography variant="caption" sx={{ opacity: 0.9 }}>Task Categories</Typography>
                        </Box>
                        <Typography variant="h5" sx={{ fontWeight: 700 }}>{reportData.summary.uniqueWorkTypes}</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                )}
                {reportType === 'STAFF_PRODUCTIVITY' && reportData.summary.uniqueStaff !== undefined && (
                  <Grid item xs={6} sm={4} md={2}>
                    <Card sx={{
                      background: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
                      color: 'white',
                      borderRadius: 3,
                      boxShadow: 3,
                      transition: 'transform 0.2s, box-shadow 0.2s',
                      '&:hover': { transform: 'translateY(-4px)', boxShadow: 6 },
                    }}>
                      <CardContent sx={{ py: 2, px: 2, '&:last-child': { pb: 2 } }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                          <PeopleIcon sx={{ fontSize: 18, opacity: 0.9 }} />
                          <Typography variant="caption" sx={{ opacity: 0.9 }}>Staff</Typography>
                        </Box>
                        <Typography variant="h5" sx={{ fontWeight: 700 }}>{reportData.summary.uniqueStaff}</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                )}
                {(reportType === 'STATUS_ANALYSIS' || reportType === 'STAFF_PRODUCTIVITY') && reportData.summary.completionRate !== undefined && (
                  <Grid item xs={6} sm={4} md={2}>
                    <Card sx={{
                      background: 'linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)',
                      color: 'white',
                      borderRadius: 3,
                      boxShadow: 3,
                      transition: 'transform 0.2s, box-shadow 0.2s',
                      '&:hover': { transform: 'translateY(-4px)', boxShadow: 6 },
                    }}>
                      <CardContent sx={{ py: 2, px: 2, '&:last-child': { pb: 2 } }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                          <TrendingUpIcon sx={{ fontSize: 18, opacity: 0.9 }} />
                          <Typography variant="caption" sx={{ opacity: 0.9 }}>Completion</Typography>
                        </Box>
                        <Typography variant="h5" sx={{ fontWeight: 700 }}>{reportData.summary.completionRate}%</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                )}
              </Grid>
            )}

            {/* Chart */}
            <Card sx={{ p: 3, mb: 3, borderRadius: 3, boxShadow: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                Visual Analysis
              </Typography>
              {renderChart()}
            </Card>

            {/* Data Table */}
            <Card sx={{ p: 3, borderRadius: 3, boxShadow: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                Detailed Data ({reportData.tasks.length} records)
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Client</TableCell>
                      <TableCell>Task Category</TableCell>
                      <TableCell>Period</TableCell>
                      <TableCell>Due Date</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Assigned To</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {reportData.tasks.slice(0, 50).map((task) => (
                      <TableRow key={task.id}>
                        <TableCell>{task.client_name}</TableCell>
                        <TableCell>{task.work_type_name}</TableCell>
                        <TableCell>{task.period_label}</TableCell>
                        <TableCell>
                          {format(new Date(task.due_date), 'dd-MMM-yyyy')}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={task.status.replace(/_/g, ' ')}
                            size="small"
                            color={
                              task.status === 'COMPLETED' ? 'success' :
                              task.status === 'OVERDUE' ? 'error' :
                              task.status === 'IN_PROGRESS' ? 'warning' : 'default'
                            }
                          />
                        </TableCell>
                        <TableCell>{task.assigned_to_name || 'Unassigned'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              {reportData.tasks.length > 50 && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
                  Showing first 50 records. Export to CSV to view all {reportData.tasks.length} records.
                </Typography>
              )}
            </Card>
          </>
        )}
            </>
          )}

          {/* Scheduled Reports Tab */}
          {activeTab === 1 && (
            <Card sx={{ borderRadius: 3, boxShadow: 3 }}>
              {scheduleLoading ? (
                <Box display="flex" justifyContent="center" p={4}>
                  <CircularProgress />
                </Box>
              ) : scheduledReports.length > 0 ? (
                <Box sx={{ height: 500, width: '100%' }}>
                  <DataGrid
                    rows={scheduledReports}
                    columns={scheduledReportsColumns}
                    pageSize={10}
                    rowsPerPageOptions={[10, 25, 50]}
                    disableSelectionOnClick
                    sx={{
                      border: 'none',
                      '& .MuiDataGrid-cell:focus': { outline: 'none' },
                    }}
                  />
                </Box>
              ) : (
                <Box sx={{ textAlign: 'center', py: 8 }}>
                  <ScheduleIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="h5" gutterBottom color="text.secondary">
                    No Scheduled Reports
                  </Typography>
                  <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                    Create a scheduled report to automatically receive PDF reports via email.
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => handleOpenScheduleDialog()}
                  >
                    Create Scheduled Report
                  </Button>
                </Box>
              )}
            </Card>
          )}
        </Box>

        {/* Schedule Report Dialog */}
        <Dialog open={openScheduleDialog} onClose={handleCloseScheduleDialog} maxWidth="md" fullWidth>
          <DialogTitle>
            {editingSchedule ? 'Edit Scheduled Report' : 'Create Scheduled Report'}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
              <TextField
                label="Report Name"
                fullWidth
                required
                value={scheduleFormData.name}
                onChange={(e) => setScheduleFormData({ ...scheduleFormData, name: e.target.value })}
                placeholder="e.g., Weekly Task Summary"
              />

              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <FormControl fullWidth>
                    <InputLabel>Frequency</InputLabel>
                    <Select
                      value={scheduleFormData.frequency}
                      label="Frequency"
                      onChange={(e) => setScheduleFormData({ ...scheduleFormData, frequency: e.target.value })}
                    >
                      <MenuItem value="DAILY">Daily</MenuItem>
                      <MenuItem value="WEEKLY">Weekly</MenuItem>
                      <MenuItem value="MONTHLY">Monthly</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                {scheduleFormData.frequency === 'WEEKLY' && (
                  <Grid item xs={12} md={4}>
                    <FormControl fullWidth>
                      <InputLabel>Day of Week</InputLabel>
                      <Select
                        value={scheduleFormData.day_of_week}
                        label="Day of Week"
                        onChange={(e) => setScheduleFormData({ ...scheduleFormData, day_of_week: e.target.value })}
                      >
                        <MenuItem value={0}>Monday</MenuItem>
                        <MenuItem value={1}>Tuesday</MenuItem>
                        <MenuItem value={2}>Wednesday</MenuItem>
                        <MenuItem value={3}>Thursday</MenuItem>
                        <MenuItem value={4}>Friday</MenuItem>
                        <MenuItem value={5}>Saturday</MenuItem>
                        <MenuItem value={6}>Sunday</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                )}

                {scheduleFormData.frequency === 'MONTHLY' && (
                  <Grid item xs={12} md={4}>
                    <FormControl fullWidth>
                      <InputLabel>Day of Month</InputLabel>
                      <Select
                        value={scheduleFormData.day_of_month}
                        label="Day of Month"
                        onChange={(e) => setScheduleFormData({ ...scheduleFormData, day_of_month: e.target.value })}
                      >
                        {[...Array(28)].map((_, i) => (
                          <MenuItem key={i + 1} value={i + 1}>{i + 1}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                )}

                <Grid item xs={12} md={4}>
                  <FormControl fullWidth>
                    <InputLabel>Report Period</InputLabel>
                    <Select
                      value={scheduleFormData.report_period}
                      label="Report Period"
                      onChange={(e) => setScheduleFormData({ ...scheduleFormData, report_period: e.target.value })}
                    >
                      <MenuItem value="CURRENT_DAY">Current Day</MenuItem>
                      <MenuItem value="LAST_7_DAYS">Last 7 Days</MenuItem>
                      <MenuItem value="LAST_30_DAYS">Last 30 Days</MenuItem>
                      <MenuItem value="CURRENT_MONTH">Current Month</MenuItem>
                      <MenuItem value="CURRENT_QUARTER">Current Quarter</MenuItem>
                      <MenuItem value="CURRENT_FY">Current Financial Year</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>

              <TextField
                label="Recipient Emails"
                fullWidth
                required
                value={scheduleFormData.recipient_emails}
                onChange={(e) => setScheduleFormData({ ...scheduleFormData, recipient_emails: e.target.value })}
                placeholder="email1@example.com, email2@example.com"
                helperText="Separate multiple email addresses with commas"
              />

              <Typography variant="subtitle1" sx={{ fontWeight: 600, mt: 2 }}>
                Report Content
              </Typography>
              <Grid container spacing={1}>
                <Grid item xs={12} md={4}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={scheduleFormData.include_summary}
                        onChange={(e) => setScheduleFormData({ ...scheduleFormData, include_summary: e.target.checked })}
                      />
                    }
                    label="Executive Summary"
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={scheduleFormData.include_charts}
                        onChange={(e) => setScheduleFormData({ ...scheduleFormData, include_charts: e.target.checked })}
                      />
                    }
                    label="Charts & Graphs"
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={scheduleFormData.include_status_breakdown}
                        onChange={(e) => setScheduleFormData({ ...scheduleFormData, include_status_breakdown: e.target.checked })}
                      />
                    }
                    label="Status Breakdown"
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={scheduleFormData.include_client_wise}
                        onChange={(e) => setScheduleFormData({ ...scheduleFormData, include_client_wise: e.target.checked })}
                      />
                    }
                    label="Client-wise Report"
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={scheduleFormData.include_employee_wise}
                        onChange={(e) => setScheduleFormData({ ...scheduleFormData, include_employee_wise: e.target.checked })}
                      />
                    }
                    label="Employee-wise Report"
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={scheduleFormData.include_work_type_wise}
                        onChange={(e) => setScheduleFormData({ ...scheduleFormData, include_work_type_wise: e.target.checked })}
                      />
                    }
                    label="Task Category-wise Report"
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={scheduleFormData.include_overdue_list}
                        onChange={(e) => setScheduleFormData({ ...scheduleFormData, include_overdue_list: e.target.checked })}
                      />
                    }
                    label="Overdue Tasks List"
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={scheduleFormData.include_upcoming_dues}
                        onChange={(e) => setScheduleFormData({ ...scheduleFormData, include_upcoming_dues: e.target.checked })}
                      />
                    }
                    label="Upcoming Due Tasks"
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={scheduleFormData.is_active}
                        onChange={(e) => setScheduleFormData({ ...scheduleFormData, is_active: e.target.checked })}
                      />
                    }
                    label="Active (Schedule Enabled)"
                  />
                </Grid>
              </Grid>

              <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  <strong>Note:</strong> Scheduled reports are sent automatically based on the frequency you configure.
                  You can also manually send a report at any time using the "Send Now" button.
                </Typography>
              </Alert>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseScheduleDialog}>Cancel</Button>
            <Button
              onClick={handleSaveSchedule}
              variant="contained"
              disabled={!scheduleFormData.name || !scheduleFormData.recipient_emails}
            >
              {editingSchedule ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Snackbar */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={4000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
        >
          <Alert
            onClose={() => setSnackbar({ ...snackbar, open: false })}
            severity={snackbar.severity}
            sx={{ width: '100%' }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Container>
    </LocalizationProvider>
  );
}
