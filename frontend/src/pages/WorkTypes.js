import { useState, useEffect } from 'react';
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
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
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
  ExpandMore as ExpandMoreIcon,
  SubdirectoryArrowRight as SubtaskIcon,
  ContentCopy as DuplicateIcon,
  CheckCircle as RequiredIcon,
  RadioButtonUnchecked as OptionalIcon,
} from '@mui/icons-material';
import { workTypesAPI, organizationEmailsAPI, subtaskCategoriesAPI } from '../services/api';
import { getErrorMessage } from '../utils/errorUtils';

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
    has_subtasks: false,
    // Auto-driven configuration
    is_auto_driven: false,
    auto_start_on_creation: true,
    // Sender email configuration
    sender_email: '',
    // Client reminder configuration
    enable_client_reminders: true,
    client_reminder_start_day: 1,
    client_reminder_end_day: 0,
    client_reminder_frequency_type: 'ALTERNATE_DAYS',
    client_reminder_interval_days: 2,
    client_reminder_weekdays: '',
    // Employee reminder configuration
    enable_employee_reminders: true,
    employee_notification_type: 'BOTH',
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

  // Subtask management
  const [openSubtaskDialog, setOpenSubtaskDialog] = useState(false);
  const [selectedWorkType, setSelectedWorkType] = useState(null);
  const [subtasks, setSubtasks] = useState([]);
  const [editingSubtask, setEditingSubtask] = useState(null);
  const [subtaskFormData, setSubtaskFormData] = useState({
    name: '',
    description: '',
    order: 0,
    is_active: true,
    is_required: true,
    is_auto_driven: false,
    due_days_before_parent: 0,
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
  });
  const [subtaskReminderTab, setSubtaskReminderTab] = useState(0);

  // Track selected weekdays for weekly reminders
  const [clientWeekdays, setClientWeekdays] = useState([]);
  const [employeeWeekdays, setEmployeeWeekdays] = useState([]);
  const [subtaskClientWeekdays, setSubtaskClientWeekdays] = useState([]);
  const [subtaskEmployeeWeekdays, setSubtaskEmployeeWeekdays] = useState([]);
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
      showSnackbar(getErrorMessage(error, 'Failed to fetch task categories'), 'error');
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

  const fetchSubtasks = async (workTypeId) => {
    try {
      const response = await subtaskCategoriesAPI.getByWorkType(workTypeId);
      const data = response.data;
      setSubtasks(Array.isArray(data) ? data : (data.results || []));
    } catch (error) {
      console.error('Failed to fetch subtasks', error);
      setSubtasks([]);
    }
  };

  useEffect(() => {
    fetchWorkTypes();
    fetchEmailAccounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleOpenDialog = (workType = null) => {
    console.log('handleOpenDialog called with:', workType);

    if (workType) {
      // Edit mode - load existing work type data
      setEditingWorkType(workType);
      setFormData(workType);
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
      // Add mode - reset to default values
      setEditingWorkType(null);
      setFormData({
        work_name: '',
        statutory_form: '',
        default_frequency: 'MONTHLY',
        description: '',
        is_active: true,
        due_date_day: 20,
        has_subtasks: false,
        is_auto_driven: false,
        auto_start_on_creation: true,
        sender_email: '',
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
    setFormData({
      work_name: '',
      statutory_form: '',
      default_frequency: 'MONTHLY',
      description: '',
      is_active: true,
      due_date_day: 20,
      has_subtasks: false,
      is_auto_driven: false,
      auto_start_on_creation: true,
      sender_email: '',
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
    setReminderTab(0);
  };

  const handleOpenSubtaskDialog = async (workType) => {
    setSelectedWorkType(workType);
    await fetchSubtasks(workType.id);
    setOpenSubtaskDialog(true);
  };

  const handleCloseSubtaskDialog = () => {
    setOpenSubtaskDialog(false);
    setSelectedWorkType(null);
    setSubtasks([]);
    setEditingSubtask(null);
    resetSubtaskForm();
  };

  const resetSubtaskForm = () => {
    setSubtaskFormData({
      name: '',
      description: '',
      order: subtasks.length,
      is_active: true,
      is_required: true,
      is_auto_driven: false,
      due_days_before_parent: 0,
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
    });
    setSubtaskClientWeekdays([]);
    setSubtaskEmployeeWeekdays([]);
    setEditingSubtask(null);
    setSubtaskReminderTab(0);
  };

  const handleEditSubtask = (subtask) => {
    setEditingSubtask(subtask);
    setSubtaskFormData(subtask);
    if (subtask.client_reminder_weekdays) {
      setSubtaskClientWeekdays(subtask.client_reminder_weekdays.split(',').map(d => parseInt(d)));
    } else {
      setSubtaskClientWeekdays([]);
    }
    if (subtask.employee_reminder_weekdays) {
      setSubtaskEmployeeWeekdays(subtask.employee_reminder_weekdays.split(',').map(d => parseInt(d)));
    } else {
      setSubtaskEmployeeWeekdays([]);
    }
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

  const handleSubtaskClientWeekdayToggle = (day) => {
    const newSelected = subtaskClientWeekdays.includes(day)
      ? subtaskClientWeekdays.filter(d => d !== day)
      : [...subtaskClientWeekdays, day].sort();
    setSubtaskClientWeekdays(newSelected);
    setSubtaskFormData({
      ...subtaskFormData,
      client_reminder_weekdays: newSelected.join(',')
    });
  };

  const handleSubtaskEmployeeWeekdayToggle = (day) => {
    const newSelected = subtaskEmployeeWeekdays.includes(day)
      ? subtaskEmployeeWeekdays.filter(d => d !== day)
      : [...subtaskEmployeeWeekdays, day].sort();
    setSubtaskEmployeeWeekdays(newSelected);
    setSubtaskFormData({
      ...subtaskFormData,
      employee_reminder_weekdays: newSelected.join(',')
    });
  };

  const handleSubmit = async () => {
    try {
      const dataToSubmit = { ...formData };
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

      // Sync legacy fields
      dataToSubmit.enable_reminders = dataToSubmit.enable_client_reminders;
      dataToSubmit.reminder_start_day = dataToSubmit.client_reminder_start_day;
      dataToSubmit.reminder_frequency_type = dataToSubmit.client_reminder_frequency_type;
      dataToSubmit.reminder_interval_days = dataToSubmit.client_reminder_interval_days;
      dataToSubmit.reminder_weekdays = dataToSubmit.client_reminder_weekdays;

      console.log('Submitting task category:', { editingWorkType, dataToSubmit });

      if (editingWorkType) {
        await workTypesAPI.update(editingWorkType.id, dataToSubmit);
        showSnackbar('Task category updated successfully', 'success');
      } else {
        await workTypesAPI.create(dataToSubmit);
        showSnackbar('Task category created successfully', 'success');
      }
      handleCloseDialog();
      fetchWorkTypes();
    } catch (error) {
      console.error('Error submitting task category:', error);
      showSnackbar(getErrorMessage(error, 'Failed to save task category'), 'error');
    }
  };

  const handleSubtaskSubmit = async () => {
    try {
      const dataToSubmit = { ...subtaskFormData, work_type: selectedWorkType.id };

      if (subtaskFormData.client_reminder_frequency_type === 'WEEKLY') {
        dataToSubmit.client_reminder_weekdays = subtaskClientWeekdays.join(',');
      } else {
        dataToSubmit.client_reminder_weekdays = '';
      }
      if (subtaskFormData.employee_reminder_frequency_type === 'WEEKLY') {
        dataToSubmit.employee_reminder_weekdays = subtaskEmployeeWeekdays.join(',');
      } else {
        dataToSubmit.employee_reminder_weekdays = '';
      }

      if (editingSubtask) {
        await subtaskCategoriesAPI.update(editingSubtask.id, dataToSubmit);
        showSnackbar('Subtask updated successfully', 'success');
      } else {
        await subtaskCategoriesAPI.create(dataToSubmit);
        showSnackbar('Subtask created successfully', 'success');

        // Update has_subtasks on work type if not already set
        if (!selectedWorkType.has_subtasks) {
          await workTypesAPI.update(selectedWorkType.id, { ...selectedWorkType, has_subtasks: true });
          fetchWorkTypes();
        }
      }

      await fetchSubtasks(selectedWorkType.id);
      resetSubtaskForm();
    } catch (error) {
      showSnackbar(getErrorMessage(error, 'Failed to save subtask'), 'error');
    }
  };

  const handleDeleteSubtask = async (subtaskId) => {
    if (window.confirm('Are you sure you want to delete this subtask?')) {
      try {
        await subtaskCategoriesAPI.delete(subtaskId);
        showSnackbar('Subtask deleted successfully', 'success');
        await fetchSubtasks(selectedWorkType.id);

        // If no more subtasks, update has_subtasks on work type
        const updatedSubtasks = subtasks.filter(s => s.id !== subtaskId);
        if (updatedSubtasks.length === 0) {
          await workTypesAPI.update(selectedWorkType.id, { ...selectedWorkType, has_subtasks: false });
          fetchWorkTypes();
        }
      } catch (error) {
        showSnackbar(getErrorMessage(error, 'Failed to delete subtask'), 'error');
      }
    }
  };

  const handleDuplicateSubtask = async (subtaskId) => {
    try {
      await subtaskCategoriesAPI.duplicate(subtaskId);
      showSnackbar('Subtask duplicated successfully', 'success');
      await fetchSubtasks(selectedWorkType.id);
    } catch (error) {
      showSnackbar(getErrorMessage(error, 'Failed to duplicate subtask'), 'error');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this task category?')) {
      try {
        await workTypesAPI.delete(id);
        showSnackbar('Task category deleted successfully', 'success');
        fetchWorkTypes();
      } catch (error) {
        showSnackbar(getErrorMessage(error, 'Failed to delete task category'), 'error');
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
    { field: 'statutory_form', headerName: 'Form', width: 100 },
    { field: 'work_name', headerName: 'Category Name', flex: 1, minWidth: 180 },
    {
      field: 'default_frequency',
      headerName: 'Frequency',
      width: 110,
      renderCell: (params) => (
        <Chip label={params.value} color="primary" size="small" variant="outlined" />
      ),
    },
    {
      field: 'has_subtasks',
      headerName: 'Subtasks',
      width: 120,
      renderCell: (params) => (
        params.value ? (
          <Chip
            icon={<SubtaskIcon sx={{ fontSize: 16 }} />}
            label={`${params.row.subtask_count || 0} items`}
            color="secondary"
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              handleOpenSubtaskDialog(params.row);
            }}
            sx={{ cursor: 'pointer' }}
          />
        ) : (
          <Chip
            label="None"
            size="small"
            variant="outlined"
            sx={{ color: 'text.secondary' }}
          />
        )
      ),
    },
    {
      field: 'enable_client_reminders',
      headerName: 'Client',
      width: 90,
      renderCell: (params) => (
        <Chip
          icon={<PersonIcon sx={{ fontSize: 14 }} />}
          label={params.value ? 'On' : 'Off'}
          color={params.value ? 'success' : 'default'}
          size="small"
        />
      ),
    },
    {
      field: 'enable_employee_reminders',
      headerName: 'Employee',
      width: 100,
      renderCell: (params) => (
        <Chip
          icon={<BusinessIcon sx={{ fontSize: 14 }} />}
          label={params.value ? 'On' : 'Off'}
          color={params.value ? 'info' : 'default'}
          size="small"
        />
      ),
    },
    {
      field: 'is_auto_driven',
      headerName: 'Auto',
      width: 80,
      renderCell: (params) => (
        params.value ? (
          <Chip
            icon={<AutoAwesomeIcon sx={{ fontSize: 14 }} />}
            label="Auto"
            color="warning"
            size="small"
          />
        ) : null
      ),
    },
    {
      field: 'is_active',
      headerName: 'Status',
      width: 90,
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
      width: 150,
      sortable: false,
      renderCell: (params) => (
        <Box>
          <Tooltip title="Manage Subtasks">
            <IconButton
              size="small"
              color="secondary"
              onClick={() => handleOpenSubtaskDialog(params.row)}
            >
              <SubtaskIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Edit">
            <IconButton
              size="small"
              color="primary"
              onClick={() => handleOpenDialog(params.row)}
            >
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton
              size="small"
              color="error"
              onClick={() => handleDelete(params.row.id)}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
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

  const ReminderConfigSection = ({ prefix, enabled, setEnabled, weekdays, handleWeekdayToggle, formDataObj, setFormDataObj }) => {  // eslint-disable-line no-unused-vars
    const frequencyType = formDataObj[`${prefix}_reminder_frequency_type`];
    const intervalDays = formDataObj[`${prefix}_reminder_interval_days`];

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <FormControlLabel
          control={
            <Switch
              checked={enabled}
              onChange={(e) => {
                setEnabled(e.target.checked);
                setFormDataObj({ ...formDataObj, [`enable_${prefix}_reminders`]: e.target.checked });
              }}
              color="primary"
            />
          }
          label={`Enable ${prefix === 'client' ? 'client' : 'employee/internal'} reminders`}
        />

        {enabled && (
          <Box sx={{ pl: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {prefix === 'employee' && (
              <FormControl fullWidth>
                <InputLabel>Notification Method</InputLabel>
                <Select
                  value={formDataObj.employee_notification_type}
                  label="Notification Method"
                  onChange={(e) => setFormDataObj({ ...formDataObj, employee_notification_type: e.target.value })}
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
                  value={formDataObj[`${prefix}_reminder_start_day`]}
                  onChange={(e) => {
                    const value = e.target.value === '' ? 1 : parseInt(e.target.value) || 1;
                    setFormDataObj({ ...formDataObj, [`${prefix}_reminder_start_day`]: value });
                  }}
                  inputProps={{ min: 1, max: 31 }}
                  helperText="Day of month/period to start reminders"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Reminder End Day"
                  type="number"
                  fullWidth
                  value={formDataObj[`${prefix}_reminder_end_day`]}
                  onChange={(e) => {
                    const value = e.target.value === '' ? 0 : parseInt(e.target.value) || 0;
                    setFormDataObj({ ...formDataObj, [`${prefix}_reminder_end_day`]: value });
                  }}
                  inputProps={{ min: -10, max: 31 }}
                  helperText={getEndDayHelperText(formDataObj[`${prefix}_reminder_end_day`])}
                />
              </Grid>
            </Grid>

            <FormControl fullWidth>
              <InputLabel>Reminder Frequency</InputLabel>
              <Select
                value={frequencyType}
                label="Reminder Frequency"
                onChange={(e) => setFormDataObj({ ...formDataObj, [`${prefix}_reminder_frequency_type`]: e.target.value })}
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
                onChange={(e) => {
                  const value = e.target.value === '' ? 1 : parseInt(e.target.value) || 1;
                  setFormDataObj({ ...formDataObj, [`${prefix}_reminder_interval_days`]: value });
                }}
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

            {prefix === 'employee' && (
              <Alert
                severity={formDataObj.employee_notification_type === 'BOTH' ? 'success' : 'warning'}
                sx={{ mt: 1 }}
                icon={
                  formDataObj.employee_notification_type === 'EMAIL' ? <EmailIcon /> :
                  formDataObj.employee_notification_type === 'IN_APP' ? <InAppIcon /> :
                  <NotificationsIcon />
                }
              >
                {formDataObj.employee_notification_type === 'EMAIL' &&
                  'Employees will receive reminders via email only.'}
                {formDataObj.employee_notification_type === 'IN_APP' &&
                  'Employees will receive in-app notifications only.'}
                {formDataObj.employee_notification_type === 'BOTH' &&
                  'Employees will receive both email and in-app notifications.'}
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
                    Task Categories
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.5 }}>
                    Define task categories with subtasks and separate reminder schedules
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
                Add Category
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

      {/* Add/Edit Task Category Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle sx={{ bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CategoryIcon color="primary" />
            {editingWorkType ? 'Edit Task Category' : 'Add New Task Category'}
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
                  label="Category Name"
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
                  placeholder="Brief description"
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
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={4}>
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
              <Grid item xs={12} sm={4}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.has_subtasks}
                      onChange={(e) => setFormData({ ...formData, has_subtasks: e.target.checked })}
                      color="secondary"
                    />
                  }
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <SubtaskIcon sx={{ fontSize: 18, color: formData.has_subtasks ? 'secondary.main' : 'text.disabled' }} />
                      Enable Subtasks
                    </Box>
                  }
                />
              </Grid>
              <Grid item xs={12} sm={4}>
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
                      Auto-Driven
                    </Box>
                  }
                />
              </Grid>
            </Grid>

            {/* Has Subtasks Info */}
            {formData.has_subtasks && (
              <Alert severity="info" icon={<SubtaskIcon />}>
                <strong>Subtasks Enabled:</strong> After saving, you can add individual subtasks with their own reminder configurations using the "Manage Subtasks" button.
              </Alert>
            )}

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
                      Auto-driven tasks start automatically and send reminders until completed.
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
                          Auto-start task when created
                        </Typography>
                      }
                    />
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
                <Tab icon={<PersonIcon />} iconPosition="start" label="Client Reminders" />
                <Tab icon={<BusinessIcon />} iconPosition="start" label="Employee Reminders" />
              </Tabs>

              <Box sx={{ p: 3 }}>
                {reminderTab === 0 && (
                  <ReminderConfigSection
                    prefix="client"
                    enabled={formData.enable_client_reminders}
                    setEnabled={(val) => setFormData({ ...formData, enable_client_reminders: val })}
                    weekdays={clientWeekdays}
                    handleWeekdayToggle={handleClientWeekdayToggle}
                    formDataObj={formData}
                    setFormDataObj={setFormData}
                  />
                )}
                {reminderTab === 1 && (
                  <ReminderConfigSection
                    prefix="employee"
                    enabled={formData.enable_employee_reminders}
                    setEnabled={(val) => setFormData({ ...formData, enable_employee_reminders: val })}
                    weekdays={employeeWeekdays}
                    handleWeekdayToggle={handleEmployeeWeekdayToggle}
                    formDataObj={formData}
                    setFormDataObj={setFormData}
                  />
                )}
              </Box>
            </Paper>
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

      {/* Subtask Management Dialog */}
      <Dialog open={openSubtaskDialog} onClose={handleCloseSubtaskDialog} maxWidth="lg" fullWidth>
        <DialogTitle sx={{ bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SubtaskIcon color="secondary" />
            <Box>
              <Typography variant="h6">
                Manage Subtasks
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {selectedWorkType?.work_name}
              </Typography>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          <Grid container>
            {/* Left Panel - Subtask List */}
            <Grid item xs={12} md={4} sx={{ borderRight: '1px solid #e2e8f0' }}>
              <Box sx={{ p: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
                  Subtasks ({subtasks.length})
                </Typography>
                <List dense>
                  {subtasks.map((subtask, index) => (
                    <ListItem
                      key={subtask.id}
                      sx={{
                        bgcolor: editingSubtask?.id === subtask.id ? 'action.selected' : 'transparent',
                        borderRadius: 1,
                        mb: 0.5,
                        border: '1px solid #e2e8f0',
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', mr: 1 }}>
                        {subtask.is_required ? (
                          <Tooltip title="Required">
                            <RequiredIcon sx={{ fontSize: 18, color: 'success.main' }} />
                          </Tooltip>
                        ) : (
                          <Tooltip title="Optional">
                            <OptionalIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
                          </Tooltip>
                        )}
                      </Box>
                      <ListItemText
                        primary={subtask.name}
                        secondary={
                          <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
                            {subtask.is_auto_driven && (
                              <Chip label="Auto" size="small" color="warning" sx={{ height: 18, fontSize: '0.65rem' }} />
                            )}
                            {!subtask.is_active && (
                              <Chip label="Inactive" size="small" sx={{ height: 18, fontSize: '0.65rem' }} />
                            )}
                          </Box>
                        }
                        primaryTypographyProps={{ fontWeight: 500, fontSize: '0.9rem' }}
                      />
                      <ListItemSecondaryAction>
                        <IconButton size="small" onClick={() => handleEditSubtask(subtask)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" onClick={() => handleDuplicateSubtask(subtask.id)}>
                          <DuplicateIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" color="error" onClick={() => handleDeleteSubtask(subtask.id)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
                {subtasks.length === 0 && (
                  <Alert severity="info" sx={{ mt: 2 }}>
                    No subtasks yet. Add one using the form on the right.
                  </Alert>
                )}
              </Box>
            </Grid>

            {/* Right Panel - Subtask Form */}
            <Grid item xs={12} md={8}>
              <Box sx={{ p: 3 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, color: 'secondary.main' }}>
                  {editingSubtask ? 'Edit Subtask' : 'Add New Subtask'}
                </Typography>

                <Grid container spacing={2}>
                  <Grid item xs={12} sm={8}>
                    <TextField
                      label="Subtask Name"
                      fullWidth
                      required
                      value={subtaskFormData.name}
                      onChange={(e) => setSubtaskFormData({ ...subtaskFormData, name: e.target.value })}
                      placeholder="e.g., Collect Documents"
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      label="Order"
                      type="number"
                      fullWidth
                      value={subtaskFormData.order}
                      onChange={(e) => setSubtaskFormData({ ...subtaskFormData, order: parseInt(e.target.value) || 0 })}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      label="Description"
                      fullWidth
                      multiline
                      rows={2}
                      value={subtaskFormData.description || ''}
                      onChange={(e) => setSubtaskFormData({ ...subtaskFormData, description: e.target.value })}
                    />
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={subtaskFormData.is_active}
                          onChange={(e) => setSubtaskFormData({ ...subtaskFormData, is_active: e.target.checked })}
                        />
                      }
                      label="Active"
                    />
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={subtaskFormData.is_required}
                          onChange={(e) => setSubtaskFormData({ ...subtaskFormData, is_required: e.target.checked })}
                          color="success"
                        />
                      }
                      label="Required"
                    />
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={subtaskFormData.is_auto_driven}
                          onChange={(e) => setSubtaskFormData({ ...subtaskFormData, is_auto_driven: e.target.checked })}
                          color="warning"
                        />
                      }
                      label="Auto-Driven"
                    />
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <TextField
                      label="Days Before Due"
                      type="number"
                      fullWidth
                      size="small"
                      value={subtaskFormData.due_days_before_parent}
                      onChange={(e) => setSubtaskFormData({ ...subtaskFormData, due_days_before_parent: parseInt(e.target.value) || 0 })}
                      helperText="0 = same day"
                    />
                  </Grid>
                </Grid>

                <Divider sx={{ my: 3 }} />

                {/* Subtask Reminder Configuration */}
                <Accordion defaultExpanded>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <NotificationsIcon color="primary" />
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        Subtask Reminder Configuration
                      </Typography>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Paper sx={{ borderRadius: 2 }}>
                      <Tabs
                        value={subtaskReminderTab}
                        onChange={(e, v) => setSubtaskReminderTab(v)}
                        sx={{
                          borderBottom: 1,
                          borderColor: 'divider',
                          '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, minHeight: 40 },
                        }}
                      >
                        <Tab icon={<PersonIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Client" />
                        <Tab icon={<BusinessIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Employee" />
                      </Tabs>

                      <Box sx={{ p: 2 }}>
                        {subtaskReminderTab === 0 && (
                          <ReminderConfigSection
                            prefix="client"
                            enabled={subtaskFormData.enable_client_reminders}
                            setEnabled={(val) => setSubtaskFormData({ ...subtaskFormData, enable_client_reminders: val })}
                            weekdays={subtaskClientWeekdays}
                            handleWeekdayToggle={handleSubtaskClientWeekdayToggle}
                            formDataObj={subtaskFormData}
                            setFormDataObj={setSubtaskFormData}
                          />
                        )}
                        {subtaskReminderTab === 1 && (
                          <ReminderConfigSection
                            prefix="employee"
                            enabled={subtaskFormData.enable_employee_reminders}
                            setEnabled={(val) => setSubtaskFormData({ ...subtaskFormData, enable_employee_reminders: val })}
                            weekdays={subtaskEmployeeWeekdays}
                            handleWeekdayToggle={handleSubtaskEmployeeWeekdayToggle}
                            formDataObj={subtaskFormData}
                            setFormDataObj={setSubtaskFormData}
                          />
                        )}
                      </Box>
                    </Paper>
                  </AccordionDetails>
                </Accordion>

                <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                  {editingSubtask && (
                    <Button onClick={resetSubtaskForm} color="inherit">
                      Cancel Edit
                    </Button>
                  )}
                  <Button
                    variant="contained"
                    color="secondary"
                    onClick={handleSubtaskSubmit}
                    disabled={!subtaskFormData.name}
                    startIcon={editingSubtask ? <EditIcon /> : <AddIcon />}
                  >
                    {editingSubtask ? 'Update Subtask' : 'Add Subtask'}
                  </Button>
                </Box>
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2, bgcolor: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
          <Button onClick={handleCloseSubtaskDialog} variant="contained">
            Done
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={snackbar.severity === 'error' ? 8000 : 4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
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
