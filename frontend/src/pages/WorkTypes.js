import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Button,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Chip,
  Alert,
  Snackbar,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Divider,
  FormGroup,
  Checkbox,
  Tabs,
  Tab,
  Paper,
  Grid,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Category as CategoryIcon,
  Notifications as NotificationsIcon,
  Person as PersonIcon,
  Business as BusinessIcon,
  Email as EmailIcon,
  NotificationsActive as InAppIcon,
  AutoAwesome as AutoAwesomeIcon,
} from '@mui/icons-material';
import { workTypesAPI, organizationEmailsAPI } from '../services/api';

export default function WorkTypes() {
  const [workTypes, setWorkTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingWorkType, setEditingWorkType] = useState(null);
  const [reminderTab, setReminderTab] = useState(0);
  const [formData, setFormData] = useState({
    work_name: '',
    statutory_form: '',
    default_frequency: 'MONTHLY',
    description: '',
    is_active: true,
    due_date_day: 20,
    // Auto-driven configuration
    is_auto_driven: false,
    auto_start_on_creation: true,
    // Sender email configuration
    sender_email: null,
    // Client reminder configuration
    enable_client_reminders: true,
    client_reminder_start_day: 1,
    client_reminder_end_day: 0,
    client_reminder_frequency_type: 'ALTERNATE_DAYS',
    client_reminder_interval_days: 2,
    client_reminder_weekdays: '',
    // Employee reminder configuration
    enable_employee_reminders: true,
    employee_notification_type: 'BOTH', // EMAIL, IN_APP, or BOTH
    employee_reminder_start_day: 1,
    employee_reminder_end_day: 0,
    employee_reminder_frequency_type: 'DAILY',
    employee_reminder_interval_days: 1,
    employee_reminder_weekdays: '',
    // Legacy fields
    enable_reminders: true,
    reminder_start_day: 1,
    reminder_frequency_type: 'ALTERNATE_DAYS',
    reminder_interval_days: 2,
    reminder_weekdays: '',
  });

  // Track selected weekdays for weekly reminders
  const [clientWeekdays, setClientWeekdays] = useState([]);
  const [employeeWeekdays, setEmployeeWeekdays] = useState([]);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Email accounts for sender selection
  const [emailAccounts, setEmailAccounts] = useState([]);

  const fetchWorkTypes = async () => {
    setLoading(true);
    try {
      const response = await workTypesAPI.getAll();
      const data = response.data;
      setWorkTypes(Array.isArray(data) ? data : (data.results || []));
    } catch (error) {
      showSnackbar('Failed to fetch work types', 'error');
      setWorkTypes([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmailAccounts = async () => {
    try {
      const response = await organizationEmailsAPI.getAll();
      const data = response.data;
      setEmailAccounts(Array.isArray(data) ? data : (data.results || []));
    } catch (error) {
      console.error('Failed to fetch email accounts', error);
    }
  };

  useEffect(() => {
    fetchWorkTypes();
    fetchEmailAccounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleOpenDialog = (workType = null) => {
    if (workType) {
      setEditingWorkType(workType);
      setFormData(workType);
      // Parse weekdays if present
      if (workType.client_reminder_weekdays) {
        setClientWeekdays(workType.client_reminder_weekdays.split(',').map(d => parseInt(d)));
      } else {
        setClientWeekdays([]);
      }
      if (workType.employee_reminder_weekdays) {
        setEmployeeWeekdays(workType.employee_reminder_weekdays.split(',').map(d => parseInt(d)));
      } else {
        setEmployeeWeekdays([]);
      }
    } else {
      setEditingWorkType(null);
      setFormData({
        work_name: '',
        statutory_form: '',
        default_frequency: 'MONTHLY',
        description: '',
        is_active: true,
        due_date_day: 20,
        is_auto_driven: false,
        auto_start_on_creation: true,
        sender_email: null,
        enable_client_reminders: true,
        client_reminder_start_day: 1,
        client_reminder_end_day: 0,
        client_reminder_frequency_type: 'ALTERNATE_DAYS',
        client_reminder_interval_days: 2,
        client_reminder_weekdays: '',
        enable_employee_reminders: true,
        employee_notification_type: 'BOTH',
        employee_reminder_start_day: 1,
        employee_reminder_end_day: 0,
        employee_reminder_frequency_type: 'DAILY',
        employee_reminder_interval_days: 1,
        employee_reminder_weekdays: '',
        enable_reminders: true,
        reminder_start_day: 1,
        reminder_frequency_type: 'ALTERNATE_DAYS',
        reminder_interval_days: 2,
        reminder_weekdays: '',
      });
      setClientWeekdays([]);
      setEmployeeWeekdays([]);
    }
    setReminderTab(0);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingWorkType(null);
  };

  const handleClientWeekdayToggle = (day) => {
    const newSelected = clientWeekdays.includes(day)
      ? clientWeekdays.filter(d => d !== day)
      : [...clientWeekdays, day].sort();
    setClientWeekdays(newSelected);
    setFormData({
      ...formData,
      client_reminder_weekdays: newSelected.join(',')
    });
  };

  const handleEmployeeWeekdayToggle = (day) => {
    const newSelected = employeeWeekdays.includes(day)
      ? employeeWeekdays.filter(d => d !== day)
      : [...employeeWeekdays, day].sort();
    setEmployeeWeekdays(newSelected);
    setFormData({
      ...formData,
      employee_reminder_weekdays: newSelected.join(',')
    });
  };

  const handleSubmit = async () => {
    try {
      const dataToSubmit = { ...formData };
      // Ensure weekdays are set correctly
      if (formData.client_reminder_frequency_type === 'WEEKLY') {
        dataToSubmit.client_reminder_weekdays = clientWeekdays.join(',');
      } else {
        dataToSubmit.client_reminder_weekdays = '';
      }
      if (formData.employee_reminder_frequency_type === 'WEEKLY') {
        dataToSubmit.employee_reminder_weekdays = employeeWeekdays.join(',');
      } else {
        dataToSubmit.employee_reminder_weekdays = '';
      }

      // Sync legacy fields with client reminders for backward compatibility
      dataToSubmit.enable_reminders = dataToSubmit.enable_client_reminders;
      dataToSubmit.reminder_start_day = dataToSubmit.client_reminder_start_day;
      dataToSubmit.reminder_frequency_type = dataToSubmit.client_reminder_frequency_type;
      dataToSubmit.reminder_interval_days = dataToSubmit.client_reminder_interval_days;
      dataToSubmit.reminder_weekdays = dataToSubmit.client_reminder_weekdays;

      if (editingWorkType) {
        await workTypesAPI.update(editingWorkType.id, dataToSubmit);
        showSnackbar('Work type updated successfully', 'success');
      } else {
        await workTypesAPI.create(dataToSubmit);
        showSnackbar('Work type created successfully', 'success');
      }
      handleCloseDialog();
      fetchWorkTypes();
    } catch (error) {
      showSnackbar(error.response?.data?.detail || 'Operation failed', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this work type?')) {
      try {
        await workTypesAPI.delete(id);
        showSnackbar('Work type deleted successfully', 'success');
        fetchWorkTypes();
      } catch (error) {
        showSnackbar('Failed to delete work type', 'error');
      }
    }
  };

  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  const getEndDayHelperText = (value) => {
    if (value === 0) return "Reminders will stop on the due date";
    if (value < 0) return `Reminders will stop ${Math.abs(value)} day(s) before due date`;
    return `Reminders will stop on day ${value} of the month`;
  };

  const weekdayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const columns = [
    { field: 'statutory_form', headerName: 'Form', width: 120 },
    { field: 'work_name', headerName: 'Work Name', flex: 1, minWidth: 200 },
    {
      field: 'default_frequency',
      headerName: 'Frequency',
      width: 130,
      renderCell: (params) => (
        <Chip label={params.value} color="primary" size="small" variant="outlined" />
      ),
    },
    {
      field: 'due_date_day',
      headerName: 'Due Day',
      width: 100,
      renderCell: (params) => `Day ${params.value}`,
    },
    {
      field: 'enable_client_reminders',
      headerName: 'Client Reminders',
      width: 140,
      renderCell: (params) => (
        <Chip
          icon={<PersonIcon sx={{ fontSize: 16 }} />}
          label={params.value ? 'On' : 'Off'}
          color={params.value ? 'success' : 'default'}
          size="small"
        />
      ),
    },
    {
      field: 'enable_employee_reminders',
      headerName: 'Employee Reminders',
      width: 160,
      renderCell: (params) => (
        <Chip
          icon={<BusinessIcon sx={{ fontSize: 16 }} />}
          label={params.value ? 'On' : 'Off'}
          color={params.value ? 'info' : 'default'}
          size="small"
        />
      ),
    },
    {
      field: 'is_auto_driven',
      headerName: 'Auto-Driven',
      width: 100,
      renderCell: (params) => (
        params.value ? (
          <Chip
            icon={<AutoAwesomeIcon sx={{ fontSize: 16 }} />}
            label="Auto"
            color="warning"
            size="small"
          />
        ) : null
      ),
    },
    {
      field: 'sender_email_display',
      headerName: 'Sender Email',
      width: 160,
      renderCell: (params) => (
        params.value ? (
          <Chip
            icon={<EmailIcon sx={{ fontSize: 16 }} />}
            label={params.row.sender_email_name || params.value}
            color="info"
            size="small"
            variant="outlined"
          />
        ) : (
          <Typography variant="caption" color="text.secondary">Default</Typography>
        )
      ),
    },
    {
      field: 'is_active',
      headerName: 'Status',
      width: 100,
      renderCell: (params) => (
        <Chip
          label={params.value ? 'Active' : 'Inactive'}
          color={params.value ? 'success' : 'default'}
          size="small"
        />
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 120,
      sortable: false,
      renderCell: (params) => (
        <Box>
          <IconButton
            size="small"
            color="primary"
            onClick={() => handleOpenDialog(params.row)}
          >
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            color="error"
            onClick={() => handleDelete(params.row.id)}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>
      ),
    },
  ];

  const frequencies = ['MONTHLY', 'QUARTERLY', 'YEARLY', 'ONE_TIME'];
  const reminderFrequencyTypes = [
    { value: 'DAILY', label: 'Daily' },
    { value: 'ALTERNATE_DAYS', label: 'Every Alternate Days' },
    { value: 'WEEKLY', label: 'Weekly (Specific Days)' },
    { value: 'CUSTOM', label: 'Custom Interval' },
  ];

  const notificationTypes = [
    { value: 'EMAIL', label: 'Email Only', icon: <EmailIcon sx={{ mr: 1 }} /> },
    { value: 'IN_APP', label: 'In-App Notification Only', icon: <InAppIcon sx={{ mr: 1 }} /> },
    { value: 'BOTH', label: 'Both Email & In-App', icon: <NotificationsIcon sx={{ mr: 1 }} /> },
  ];

  const ReminderConfigSection = ({ prefix, enabled, setEnabled, weekdays, setWeekdays, handleWeekdayToggle }) => {
    const frequencyType = formData[`${prefix}_reminder_frequency_type`];
    const intervalDays = formData[`${prefix}_reminder_interval_days`];

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <FormControlLabel
          control={
            <Switch
              checked={enabled}
              onChange={(e) => {
                setEnabled(e.target.checked);
                setFormData({ ...formData, [`enable_${prefix}_reminders`]: e.target.checked });
              }}
              color="primary"
            />
          }
          label={`Enable ${prefix === 'client' ? 'client' : 'employee/internal'} reminders`}
        />

        {enabled && (
          <Box sx={{ pl: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Notification Type Selector - Only for Employee Reminders */}
            {prefix === 'employee' && (
              <FormControl fullWidth>
                <InputLabel>Notification Method</InputLabel>
                <Select
                  value={formData.employee_notification_type}
                  label="Notification Method"
                  onChange={(e) => setFormData({ ...formData, employee_notification_type: e.target.value })}
                >
                  {notificationTypes.map((type) => (
                    <MenuItem key={type.value} value={type.value}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        {type.icon}
                        {type.label}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Reminder Start Day"
                  type="number"
                  fullWidth
                  value={formData[`${prefix}_reminder_start_day`]}
                  onChange={(e) => setFormData({ ...formData, [`${prefix}_reminder_start_day`]: parseInt(e.target.value) || 1 })}
                  inputProps={{ min: 1, max: 31 }}
                  helperText="Day of month/period to start reminders"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Reminder End Day"
                  type="number"
                  fullWidth
                  value={formData[`${prefix}_reminder_end_day`]}
                  onChange={(e) => setFormData({ ...formData, [`${prefix}_reminder_end_day`]: parseInt(e.target.value) })}
                  inputProps={{ min: -10, max: 31 }}
                  helperText={getEndDayHelperText(formData[`${prefix}_reminder_end_day`])}
                />
              </Grid>
            </Grid>

            <FormControl fullWidth>
              <InputLabel>Reminder Frequency</InputLabel>
              <Select
                value={frequencyType}
                label="Reminder Frequency"
                onChange={(e) => setFormData({ ...formData, [`${prefix}_reminder_frequency_type`]: e.target.value })}
              >
                {reminderFrequencyTypes.map((type) => (
                  <MenuItem key={type.value} value={type.value}>
                    {type.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {frequencyType === 'CUSTOM' && (
              <TextField
                label="Custom Interval (Days)"
                type="number"
                fullWidth
                value={intervalDays}
                onChange={(e) => setFormData({ ...formData, [`${prefix}_reminder_interval_days`]: parseInt(e.target.value) || 1 })}
                inputProps={{ min: 1 }}
                helperText="Number of days between reminders"
              />
            )}

            {frequencyType === 'WEEKLY' && (
              <Box>
                <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
                  Select days of the week:
                </Typography>
                <FormGroup row>
                  {weekdayNames.map((day, index) => (
                    <FormControlLabel
                      key={index}
                      control={
                        <Checkbox
                          checked={weekdays.includes(index)}
                          onChange={() => handleWeekdayToggle(index)}
                          size="small"
                        />
                      }
                      label={day}
                    />
                  ))}
                </FormGroup>
              </Box>
            )}

            <Alert severity="info" sx={{ mt: 1 }}>
              {frequencyType === 'DAILY' && 'Reminders will be sent daily from start day until end day.'}
              {frequencyType === 'ALTERNATE_DAYS' && 'Reminders will be sent every 2 days from start day until end day.'}
              {frequencyType === 'WEEKLY' && 'Reminders will be sent on selected weekdays from start day until end day.'}
              {frequencyType === 'CUSTOM' && `Reminders will be sent every ${intervalDays} day(s) from start day until end day.`}
            </Alert>

            {/* Notification Method Info - Only for Employee Reminders */}
            {prefix === 'employee' && (
              <Alert
                severity={formData.employee_notification_type === 'BOTH' ? 'success' : 'warning'}
                sx={{ mt: 1 }}
                icon={
                  formData.employee_notification_type === 'EMAIL' ? <EmailIcon /> :
                  formData.employee_notification_type === 'IN_APP' ? <InAppIcon /> :
                  <NotificationsIcon />
                }
              >
                {formData.employee_notification_type === 'EMAIL' &&
                  'Employees will receive reminders via email only.'}
                {formData.employee_notification_type === 'IN_APP' &&
                  'Employees will receive in-app notifications only (visible in the notification bell).'}
                {formData.employee_notification_type === 'BOTH' &&
                  'Employees will receive both email and in-app notifications for maximum visibility.'}
              </Alert>
            )}
          </Box>
        )}
      </Box>
    );
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ mb: 4 }}>
        <Card
          sx={{
            background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
            color: 'white',
            mb: 3,
          }}
        >
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <CategoryIcon sx={{ fontSize: 40 }} />
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 600 }}>
                    Work Types Management
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.5 }}>
                    Define compliance work types with separate client & employee reminder schedules
                  </Typography>
                </Box>
              </Box>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => handleOpenDialog()}
                sx={{
                  bgcolor: 'white',
                  color: 'primary.main',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' },
                }}
              >
                Add Work Type
              </Button>
            </Box>
          </CardContent>
        </Card>

        <Card sx={{ borderRadius: 3, boxShadow: 3 }}>
          <Box sx={{ height: 600, width: '100%' }}>
            <DataGrid
              rows={Array.isArray(workTypes) ? workTypes : []}
              columns={columns}
              pageSize={10}
              rowsPerPageOptions={[10, 25, 50]}
              loading={loading}
              disableSelectionOnClick
              sx={{
                border: 'none',
                '& .MuiDataGrid-cell:focus': {
                  outline: 'none',
                },
              }}
            />
          </Box>
        </Card>
      </Box>

      {/* Add/Edit Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle sx={{ bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CategoryIcon color="primary" />
            {editingWorkType ? 'Edit Work Type' : 'Add New Work Type'}
          </Box>
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Basic Information */}
            <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'primary.main' }}>
              Basic Information
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Work Type Name"
                  fullWidth
                  required
                  value={formData.work_name}
                  onChange={(e) => setFormData({ ...formData, work_name: e.target.value })}
                  placeholder="e.g., GSTR1 Filing"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Statutory Form"
                  fullWidth
                  value={formData.statutory_form}
                  onChange={(e) => setFormData({ ...formData, statutory_form: e.target.value.toUpperCase() })}
                  placeholder="e.g., GSTR-1"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel>Frequency</InputLabel>
                  <Select
                    value={formData.default_frequency}
                    label="Frequency"
                    onChange={(e) => setFormData({ ...formData, default_frequency: e.target.value })}
                  >
                    {frequencies.map((freq) => (
                      <MenuItem key={freq} value={freq}>
                        {freq.replace('_', ' ')}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Due Date Day"
                  type="number"
                  fullWidth
                  required
                  value={formData.due_date_day}
                  onChange={(e) => setFormData({ ...formData, due_date_day: parseInt(e.target.value) || 20 })}
                  inputProps={{ min: 1, max: 31 }}
                  helperText="Day of month when tasks are due"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Description"
                  multiline
                  rows={2}
                  fullWidth
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of this work type"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Sender Email</InputLabel>
                  <Select
                    value={formData.sender_email || ''}
                    label="Sender Email"
                    onChange={(e) => setFormData({ ...formData, sender_email: e.target.value || null })}
                  >
                    <MenuItem value="">
                      <em>Use Default Email</em>
                    </MenuItem>
                    {emailAccounts.filter(e => e.is_active).map((email) => (
                      <MenuItem key={email.id} value={email.id}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <EmailIcon sx={{ fontSize: 18, color: 'primary.main' }} />
                          {email.display_name || email.email_address}
                          {email.is_default && (
                            <Chip label="Default" size="small" variant="outlined" sx={{ ml: 1, height: 20 }} />
                          )}
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      color="primary"
                    />
                  }
                  label="Active"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.is_auto_driven}
                      onChange={(e) => setFormData({ ...formData, is_auto_driven: e.target.checked })}
                      color="warning"
                    />
                  }
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <AutoAwesomeIcon sx={{ fontSize: 18, color: formData.is_auto_driven ? 'warning.main' : 'text.disabled' }} />
                      Auto-Driven Work Type
                    </Box>
                  }
                />
              </Grid>
            </Grid>

            {/* Auto-Driven Configuration */}
            {formData.is_auto_driven && (
              <Paper sx={{ p: 2, bgcolor: 'warning.50', border: '1px solid', borderColor: 'warning.200', borderRadius: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                  <AutoAwesomeIcon sx={{ color: 'warning.main', mt: 0.5 }} />
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'warning.dark', mb: 1 }}>
                      Auto-Driven Configuration
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                      Auto-driven work types start automatically and send reminders continuously from the reminder start date until the task is completed or the due date is reached.
                      Example: GSR-1 Document Reminder - system sends reminders to clients until documents are received.
                    </Typography>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={formData.auto_start_on_creation}
                          onChange={(e) => setFormData({ ...formData, auto_start_on_creation: e.target.checked })}
                          color="warning"
                          size="small"
                        />
                      }
                      label={
                        <Typography variant="body2">
                          Auto-start task when created (set status to "Started" immediately)
                        </Typography>
                      }
                    />
                    <Alert severity="warning" sx={{ mt: 2 }} icon={<AutoAwesomeIcon />}>
                      <strong>How it works:</strong> The system will automatically send reminders daily (or per your configured frequency)
                      from the reminder start date. Reminders stop when an employee marks the task as completed.
                    </Alert>
                  </Box>
                </Box>
              </Paper>
            )}

            <Divider sx={{ my: 2 }} />

            {/* Reminder Configuration Tabs */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <NotificationsIcon color="primary" />
              <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'primary.main' }}>
                Reminder Configuration
              </Typography>
            </Box>

            <Alert severity="info" sx={{ mb: 2 }}>
              Configure separate reminder schedules for clients (external) and employees (internal).
              Reminders will automatically stop when a task is marked as completed.
            </Alert>

            <Paper sx={{ borderRadius: 2 }}>
              <Tabs
                value={reminderTab}
                onChange={(e, v) => setReminderTab(v)}
                sx={{
                  borderBottom: 1,
                  borderColor: 'divider',
                  '& .MuiTab-root': { textTransform: 'none', fontWeight: 600 },
                }}
              >
                <Tab
                  icon={<PersonIcon />}
                  iconPosition="start"
                  label="Client Reminders"
                />
                <Tab
                  icon={<BusinessIcon />}
                  iconPosition="start"
                  label="Employee Reminders"
                />
              </Tabs>

              <Box sx={{ p: 3 }}>
                {reminderTab === 0 && (
                  <ReminderConfigSection
                    prefix="client"
                    enabled={formData.enable_client_reminders}
                    setEnabled={(val) => setFormData({ ...formData, enable_client_reminders: val })}
                    weekdays={clientWeekdays}
                    setWeekdays={setClientWeekdays}
                    handleWeekdayToggle={handleClientWeekdayToggle}
                  />
                )}
                {reminderTab === 1 && (
                  <ReminderConfigSection
                    prefix="employee"
                    enabled={formData.enable_employee_reminders}
                    setEnabled={(val) => setFormData({ ...formData, enable_employee_reminders: val })}
                    weekdays={employeeWeekdays}
                    setWeekdays={setEmployeeWeekdays}
                    handleWeekdayToggle={handleEmployeeWeekdayToggle}
                  />
                )}
              </Box>
            </Paper>

            {/* Period Information Preview */}
            {formData.default_frequency !== 'ONE_TIME' && editingWorkType?.period_info && (
              <Paper sx={{ p: 2, mt: 2, bgcolor: '#f8fafc', borderRadius: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                  Current Period Preview
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="caption" color="text.secondary">Period Start</Typography>
                    <Typography variant="body2">{editingWorkType.period_info.period_start}</Typography>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="caption" color="text.secondary">Period End</Typography>
                    <Typography variant="body2">{editingWorkType.period_info.period_end}</Typography>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="caption" color="text.secondary">Due Date</Typography>
                    <Typography variant="body2">{editingWorkType.period_info.due_date}</Typography>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="caption" color="text.secondary">Client Reminder Range</Typography>
                    <Typography variant="body2">
                      {editingWorkType.period_info.client_reminder_start} - {editingWorkType.period_info.client_reminder_end}
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, bgcolor: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={!formData.work_name}
          >
            {editingWorkType ? 'Update' : 'Create'}
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
  );
}
