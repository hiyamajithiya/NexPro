import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import {
  Box,
  Paper,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Chip,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Close as CloseIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { tasksAPI, clientsAPI, workTypesAPI } from '../services/api';

const locales = {
  'en-US': require('date-fns/locale/en-US'),
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

// Status color mapping
const statusColors = {
  'NOT_STARTED': '#9e9e9e',
  'STARTED': '#2196f3',
  'IN_PROGRESS': '#ff9800',
  'COMPLETED': '#4caf50',
  'OVERDUE': '#f44336',
};

export default function TaskCalendar() {
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: 'ALL',
    client: 'ALL',
    workType: 'ALL',
  });
  const [clients, setClients] = useState([]);
  const [workTypes, setWorkTypes] = useState([]);

  const loadFilterOptions = useCallback(async () => {
    try {
      const [clientsRes, workTypesRes] = await Promise.all([
        clientsAPI.getAll({ status: 'ACTIVE' }),
        workTypesAPI.getAll({ is_active: true }),
      ]);
      // Ensure all arrays are properly set
      const clientsData = clientsRes.data;
      const workTypesData = workTypesRes.data;

      setClients(Array.isArray(clientsData) ? clientsData : (clientsData.results || []));
      setWorkTypes(Array.isArray(workTypesData) ? workTypesData : (workTypesData.results || []));
    } catch (error) {
      console.error('Error loading filter options:', error);
      setClients([]);
      setWorkTypes([]);
    }
  }, []);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.status !== 'ALL') params.status = filters.status;
      if (filters.client !== 'ALL') params['client_work__client'] = filters.client;
      if (filters.workType !== 'ALL') params['client_work__work_type'] = filters.workType;

      const response = await tasksAPI.getAll(params);
      const tasks = response.data.results || response.data;

      const calendarEvents = tasks.map(task => ({
        id: task.id,
        title: `${task.client_name} - ${task.work_type_name}`,
        start: new Date(task.due_date),
        end: new Date(task.due_date),
        resource: task,
      }));

      setEvents(calendarEvents);
    } catch (error) {
      console.error('Error loading tasks:', error);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadFilterOptions();
  }, [loadFilterOptions]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const handleSelectEvent = (event) => {
    setSelectedEvent(event.resource);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedEvent(null);
  };

  const eventStyleGetter = (event) => {
    const task = event.resource;
    const backgroundColor = statusColors[task.status] || '#3174ad';
    return {
      style: {
        backgroundColor,
        borderRadius: '5px',
        opacity: 0.8,
        color: 'white',
        border: '0px',
        display: 'block',
      },
    };
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const getStatusChip = (status) => {
    const statusLabels = {
      'NOT_STARTED': 'Not Started',
      'STARTED': 'Started',
      'IN_PROGRESS': 'In Progress',
      'COMPLETED': 'Completed',
      'OVERDUE': 'Overdue',
    };

    const chipColors = {
      'NOT_STARTED': 'default',
      'STARTED': 'info',
      'IN_PROGRESS': 'warning',
      'COMPLETED': 'success',
      'OVERDUE': 'error',
    };

    return (
      <Chip
        label={statusLabels[status] || status}
        color={chipColors[status] || 'default'}
        size="small"
      />
    );
  };

  return (
    <Box>
      {/* Filters */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={3}>
            <FormControl fullWidth size="small">
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
            <FormControl fullWidth size="small">
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
            <FormControl fullWidth size="small">
              <InputLabel>Work Type</InputLabel>
              <Select
                value={filters.workType}
                label="Work Type"
                onChange={(e) => handleFilterChange('workType', e.target.value)}
              >
                <MenuItem value="ALL">All Work Types</MenuItem>
                {Array.isArray(workTypes) && workTypes.map(type => (
                  <MenuItem key={type.id} value={type.id}>
                    {type.work_name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={3}>
            <Tooltip title="Refresh">
              <IconButton onClick={loadTasks} color="primary">
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Grid>
        </Grid>
      </Paper>

      {/* Legend */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle2" gutterBottom>
          Status Legend:
        </Typography>
        <Box display="flex" gap={1} flexWrap="wrap">
          {Object.entries(statusColors).map(([status, color]) => (
            <Box key={status} display="flex" alignItems="center" gap={0.5}>
              <Box
                sx={{
                  width: 20,
                  height: 20,
                  backgroundColor: color,
                  borderRadius: 1,
                }}
              />
              <Typography variant="caption">
                {status.replace(/_/g, ' ')}
              </Typography>
            </Box>
          ))}
        </Box>
      </Paper>

      {/* Calendar */}
      <Paper sx={{ p: 2, height: 600 }}>
        {loading ? (
          <Typography>Loading calendar...</Typography>
        ) : (
          <Calendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            style={{ height: '100%' }}
            onSelectEvent={handleSelectEvent}
            eventPropGetter={eventStyleGetter}
            views={['month', 'week', 'day', 'agenda']}
            defaultView="month"
            popup
          />
        )}
      </Paper>

      {/* Task Detail Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        {selectedEvent && (
          <>
            <DialogTitle>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="h6">Task Details</Typography>
                <IconButton onClick={handleCloseDialog} size="small">
                  <CloseIcon />
                </IconButton>
              </Box>
            </DialogTitle>
            <DialogContent>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Client
                  </Typography>
                  <Typography variant="body1">{selectedEvent.client_name}</Typography>
                </Grid>

                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Work Type
                  </Typography>
                  <Typography variant="body1">
                    {selectedEvent.work_type_name}
                    {selectedEvent.statutory_form && ` (${selectedEvent.statutory_form})`}
                  </Typography>
                </Grid>

                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Period
                  </Typography>
                  <Typography variant="body1">{selectedEvent.period_label}</Typography>
                </Grid>

                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Due Date
                  </Typography>
                  <Typography variant="body1">
                    {format(new Date(selectedEvent.due_date), 'dd-MMM-yyyy')}
                  </Typography>
                </Grid>

                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Status
                  </Typography>
                  {getStatusChip(selectedEvent.status)}
                </Grid>

                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Assigned To
                  </Typography>
                  <Typography variant="body1">
                    {selectedEvent.assigned_to_name || 'Unassigned'}
                  </Typography>
                </Grid>

                {selectedEvent.started_on && (
                  <Grid item xs={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Started On
                    </Typography>
                    <Typography variant="body1">
                      {format(new Date(selectedEvent.started_on), 'dd-MMM-yyyy')}
                    </Typography>
                  </Grid>
                )}

                {selectedEvent.completed_on && (
                  <Grid item xs={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Completed On
                    </Typography>
                    <Typography variant="body1">
                      {format(new Date(selectedEvent.completed_on), 'dd-MMM-yyyy')}
                    </Typography>
                  </Grid>
                )}

                {selectedEvent.remarks && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Remarks
                    </Typography>
                    <Typography variant="body1">{selectedEvent.remarks}</Typography>
                  </Grid>
                )}
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseDialog}>Close</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
}
