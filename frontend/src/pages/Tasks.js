import React, { useState, useEffect, useRef } from 'react';
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
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Grid,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  CircularProgress,
  Tooltip,
  Badge,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Assignment as AssignmentIcon,
  FilterList as FilterIcon,
  Note as NoteIcon,
  NoteAdd as NoteAddIcon,
  AttachFile as AttachFileIcon,
  CloudUpload as CloudUploadIcon,
  Download as DownloadIcon,
  InsertDriveFile as FileIcon,
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  Timer as TimerIcon,
  Flag as FlagIcon,
  CloudDone as CloudDoneIcon,
  CloudOff as CloudOffIcon,
} from '@mui/icons-material';
import { tasksAPI, clientsAPI, workTypesAPI, usersAPI, taskDocumentsAPI } from '../services/api';
import { getErrorMessage } from '../utils/errorUtils';
import { format } from 'date-fns';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const getStatusChip = (status) => {
  const statusConfig = {
    'NOT_STARTED': { label: 'Not Started', color: 'default' },
    'STARTED': { label: 'Started', color: 'info' },
    'PAUSED': { label: 'Paused', color: 'warning' },
    'COMPLETED': { label: 'Completed', color: 'success' },
  };

  const config = statusConfig[status] || { label: status, color: 'default' };
  return <Chip label={config.label} color={config.color} size="small" />;
};

// Timer Display Component that shows real-time updates
const TimerDisplay = ({ task, onTimerToggle }) => {
  const [displayTime, setDisplayTime] = useState(task.formatted_time_spent || '00:00:00');
  const intervalRef = useRef(null);

  useEffect(() => {
    // If timer is running, start interval to update display
    if (task.is_timer_running) {
      const startTime = task.timer_started_at ? new Date(task.timer_started_at).getTime() : Date.now();
      const baseTime = task.total_time_spent || 0;

      const updateTimer = () => {
        const now = Date.now();
        const elapsed = Math.floor((now - startTime) / 1000);
        const totalSeconds = baseTime + elapsed;

        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        setDisplayTime(
          `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
        );
      };

      updateTimer(); // Initial update
      intervalRef.current = setInterval(updateTimer, 1000);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    } else {
      // Timer not running, just show the stored time
      setDisplayTime(task.formatted_time_spent || '00:00:00');
    }
  }, [task.is_timer_running, task.timer_started_at, task.total_time_spent, task.formatted_time_spent]);

  const isCompleted = task.status === 'COMPLETED';
  const showPlayButton = !isCompleted && !task.is_timer_running;
  const showPauseButton = !isCompleted && task.is_timer_running;

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      <Tooltip title={task.is_timer_running ? "Timer Running" : "Time Spent"}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            bgcolor: task.is_timer_running ? 'success.light' : 'grey.100',
            px: 1,
            py: 0.25,
            borderRadius: 1,
            color: task.is_timer_running ? 'success.contrastText' : 'text.primary',
            fontFamily: 'monospace',
            fontSize: '0.8rem',
            fontWeight: 500,
          }}
        >
          {task.is_timer_running && (
            <TimerIcon sx={{ fontSize: 14, animation: 'pulse 1s infinite' }} />
          )}
          {displayTime}
        </Box>
      </Tooltip>
      {showPlayButton && (
        <Tooltip title="Start Timer">
          <IconButton
            size="small"
            color="success"
            onClick={(e) => {
              e.stopPropagation();
              onTimerToggle(task.id, 'start');
            }}
            sx={{ p: 0.25 }}
          >
            <PlayIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
      {showPauseButton && (
        <Tooltip title="Pause Timer">
          <IconButton
            size="small"
            color="warning"
            onClick={(e) => {
              e.stopPropagation();
              onTimerToggle(task.id, 'pause');
            }}
            sx={{ p: 0.25 }}
          >
            <PauseIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
    </Box>
  );
};

export default function Tasks() {
  const location = useLocation();
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [clients, setClients] = useState([]);
  const [workTypes, setWorkTypes] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [formData, setFormData] = useState({
    client_work: '',
    client_id: '',
    work_type_id: '',
    period_label: '',
    due_date: '',
    status: 'NOT_STARTED',
    assigned_to: null,
    remarks: '',
  });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Period options state
  const [periodOptions, setPeriodOptions] = useState([]);
  const [periodOptionsLoading, setPeriodOptionsLoading] = useState(false);
  const [dueDateError, setDueDateError] = useState('');

  // Notes Dialog state
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [notesTask, setNotesTask] = useState(null);
  const [notesText, setNotesText] = useState('');

  // Documents Dialog state
  const [documentsDialogOpen, setDocumentsDialogOpen] = useState(false);
  const [documentsTask, setDocumentsTask] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [documentDescription, setDocumentDescription] = useState('');

  // Check if user is staff (limited permissions)
  const isStaff = user?.role === 'STAFF';
  const canManageTasks = ['ADMIN', 'PARTNER', 'MANAGER'].includes(user?.role);

  // Filters
  const [filters, setFilters] = useState({
    status: '',
    client: '',
    work_type: '',
  });

  useEffect(() => {
    fetchTasks();
    if (canManageTasks) {
      fetchClients();
      fetchWorkTypes();
      fetchEmployees();
    }

    // Apply filter from navigation state (from dashboard tiles)
    if (location.state?.filterStatus) {
      setFilters(prev => ({ ...prev, status: location.state.filterStatus }));
    }
  }, [location.state, canManageTasks]);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const response = await tasksAPI.getAll();
      const data = response.data;
      // Ensure tasks is always an array
      setTasks(Array.isArray(data) ? data : (data.results || []));
    } catch (error) {
      showSnackbar(getErrorMessage(error, 'Failed to fetch tasks'), 'error');
      setTasks([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const response = await clientsAPI.getAll();
      const data = response.data;
      // Ensure clients is always an array
      setClients(Array.isArray(data) ? data : (data.results || []));
    } catch (error) {
      console.error('Failed to fetch clients', error);
      setClients([]); // Set empty array on error
    }
  };

  const fetchWorkTypes = async () => {
    try {
      const response = await workTypesAPI.getAll();
      const data = response.data;
      // Ensure workTypes is always an array
      setWorkTypes(Array.isArray(data) ? data : (data.results || []));
    } catch (error) {
      console.error('Failed to fetch work types', error);
      setWorkTypes([]); // Set empty array on error
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await usersAPI.getAll({ is_active: true });
      const data = response.data;
      // Ensure employees is always an array
      setEmployees(Array.isArray(data) ? data : (data.results || []));
    } catch (error) {
      console.error('Failed to fetch employees', error);
      setEmployees([]); // Set empty array on error
    }
  };

  // Handle work type selection - fetch period options
  const handleWorkTypeChange = async (workTypeId) => {
    setFormData(prev => ({ ...prev, work_type_id: workTypeId, period_label: '', due_date: '' }));
    setPeriodOptions([]);
    setDueDateError('');

    if (!workTypeId) return;

    setPeriodOptionsLoading(true);
    try {
      const response = await workTypesAPI.getPeriodOptions(workTypeId);
      const data = response.data;
      setPeriodOptions(data.period_options || []);

      // Auto-select first period option and set its due date
      if (data.period_options && data.period_options.length > 0) {
        const firstOption = data.period_options[0];
        setFormData(prev => ({
          ...prev,
          period_label: firstOption.value,
          due_date: firstOption.due_date
        }));
      }
    } catch (error) {
      console.error('Failed to fetch period options', error);
      showSnackbar(getErrorMessage(error, 'Failed to fetch period options'), 'error');
    } finally {
      setPeriodOptionsLoading(false);
    }
  };

  // Handle period label selection - update due date
  const handlePeriodLabelChange = (periodValue) => {
    const selectedPeriod = periodOptions.find(p => p.value === periodValue);
    setFormData(prev => ({
      ...prev,
      period_label: periodValue,
      due_date: selectedPeriod ? selectedPeriod.due_date : prev.due_date
    }));
    setDueDateError('');
  };

  // Validate due date - must not be before current date
  const validateDueDate = (dateValue) => {
    if (!dateValue) {
      setDueDateError('');
      return true;
    }
    const selectedDate = new Date(dateValue);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (selectedDate < today) {
      setDueDateError('Due date cannot be before current date');
      return false;
    }
    setDueDateError('');
    return true;
  };

  // Handle due date change with validation
  const handleDueDateChange = (dateValue) => {
    setFormData(prev => ({ ...prev, due_date: dateValue }));
    validateDueDate(dateValue);
  };

  const handleOpenDialog = (task = null) => {
    if (task) {
      setEditingTask(task);
      setFormData({
        client_work: task.client_work,
        client_id: task.client_id,
        work_type_id: task.work_type_id,
        period_label: task.period_label,
        due_date: task.due_date,
        status: task.status,
        assigned_to: task.assigned_to,
        remarks: task.remarks || '',
      });
      setPeriodOptions([]);
    } else {
      setEditingTask(null);
      setFormData({
        client_work: '',
        client_id: '',
        work_type_id: '',
        period_label: '',
        due_date: '',
        status: 'NOT_STARTED',
        assigned_to: null,
        remarks: '',
      });
      setPeriodOptions([]);
    }
    setDueDateError('');
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingTask(null);
  };

  const handleSubmit = async () => {
    // Validate due date before submission
    if (formData.due_date && !validateDueDate(formData.due_date)) {
      showSnackbar('Due date cannot be before current date', 'error');
      return;
    }

    try {
      // For staff, only allow status and remarks updates
      if (isStaff && editingTask) {
        const staffUpdateData = {
          status: formData.status,
          remarks: formData.remarks,
        };
        await tasksAPI.update(editingTask.id, staffUpdateData);
        showSnackbar('Task status updated successfully', 'success');
      } else if (editingTask) {
        // For update, send only editable fields
        const updateData = {
          status: formData.status,
          assigned_to: formData.assigned_to,
          remarks: formData.remarks,
          due_date: formData.due_date,
        };
        await tasksAPI.update(editingTask.id, updateData);
        showSnackbar('Task updated successfully', 'success');
      } else {
        await tasksAPI.create(formData);
        showSnackbar('Task created successfully', 'success');
      }
      handleCloseDialog();
      fetchTasks();
    } catch (error) {
      showSnackbar(getErrorMessage(error, 'Failed to save task'), 'error');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      try {
        await tasksAPI.delete(id);
        showSnackbar('Task deleted successfully', 'success');
        fetchTasks();
      } catch (error) {
        showSnackbar(getErrorMessage(error, 'Failed to delete task'), 'error');
      }
    }
  };

  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  // Notes dialog handlers
  const handleOpenNotesDialog = (task) => {
    setNotesTask(task);
    setNotesText(task.remarks || '');
    setNotesDialogOpen(true);
  };

  const handleCloseNotesDialog = () => {
    setNotesDialogOpen(false);
    setNotesTask(null);
    setNotesText('');
  };

  const handleSaveNotes = async () => {
    try {
      await tasksAPI.update(notesTask.id, { remarks: notesText });
      showSnackbar('Notes saved successfully', 'success');
      handleCloseNotesDialog();
      fetchTasks();
    } catch (error) {
      showSnackbar(getErrorMessage(error, 'Failed to save notes'), 'error');
    }
  };

  // Documents dialog handlers
  const handleOpenDocumentsDialog = async (task) => {
    setDocumentsTask(task);
    setDocumentsDialogOpen(true);
    setDocumentsLoading(true);
    try {
      const response = await taskDocumentsAPI.getByTask(task.id);
      setDocuments(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      showSnackbar(getErrorMessage(error, 'Failed to fetch documents'), 'error');
      setDocuments([]);
    } finally {
      setDocumentsLoading(false);
    }
  };

  const handleCloseDocumentsDialog = () => {
    setDocumentsDialogOpen(false);
    setDocumentsTask(null);
    setDocuments([]);
    setDocumentDescription('');
    // Refresh task list to update document counts
    fetchTasks();
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploadingDocument(true);
    try {
      await taskDocumentsAPI.upload(documentsTask.id, file, documentDescription);
      showSnackbar('Document uploaded successfully', 'success');
      setDocumentDescription('');
      // Refresh documents list
      const response = await taskDocumentsAPI.getByTask(documentsTask.id);
      setDocuments(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      showSnackbar(getErrorMessage(error, 'Failed to upload document'), 'error');
    } finally {
      setUploadingDocument(false);
      // Reset the file input
      event.target.value = '';
    }
  };

  const handleDownloadDocument = async (doc) => {
    try {
      const response = await taskDocumentsAPI.download(doc.id);
      // Create a blob URL and trigger download
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', doc.file_name);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      showSnackbar(getErrorMessage(error, 'Failed to download document'), 'error');
    }
  };

  const handleDeleteDocument = async (docId) => {
    if (window.confirm('Are you sure you want to delete this document?')) {
      try {
        await taskDocumentsAPI.delete(docId);
        showSnackbar('Document deleted successfully', 'success');
        // Refresh documents list
        const response = await taskDocumentsAPI.getByTask(documentsTask.id);
        setDocuments(Array.isArray(response.data) ? response.data : []);
      } catch (error) {
        showSnackbar(getErrorMessage(error, 'Failed to delete document'), 'error');
      }
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Timer toggle handler
  const handleTimerToggle = async (taskId, action) => {
    try {
      let response;
      if (action === 'start') {
        response = await tasksAPI.startTimer(taskId);
        showSnackbar('Timer started', 'success');
      } else if (action === 'pause') {
        response = await tasksAPI.pauseTimer(taskId);
        showSnackbar(`Timer paused - Time: ${response.data.time_spent || response.data.data?.formatted_time_spent}`, 'info');
      }
      // Refresh tasks to get updated data
      fetchTasks();
    } catch (error) {
      showSnackbar(getErrorMessage(error, 'Timer operation failed'), 'error');
    }
  };

  // Apply filters
  const filteredTasks = Array.isArray(tasks) ? tasks.filter((task) => {
    if (filters.status && task.status !== filters.status) return false;
    if (filters.client && task.client !== filters.client) return false;
    if (filters.work_type && task.work_type !== filters.work_type) return false;
    return true;
  }) : [];

  // Define columns based on user role
  const getColumns = () => {
    const baseColumns = [
      { field: 'client_name', headerName: 'Client', flex: 1, minWidth: 180 },
      { field: 'work_type_name', headerName: 'Work Type', flex: 1, minWidth: 150 },
      { field: 'period_label', headerName: 'Period', width: 130 },
      {
        field: 'due_date',
        headerName: 'Due Date',
        width: 160,
        renderCell: (params) => {
          const isOverdue = params.row.is_overdue;
          return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {isOverdue && (
                <Tooltip title="Overdue">
                  <FlagIcon sx={{ color: 'error.main', fontSize: 18 }} />
                </Tooltip>
              )}
              <span style={{ color: isOverdue ? '#d32f2f' : 'inherit', fontWeight: isOverdue ? 600 : 400 }}>
                {format(new Date(params.value), 'dd-MMM-yyyy')}
              </span>
            </Box>
          );
        },
      },
      {
        field: 'status',
        headerName: 'Status',
        width: 140,
        renderCell: (params) => {
          const isOverdue = params.row.is_overdue;
          // If task is overdue, show it as error color regardless of actual status
          if (isOverdue) {
            return <Chip label={params.value.replace('_', ' ')} color="error" size="small" />;
          }
          return getStatusChip(params.value);
        },
      },
      {
        field: 'time_spent',
        headerName: 'Time Spent',
        width: 170,
        sortable: false,
        renderCell: (params) => (
          <TimerDisplay task={params.row} onTimerToggle={handleTimerToggle} />
        ),
      },
      {
        field: 'document_count',
        headerName: 'Attachments',
        width: 100,
        align: 'center',
        headerAlign: 'center',
        renderCell: (params) => {
          const count = params.row.document_count || 0;
          if (count === 0) {
            return (
              <Tooltip title="No attachments">
                <Box sx={{ color: 'text.disabled' }}>
                  <AttachFileIcon fontSize="small" sx={{ opacity: 0.3 }} />
                </Box>
              </Tooltip>
            );
          }
          return (
            <Tooltip title={`${count} attachment${count > 1 ? 's' : ''}`}>
              <Badge
                badgeContent={count}
                color="primary"
                sx={{
                  '& .MuiBadge-badge': {
                    fontSize: '0.65rem',
                    height: 16,
                    minWidth: 16,
                  },
                }}
              >
                <AttachFileIcon fontSize="small" color="primary" />
              </Badge>
            </Tooltip>
          );
        },
      },
      {
        field: 'google_synced',
        headerName: 'Google',
        width: 90,
        align: 'center',
        headerAlign: 'center',
        sortable: false,
        renderCell: (params) => {
          // Check if task is synced to Google (you can enhance this later with actual sync status from API)
          const isSynced = params.row.assigned_to; // Tasks with assigned users might be synced
          if (isSynced) {
            return (
              <Tooltip title="Synced to Google Tasks">
                <CloudDoneIcon fontSize="small" sx={{ color: 'success.main' }} />
              </Tooltip>
            );
          }
          return (
            <Tooltip title="Not synced">
              <CloudOffIcon fontSize="small" sx={{ color: 'text.disabled', opacity: 0.3 }} />
            </Tooltip>
          );
        },
      },
    ];

    // Staff view - simpler actions (only update status)
    if (isStaff) {
      return [
        ...baseColumns,
        {
          field: 'actions',
          headerName: 'Actions',
          width: 160,
          sortable: false,
          renderCell: (params) => (
            <Box>
              <IconButton
                size="small"
                color="primary"
                onClick={() => handleOpenDialog(params.row)}
                title="Update Status"
              >
                <EditIcon fontSize="small" />
              </IconButton>
              <IconButton
                size="small"
                color={params.row.remarks ? 'secondary' : 'default'}
                onClick={() => handleOpenNotesDialog(params.row)}
                title={params.row.remarks ? 'View/Edit Notes' : 'Add Notes'}
              >
                {params.row.remarks ? <NoteIcon fontSize="small" /> : <NoteAddIcon fontSize="small" />}
              </IconButton>
              <IconButton
                size="small"
                color="info"
                onClick={() => handleOpenDocumentsDialog(params.row)}
                title="Documents"
              >
                <AttachFileIcon fontSize="small" />
              </IconButton>
            </Box>
          ),
        },
      ];
    }

    // Admin/Manager view - full actions
    return [
      ...baseColumns,
      { field: 'assigned_to_name', headerName: 'Assigned To', width: 140 },
      {
        field: 'actions',
        headerName: 'Actions',
        width: 180,
        sortable: false,
        renderCell: (params) => (
          <Box>
            <IconButton
              size="small"
              color="primary"
              onClick={() => handleOpenDialog(params.row)}
              title="Edit Task"
            >
              <EditIcon fontSize="small" />
            </IconButton>
            <IconButton
              size="small"
              color={params.row.remarks ? 'secondary' : 'default'}
              onClick={() => handleOpenNotesDialog(params.row)}
              title={params.row.remarks ? 'View/Edit Notes' : 'Add Notes'}
            >
              {params.row.remarks ? <NoteIcon fontSize="small" /> : <NoteAddIcon fontSize="small" />}
            </IconButton>
            <IconButton
              size="small"
              color="info"
              onClick={() => handleOpenDocumentsDialog(params.row)}
              title="Documents"
            >
              <AttachFileIcon fontSize="small" />
            </IconButton>
            <IconButton
              size="small"
              color="error"
              onClick={() => handleDelete(params.row.id)}
              title="Delete Task"
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Box>
        ),
      },
    ];
  };

  const statuses = ['NOT_STARTED', 'STARTED', 'PAUSED', 'COMPLETED'];

  return (
    <Container maxWidth="xl">
      <Box sx={{ mb: 4 }}>
        <Card
          sx={{
            background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
            color: 'white',
            mb: 3,
          }}
        >
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <AssignmentIcon sx={{ fontSize: 40 }} />
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 600 }}>
                    {isStaff ? 'My Assigned Tasks' : 'Tasks Management'}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.5 }}>
                    {isStaff
                      ? 'View and update status of your assigned tasks'
                      : 'Track and manage client tasks and deliverables'}
                  </Typography>
                </Box>
              </Box>
              {canManageTasks && (
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
                  Add Task
                </Button>
              )}
            </Box>
          </CardContent>
        </Card>

        {/* Filters */}
        <Card sx={{ mb: 3, borderRadius: 3, boxShadow: 2 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <FilterIcon color="primary" />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Filters
              </Typography>
            </Box>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={isStaff ? 12 : 4}>
                <FormControl fullWidth size="small">
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={filters.status}
                    label="Status"
                    onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  >
                    <MenuItem value="">All</MenuItem>
                    {statuses.map((status) => (
                      <MenuItem key={status} value={status}>
                        {status.replace('_', ' ')}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              {canManageTasks && (
                <>
                  <Grid item xs={12} sm={4}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Client</InputLabel>
                      <Select
                        value={filters.client}
                        label="Client"
                        onChange={(e) => setFilters({ ...filters, client: e.target.value })}
                      >
                        <MenuItem value="">All</MenuItem>
                        {Array.isArray(clients) && clients.map((client) => (
                          <MenuItem key={client.id} value={client.id}>
                            {client.client_name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Work Type</InputLabel>
                      <Select
                        value={filters.work_type}
                        label="Work Type"
                        onChange={(e) => setFilters({ ...filters, work_type: e.target.value })}
                      >
                        <MenuItem value="">All</MenuItem>
                        {Array.isArray(workTypes) && workTypes.map((wt) => (
                          <MenuItem key={wt.id} value={wt.id}>
                            {wt.work_name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                </>
              )}
            </Grid>
          </CardContent>
        </Card>

        <Card sx={{ borderRadius: 3, boxShadow: 3 }}>
          <Box sx={{ height: 600, width: '100%' }}>
            <DataGrid
              rows={filteredTasks}
              columns={getColumns()}
              pageSize={10}
              rowsPerPageOptions={[10, 25, 50]}
              loading={loading}
              disableSelectionOnClick
              getRowClassName={(params) => {
                if (params.row.status === 'OVERDUE') return 'row-overdue';
                return '';
              }}
              sx={{
                border: 'none',
                '& .MuiDataGrid-cell:focus': {
                  outline: 'none',
                },
                '& .row-overdue': {
                  backgroundColor: 'rgba(211, 47, 47, 0.08)',
                  '&:hover': {
                    backgroundColor: 'rgba(211, 47, 47, 0.15)',
                  },
                },
                '& .row-overdue .MuiDataGrid-cell': {
                  borderColor: 'rgba(211, 47, 47, 0.2)',
                },
              }}
            />
          </Box>
        </Card>
      </Box>

      {/* Add/Edit Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {isStaff ? 'Update Task Status' : (editingTask ? 'Edit Task' : 'Add New Task')}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            {/* Staff can only see task info and update status/notes */}
            {isStaff ? (
              <>
                {/* Read-only task info for staff */}
                <Alert severity="info" sx={{ mb: 2 }}>
                  You can only update the status and add notes for your assigned tasks.
                </Alert>
                <TextField
                  label="Client"
                  fullWidth
                  value={editingTask?.client_name || ''}
                  disabled
                />
                <TextField
                  label="Work Type"
                  fullWidth
                  value={editingTask?.work_type_name || ''}
                  disabled
                />
                <TextField
                  label="Period"
                  fullWidth
                  value={editingTask?.period_label || ''}
                  disabled
                />
                <TextField
                  label="Due Date"
                  fullWidth
                  value={editingTask?.due_date ? format(new Date(editingTask.due_date), 'dd-MMM-yyyy') : ''}
                  disabled
                />
                <FormControl fullWidth required>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={formData.status}
                    label="Status"
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    {statuses.map((status) => (
                      <MenuItem key={status} value={status}>
                        {status.replace('_', ' ')}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <TextField
                  label="Notes"
                  multiline
                  rows={3}
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  placeholder="Add any notes about this task..."
                />
              </>
            ) : (
              <>
                {/* Full form for admin/manager */}
                {editingTask ? (
                  <>
                    {/* Edit mode - show read-only info for client/work type */}
                    <TextField
                      label="Client"
                      fullWidth
                      value={editingTask?.client_name || ''}
                      disabled
                    />
                    <TextField
                      label="Work Type"
                      fullWidth
                      value={editingTask?.work_type_name || ''}
                      disabled
                    />
                    <TextField
                      label="Period"
                      fullWidth
                      value={editingTask?.period_label || ''}
                      disabled
                    />
                  </>
                ) : (
                  <>
                    {/* Create mode - allow selection */}
                    <Alert severity="info" sx={{ mb: 1 }}>
                      Tasks are typically created automatically when assigning work types to clients.
                      Use this form only for manual task creation.
                    </Alert>
                    <FormControl fullWidth required>
                      <InputLabel>Client</InputLabel>
                      <Select
                        value={formData.client_id}
                        label="Client"
                        onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                      >
                        {Array.isArray(clients) && clients.map((client) => (
                          <MenuItem key={client.id} value={client.id}>
                            {client.client_name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    <FormControl fullWidth required>
                      <InputLabel>Work Type</InputLabel>
                      <Select
                        value={formData.work_type_id}
                        label="Work Type"
                        onChange={(e) => handleWorkTypeChange(e.target.value)}
                      >
                        {Array.isArray(workTypes) && workTypes.map((wt) => (
                          <MenuItem key={wt.id} value={wt.id}>
                            {wt.work_name} ({wt.default_frequency})
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    <FormControl fullWidth required disabled={!formData.work_type_id || periodOptionsLoading}>
                      <InputLabel>Period Label</InputLabel>
                      <Select
                        value={formData.period_label}
                        label="Period Label"
                        onChange={(e) => handlePeriodLabelChange(e.target.value)}
                      >
                        {periodOptionsLoading ? (
                          <MenuItem disabled>Loading periods...</MenuItem>
                        ) : periodOptions.length > 0 ? (
                          periodOptions.map((option) => (
                            <MenuItem key={option.value} value={option.value}>
                              {option.label}
                            </MenuItem>
                          ))
                        ) : (
                          <MenuItem disabled>Select a work type first</MenuItem>
                        )}
                      </Select>
                      {periodOptionsLoading && (
                        <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                          <CircularProgress size={16} sx={{ mr: 1 }} />
                          <Typography variant="caption">Loading period options...</Typography>
                        </Box>
                      )}
                    </FormControl>
                  </>
                )}

                <TextField
                  label="Due Date"
                  type="date"
                  fullWidth
                  required
                  value={formData.due_date}
                  onChange={(e) => handleDueDateChange(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  error={!!dueDateError}
                  helperText={dueDateError || 'Auto-filled from work type. You can modify if needed.'}
                  inputProps={{
                    min: new Date().toISOString().split('T')[0]
                  }}
                />

                <FormControl fullWidth required>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={formData.status}
                    label="Status"
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    {statuses.map((status) => (
                      <MenuItem key={status} value={status}>
                        {status.replace('_', ' ')}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl fullWidth>
                  <InputLabel>Assigned To</InputLabel>
                  <Select
                    value={formData.assigned_to || ''}
                    label="Assigned To"
                    onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value || null })}
                  >
                    <MenuItem value="">Unassigned</MenuItem>
                    {Array.isArray(employees) && employees.map((employee) => (
                      <MenuItem key={employee.id} value={employee.id}>
                        {employee.first_name && employee.last_name
                          ? `${employee.first_name} ${employee.last_name} (${employee.email})`
                          : employee.email}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <TextField
                  label="Notes"
                  multiline
                  rows={3}
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                />
              </>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={
              isStaff
                ? false
                : (editingTask
                    ? (!formData.due_date || !!dueDateError)
                    : (!formData.client_id || !formData.work_type_id || !formData.due_date || !formData.period_label || !!dueDateError))
            }
          >
            {isStaff ? 'Update Status' : (editingTask ? 'Update' : 'Create')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Notes Dialog */}
      <Dialog open={notesDialogOpen} onClose={handleCloseNotesDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <NoteIcon color="primary" />
          Task Notes
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            {notesTask && (
              <Alert severity="info" sx={{ mb: 2 }}>
                <strong>{notesTask.client_name}</strong> - {notesTask.work_type_name} ({notesTask.period_label})
              </Alert>
            )}
            <TextField
              label="Notes"
              multiline
              rows={6}
              fullWidth
              value={notesText}
              onChange={(e) => setNotesText(e.target.value)}
              placeholder="Add your notes about this task..."
              helperText="Notes are visible to all team members"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseNotesDialog}>Cancel</Button>
          <Button onClick={handleSaveNotes} variant="contained" startIcon={<NoteIcon />}>
            Save Notes
          </Button>
        </DialogActions>
      </Dialog>

      {/* Documents Dialog */}
      <Dialog open={documentsDialogOpen} onClose={handleCloseDocumentsDialog} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AttachFileIcon color="primary" />
          Task Documents
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            {documentsTask && (
              <Alert severity="info" sx={{ mb: 3 }}>
                <strong>{documentsTask.client_name}</strong> - {documentsTask.work_type_name} ({documentsTask.period_label})
              </Alert>
            )}

            {/* Upload Section */}
            <Card variant="outlined" sx={{ mb: 3, p: 2 }}>
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <CloudUploadIcon color="primary" />
                Upload New Document
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  label="Description (optional)"
                  fullWidth
                  size="small"
                  value={documentDescription}
                  onChange={(e) => setDocumentDescription(e.target.value)}
                  placeholder="Add a description for this document..."
                />
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Button
                    variant="contained"
                    component="label"
                    startIcon={uploadingDocument ? <CircularProgress size={20} color="inherit" /> : <CloudUploadIcon />}
                    disabled={uploadingDocument}
                  >
                    {uploadingDocument ? 'Uploading...' : 'Choose File'}
                    <input
                      type="file"
                      hidden
                      onChange={handleFileUpload}
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.zip,.rar"
                    />
                  </Button>
                  <Typography variant="caption" color="text.secondary">
                    Supported: PDF, Word, Excel, Images, ZIP
                  </Typography>
                </Box>
              </Box>
            </Card>

            {/* Documents List */}
            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
              Uploaded Documents ({documents.length})
            </Typography>

            {documentsLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : documents.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <FileIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                <Typography color="text.secondary">
                  No documents uploaded yet
                </Typography>
              </Box>
            ) : (
              <List sx={{ bgcolor: 'background.paper', border: '1px solid #e0e0e0', borderRadius: 1 }}>
                {documents.map((doc, index) => (
                  <React.Fragment key={doc.id}>
                    {index > 0 && <Divider />}
                    <ListItem>
                      <ListItemIcon>
                        <FileIcon color="primary" />
                      </ListItemIcon>
                      <ListItemText
                        primary={doc.file_name}
                        secondary={
                          <Box component="span">
                            <Typography variant="caption" display="block">
                              {formatFileSize(doc.file_size)} • Uploaded by {doc.uploaded_by_name}
                            </Typography>
                            <Typography variant="caption" display="block">
                              {format(new Date(doc.uploaded_at), 'dd MMM yyyy, HH:mm')}
                            </Typography>
                            {doc.description && (
                              <Typography variant="caption" display="block" color="text.secondary">
                                {doc.description}
                              </Typography>
                            )}
                          </Box>
                        }
                      />
                      <ListItemSecondaryAction>
                        <IconButton
                          edge="end"
                          color="primary"
                          onClick={() => handleDownloadDocument(doc)}
                          title="Download"
                        >
                          <DownloadIcon />
                        </IconButton>
                        <IconButton
                          edge="end"
                          color="error"
                          onClick={() => handleDeleteDocument(doc.id)}
                          title="Delete"
                          sx={{ ml: 1 }}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                  </React.Fragment>
                ))}
              </List>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDocumentsDialog}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
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
