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
  Alert,
  Snackbar,
  Card,
  CardContent,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Email as EmailIcon,
  Notifications as NotificationsIcon,
  Person as PersonIcon,
  Business as BusinessIcon,
} from '@mui/icons-material';
import { emailTemplatesAPI, workTypesAPI, reminderRulesAPI } from '../services/api';

export default function Templates() {
  const [activeTab, setActiveTab] = useState(0);
  const [templates, setTemplates] = useState([]);
  const [reminderRules, setReminderRules] = useState([]);
  const [workTypes, setWorkTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [formData, setFormData] = useState({
    template_name: '',
    template_type: 'CLIENT',
    subject_template: '',
    body_template: '',
    work_type: '',
    is_active: true,
  });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    fetchTemplates();
    fetchWorkTypes();
    fetchReminderRules();
  }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const response = await emailTemplatesAPI.getAll();
      const data = response.data;
      // Ensure templates is always an array
      setTemplates(Array.isArray(data) ? data : (data.results || []));
    } catch (error) {
      showSnackbar('Failed to fetch templates', 'error');
      setTemplates([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const fetchWorkTypes = async () => {
    try {
      const response = await workTypesAPI.getAll();
      const data = response.data;
      setWorkTypes(Array.isArray(data) ? data : (data.results || []));
    } catch (error) {
      console.error('Failed to fetch work types', error);
      setWorkTypes([]);
    }
  };

  const fetchReminderRules = async () => {
    try {
      const response = await reminderRulesAPI.getAll();
      const data = response.data;
      setReminderRules(Array.isArray(data) ? data : (data.results || []));
    } catch (error) {
      console.error('Failed to fetch reminder rules', error);
      setReminderRules([]);
    }
  };

  const handleOpenDialog = (template = null) => {
    if (template) {
      setEditingTemplate(template);
      setFormData(template);
    } else {
      setEditingTemplate(null);
      setFormData({
        template_name: '',
        template_type: 'CLIENT',
        subject_template: '',
        body_template: '',
        work_type: '',
        is_active: true,
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingTemplate(null);
  };

  const handleSubmit = async () => {
    try {
      if (editingTemplate) {
        await emailTemplatesAPI.update(editingTemplate.id, formData);
        showSnackbar('Template updated successfully', 'success');
      } else {
        await emailTemplatesAPI.create(formData);
        showSnackbar('Template created successfully', 'success');
      }
      handleCloseDialog();
      fetchTemplates();
    } catch (error) {
      showSnackbar(error.response?.data?.detail || 'Operation failed', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this template?')) {
      try {
        await emailTemplatesAPI.delete(id);
        showSnackbar('Template deleted successfully', 'success');
        fetchTemplates();
      } catch (error) {
        showSnackbar('Failed to delete template', 'error');
      }
    }
  };

  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  const columns = [
    { field: 'template_name', headerName: 'Template Name', flex: 1, minWidth: 200 },
    { field: 'work_type_name', headerName: 'Work Type', width: 180 },
    {
      field: 'template_type',
      headerName: 'Type',
      width: 150,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {params.value === 'CLIENT' ? (
            <><PersonIcon fontSize="small" color="primary" /> Client</>
          ) : (
            <><BusinessIcon fontSize="small" color="info" /> Employee</>
          )}
        </Box>
      ),
    },
    { field: 'subject_template', headerName: 'Email Subject', flex: 1, minWidth: 250 },
    {
      field: 'is_active',
      headerName: 'Status',
      width: 100,
      renderCell: (params) => (
        <Box sx={{ color: params.value ? 'success.main' : 'text.disabled' }}>
          {params.value ? 'Active' : 'Inactive'}
        </Box>
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

  const reminderRuleColumns = [
    { field: 'work_type_name', headerName: 'Work Type', flex: 1, minWidth: 180 },
    {
      field: 'reminder_type',
      headerName: 'Reminder Type',
      width: 160,
      renderCell: (params) => params.value?.replace('_', ' '),
    },
    {
      field: 'recipient_type',
      headerName: 'Recipient',
      width: 140,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {params.value === 'CLIENT' && <><PersonIcon fontSize="small" color="primary" /> Client</>}
          {params.value === 'EMPLOYEE' && <><BusinessIcon fontSize="small" color="info" /> Employee</>}
          {params.value === 'BOTH' && <><NotificationsIcon fontSize="small" color="success" /> Both</>}
        </Box>
      ),
    },
    {
      field: 'offset_days',
      headerName: 'Timing',
      width: 140,
      renderCell: (params) => {
        const days = params.value;
        if (days < 0) return `${Math.abs(days)} days before due`;
        if (days > 0) return `${days} days after due`;
        return 'On due date';
      },
    },
    { field: 'email_template_name', headerName: 'Email Template', width: 180 },
    {
      field: 'is_active',
      headerName: 'Status',
      width: 100,
      renderCell: (params) => (
        <Box sx={{ color: params.value ? 'success.main' : 'text.disabled' }}>
          {params.value ? 'Active' : 'Inactive'}
        </Box>
      ),
    },
  ];

  return (
    <Container maxWidth="xl">
      <Box sx={{ mb: 4 }}>
        <Card
          sx={{
            background: 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
            color: 'white',
            mb: 3,
          }}
        >
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <EmailIcon sx={{ fontSize: 40 }} />
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 600 }}>
                    Email Templates & Reminders
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.5 }}>
                    Manage email templates and automated reminder rules
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
                Add Template
              </Button>
            </Box>
          </CardContent>
        </Card>

        <Card sx={{ mb: 3, borderRadius: 3, boxShadow: 2 }}>
          <Tabs
            value={activeTab}
            onChange={(e, newValue) => setActiveTab(newValue)}
            sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
          >
            <Tab icon={<EmailIcon />} label="Email Templates" />
            <Tab icon={<NotificationsIcon />} label="Reminder Rules" />
          </Tabs>
        </Card>

        {activeTab === 0 && (
          <Card sx={{ borderRadius: 3, boxShadow: 3 }}>
            <Box sx={{ height: 600, width: '100%' }}>
              <DataGrid
                rows={Array.isArray(templates) ? templates : []}
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
        )}

        {activeTab === 1 && (
          <Card sx={{ borderRadius: 3, boxShadow: 3 }}>
            {reminderRules.length > 0 ? (
              <Box sx={{ height: 600, width: '100%' }}>
                <DataGrid
                  rows={Array.isArray(reminderRules) ? reminderRules : []}
                  columns={reminderRuleColumns}
                  pageSize={10}
                  rowsPerPageOptions={[10, 25, 50]}
                  disableSelectionOnClick
                  sx={{
                    border: 'none',
                    '& .MuiDataGrid-cell:focus': {
                      outline: 'none',
                    },
                  }}
                />
              </Box>
            ) : (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <NotificationsIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h5" gutterBottom color="text.secondary">
                  No Reminder Rules Created
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Reminder schedules are now configured directly on each Work Type.
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Go to Work Types → Edit → Reminder Configuration to set up client and employee reminders.
                </Typography>
              </Box>
            )}
          </Card>
        )}
      </Box>

      {/* Add/Edit Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingTemplate ? 'Edit Email Template' : 'Add New Email Template'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControl fullWidth required>
                <InputLabel>Work Type</InputLabel>
                <Select
                  value={formData.work_type}
                  label="Work Type"
                  onChange={(e) => setFormData({ ...formData, work_type: e.target.value })}
                >
                  {Array.isArray(workTypes) && workTypes.map((workType) => (
                    <MenuItem key={workType.id} value={workType.id}>
                      {workType.work_name} ({workType.statutory_form || 'N/A'})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth required>
                <InputLabel>Template Type</InputLabel>
                <Select
                  value={formData.template_type}
                  label="Template Type"
                  onChange={(e) => setFormData({ ...formData, template_type: e.target.value })}
                >
                  <MenuItem value="CLIENT">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <PersonIcon fontSize="small" color="primary" />
                      Client Reminder
                    </Box>
                  </MenuItem>
                  <MenuItem value="EMPLOYEE">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <BusinessIcon fontSize="small" color="info" />
                      Employee/Internal Reminder
                    </Box>
                  </MenuItem>
                </Select>
              </FormControl>
            </Box>

            <TextField
              label="Template Name"
              fullWidth
              required
              value={formData.template_name}
              onChange={(e) => setFormData({ ...formData, template_name: e.target.value })}
              placeholder="e.g., Monthly Reminder Template"
            />

            <TextField
              label="Email Subject"
              fullWidth
              required
              value={formData.subject_template}
              onChange={(e) => setFormData({ ...formData, subject_template: e.target.value })}
              placeholder="Use {{client_name}}, {{work_name}}, {{due_date}} as placeholders"
              helperText="Example: Reminder: {{work_name}} for {{client_name}} - Due {{due_date}}"
            />

            <TextField
              label="Email Body"
              multiline
              rows={10}
              fullWidth
              required
              value={formData.body_template}
              onChange={(e) => setFormData({ ...formData, body_template: e.target.value })}
              placeholder="Use placeholders like {{client_name}}, {{work_name}}, {{due_date}}, {{period_label}}, etc."
            />

            <FormControlLabel
              control={
                <Switch
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  color="primary"
                />
              }
              label="Active Template"
            />

            <Alert severity="info" sx={{ mt: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                Available Placeholders:
              </Typography>
              <Typography variant="body2" component="div">
                • <code>{'{{client_name}}'}</code> - Client name<br />
                • <code>{'{{work_name}}'}</code> - Work type name<br />
                • <code>{'{{due_date}}'}</code> - Task due date<br />
                • <code>{'{{period_label}}'}</code> - Period label (e.g., Jan 2025)<br />
                • <code>{'{{PAN}}'}</code> - Client PAN<br />
                • <code>{'{{GSTIN}}'}</code> - Client GSTIN<br />
                • <code>{'{{firm_name}}'}</code> - Your firm name<br />
                • <code>{'{{employee_name}}'}</code> - Assigned employee name (for employee templates)
              </Typography>
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={!formData.work_type || !formData.template_name || !formData.subject_template || !formData.body_template}
          >
            {editingTemplate ? 'Update' : 'Create'}
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
