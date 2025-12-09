import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
import { getErrorMessage } from '../utils/errorUtils';

export default function Templates() {
  const location = useLocation();
  const navigate = useNavigate();
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

  // Check for createTemplate query parameter to auto-open dialog
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    if (searchParams.get('createTemplate') === 'true') {
      // Remove the query parameter from URL
      navigate('/dashboard/templates', { replace: true });
      // Open the create dialog
      handleOpenDialog();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

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
      showSnackbar(getErrorMessage(error, 'Failed to fetch templates'), 'error');
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
      showSnackbar(getErrorMessage(error, 'Failed to save template'), 'error');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this template?')) {
      try {
        await emailTemplatesAPI.delete(id);
        showSnackbar('Template deleted successfully', 'success');
        fetchTemplates();
      } catch (error) {
        showSnackbar(getErrorMessage(error, 'Failed to delete template'), 'error');
      }
    }
  };

  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  const columns = [
    { field: 'template_name', headerName: 'Template Name', flex: 1, minWidth: 200 },
    { field: 'work_type_name', headerName: 'Task Category', width: 180 },
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
    { field: 'work_type_name', headerName: 'Task Category', flex: 1, minWidth: 180 },
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
            <Tab icon={<NotificationsIcon />} label="Reminder Configuration" />
          </Tabs>
        </Card>

        {/* Alert for task categories needing templates */}
        {(() => {
          const categoriesNeedingTemplates = workTypes.filter(wt => {
            const hasClientTemplate = templates.some(t => t.work_type === wt.id && t.template_type === 'CLIENT');
            const hasEmployeeTemplate = templates.some(t => t.work_type === wt.id && t.template_type === 'EMPLOYEE');
            return (wt.enable_client_reminders && !hasClientTemplate) || (wt.enable_employee_reminders && !hasEmployeeTemplate);
          });

          if (categoriesNeedingTemplates.length > 0) {
            return (
              <Alert
                severity="warning"
                sx={{ mb: 3, borderRadius: 2 }}
                action={
                  <Button color="inherit" size="small" onClick={() => handleOpenDialog()}>
                    Create Template
                  </Button>
                }
              >
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {categoriesNeedingTemplates.length} Task {categoriesNeedingTemplates.length === 1 ? 'Category' : 'Categories'} need email templates:
                </Typography>
                <Typography variant="body2">
                  {categoriesNeedingTemplates.map(wt => wt.work_name).join(', ')}
                </Typography>
                <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>
                  Without email templates, reminders will use default system messages.
                </Typography>
              </Alert>
            );
          }
          return null;
        })()}

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
            {/* Show task categories with reminder configuration */}
            <Box sx={{ height: 600, width: '100%' }}>
              <DataGrid
                rows={Array.isArray(workTypes) ? workTypes.filter(wt => wt.enable_client_reminders || wt.enable_employee_reminders) : []}
                columns={[
                  { field: 'work_name', headerName: 'Task Category', flex: 1, minWidth: 180 },
                  {
                    field: 'enable_client_reminders',
                    headerName: 'Client Reminders',
                    width: 140,
                    renderCell: (params) => (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        {params.value ? (
                          <><PersonIcon fontSize="small" color="primary" /> Enabled</>
                        ) : (
                          <Box sx={{ color: 'text.disabled' }}>Disabled</Box>
                        )}
                      </Box>
                    ),
                  },
                  {
                    field: 'enable_employee_reminders',
                    headerName: 'Employee Reminders',
                    width: 160,
                    renderCell: (params) => (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        {params.value ? (
                          <><BusinessIcon fontSize="small" color="info" /> Enabled</>
                        ) : (
                          <Box sx={{ color: 'text.disabled' }}>Disabled</Box>
                        )}
                      </Box>
                    ),
                  },
                  {
                    field: 'client_reminder_frequency_type',
                    headerName: 'Client Frequency',
                    width: 140,
                    renderCell: (params) => params.row.enable_client_reminders ? params.value?.replace('_', ' ') : '-',
                  },
                  {
                    field: 'employee_reminder_frequency_type',
                    headerName: 'Employee Frequency',
                    width: 150,
                    renderCell: (params) => params.row.enable_employee_reminders ? params.value?.replace('_', ' ') : '-',
                  },
                  {
                    field: 'has_template',
                    headerName: 'Email Template',
                    width: 140,
                    renderCell: (params) => {
                      const hasClientTemplate = templates.some(t => t.work_type === params.row.id && t.template_type === 'CLIENT');
                      const hasEmployeeTemplate = templates.some(t => t.work_type === params.row.id && t.template_type === 'EMPLOYEE');
                      const needsClientTemplate = params.row.enable_client_reminders && !hasClientTemplate;
                      const needsEmployeeTemplate = params.row.enable_employee_reminders && !hasEmployeeTemplate;

                      if (needsClientTemplate || needsEmployeeTemplate) {
                        return (
                          <Box sx={{ color: 'warning.main', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <EmailIcon fontSize="small" />
                            Create Template
                          </Box>
                        );
                      }
                      return (
                        <Box sx={{ color: 'success.main', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <EmailIcon fontSize="small" />
                          Configured
                        </Box>
                      );
                    },
                  },
                ]}
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
            {workTypes.filter(wt => wt.enable_client_reminders || wt.enable_employee_reminders).length === 0 && (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <NotificationsIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h5" gutterBottom color="text.secondary">
                  No Task Categories with Reminders
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Reminder schedules are configured on each Task Category.
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Go to Task Categories → Edit → Reminder Configuration to enable client and employee reminders.
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
                <InputLabel>Task Category</InputLabel>
                <Select
                  value={formData.work_type}
                  label="Task Category"
                  onChange={(e) => {
                    const selectedId = e.target.value;
                    const selectedWt = workTypes.find(wt => wt.id === selectedId);
                    let newTemplateType = formData.template_type;

                    // Auto-select template type based on enabled reminders that still need templates
                    if (selectedWt) {
                      const hasClientTemplate = templates.some(t => t.work_type === selectedWt.id && t.template_type === 'CLIENT');
                      const hasEmployeeTemplate = templates.some(t => t.work_type === selectedWt.id && t.template_type === 'EMPLOYEE');
                      const needsClient = selectedWt.enable_client_reminders && !hasClientTemplate;
                      const needsEmployee = selectedWt.enable_employee_reminders && !hasEmployeeTemplate;

                      // If current selection is invalid for this work type, switch it
                      if (newTemplateType === 'CLIENT' && !needsClient && needsEmployee) {
                        newTemplateType = 'EMPLOYEE';
                      } else if (newTemplateType === 'EMPLOYEE' && !needsEmployee && needsClient) {
                        newTemplateType = 'CLIENT';
                      }
                      // If only one option is available, select it
                      else if (needsClient && !needsEmployee) {
                        newTemplateType = 'CLIENT';
                      } else if (needsEmployee && !needsClient) {
                        newTemplateType = 'EMPLOYEE';
                      }
                    }

                    setFormData({ ...formData, work_type: selectedId, template_type: newTemplateType });
                  }}
                >
                  {/* Only show task categories that have reminders enabled AND are missing at least one template */}
                  {Array.isArray(workTypes) && workTypes
                    .filter(wt => {
                      // Must have at least one reminder type enabled
                      if (!wt.enable_client_reminders && !wt.enable_employee_reminders) return false;
                      // Check if it still needs a template
                      const hasClientTemplate = templates.some(t => t.work_type === wt.id && t.template_type === 'CLIENT');
                      const hasEmployeeTemplate = templates.some(t => t.work_type === wt.id && t.template_type === 'EMPLOYEE');
                      const needsClientTemplate = wt.enable_client_reminders && !hasClientTemplate;
                      const needsEmployeeTemplate = wt.enable_employee_reminders && !hasEmployeeTemplate;
                      return needsClientTemplate || needsEmployeeTemplate;
                    })
                    .map((workType) => (
                      <MenuItem key={workType.id} value={workType.id}>
                        {workType.work_name} ({workType.statutory_form || 'N/A'})
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>

              <FormControl fullWidth required>
                <InputLabel>Template Type</InputLabel>
                {(() => {
                  const selectedWorkType = workTypes.find(wt => wt.id === formData.work_type);

                  // Check which templates are still needed (not just which reminders are enabled)
                  let showClient = false;
                  let showEmployee = false;

                  if (selectedWorkType) {
                    const hasClientTemplate = templates.some(t => t.work_type === selectedWorkType.id && t.template_type === 'CLIENT');
                    const hasEmployeeTemplate = templates.some(t => t.work_type === selectedWorkType.id && t.template_type === 'EMPLOYEE');
                    showClient = selectedWorkType.enable_client_reminders && !hasClientTemplate;
                    showEmployee = selectedWorkType.enable_employee_reminders && !hasEmployeeTemplate;
                  }

                  // Determine the correct value to display
                  let displayValue = formData.template_type;
                  if (selectedWorkType) {
                    // If current value is not available, switch to available option
                    if (displayValue === 'CLIENT' && !showClient && showEmployee) {
                      displayValue = 'EMPLOYEE';
                    } else if (displayValue === 'EMPLOYEE' && !showEmployee && showClient) {
                      displayValue = 'CLIENT';
                    }
                  }

                  return (
                    <Select
                      value={displayValue}
                      label="Template Type"
                      onChange={(e) => setFormData({ ...formData, template_type: e.target.value })}
                    >
                      {showClient && (
                        <MenuItem value="CLIENT">
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <PersonIcon fontSize="small" color="primary" />
                            Client Reminder
                          </Box>
                        </MenuItem>
                      )}
                      {showEmployee && (
                        <MenuItem value="EMPLOYEE">
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <BusinessIcon fontSize="small" color="info" />
                            Employee/Internal Reminder
                          </Box>
                        </MenuItem>
                      )}
                    </Select>
                  );
                })()}
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
                • <code>{'{{work_name}}'}</code> - Task category name<br />
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
