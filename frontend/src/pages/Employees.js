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
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  FormControlLabel,
  Switch,
  Checkbox,
  Tabs,
  Tab,
  Paper,
  List,
  ListItem,
  CircularProgress,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  People as PeopleIcon,
  Assignment as AssignmentIcon,
  Badge as BadgeIcon,
} from '@mui/icons-material';
import { usersAPI, workTypesAPI, workTypeAssignmentsAPI } from '../services/api';
import { getErrorMessage } from '../utils/errorUtils';

const getRoleChip = (role) => {
  const roleConfig = {
    'ADMIN': { label: 'Admin', color: 'error' },
    'PARTNER': { label: 'Partner', color: 'primary' },
    'MANAGER': { label: 'Manager', color: 'warning' },
    'STAFF': { label: 'Staff', color: 'info' },
  };

  const config = roleConfig[role] || { label: role, color: 'default' };
  return <Chip label={config.label} color={config.color} size="small" />;
};

const getStatusChip = (isActive) => {
  return (
    <Chip
      label={isActive ? 'Active' : 'Inactive'}
      color={isActive ? 'success' : 'default'}
      size="small"
    />
  );
};

export default function Employees() {
  const [employees, setEmployees] = useState([]);
  const [workTypes, setWorkTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogTab, setDialogTab] = useState(0);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [formData, setFormData] = useState({
    email: '',
    first_name: '',
    last_name: '',
    mobile: '',
    role: 'STAFF',
    password: '',
    is_active: true,
    // Employee details
    pan: '',
    aadhar: '',
    salary: '',
    joining_date: '',
  });
  const [selectedWorkTypes, setSelectedWorkTypes] = useState([]);
  const [assignmentLoading, setAssignmentLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    fetchEmployees();
    fetchWorkTypes();
  }, []);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const response = await usersAPI.getAll();
      const data = response.data;
      setEmployees(Array.isArray(data) ? data : (data.results || []));
    } catch (error) {
      showSnackbar(getErrorMessage(error, 'Failed to fetch employees'), 'error');
      setEmployees([]);
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
    }
  };

  const handleOpenDialog = (employee = null) => {
    if (employee) {
      setEditingEmployee(employee);
      setFormData({
        email: employee.email,
        first_name: employee.first_name || '',
        last_name: employee.last_name || '',
        mobile: employee.mobile || '',
        role: employee.role,
        password: '',
        is_active: employee.is_active,
        pan: employee.pan || '',
        aadhar: employee.aadhar || '',
        salary: employee.salary || '',
        joining_date: employee.joining_date || '',
      });
      // Set selected work types from employee's assignments
      const assignedIds = (employee.assigned_work_types || []).map(a => a.work_type_id);
      setSelectedWorkTypes(assignedIds);
    } else {
      setEditingEmployee(null);
      setFormData({
        email: '',
        first_name: '',
        last_name: '',
        mobile: '',
        role: 'STAFF',
        password: '',
        is_active: true,
        pan: '',
        aadhar: '',
        salary: '',
        joining_date: '',
      });
      setSelectedWorkTypes([]);
    }
    setDialogTab(0);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingEmployee(null);
    setDialogTab(0);
  };

  const handleWorkTypeToggle = (workTypeId) => {
    setSelectedWorkTypes(prev =>
      prev.includes(workTypeId)
        ? prev.filter(id => id !== workTypeId)
        : [...prev, workTypeId]
    );
  };

  const handleSubmit = async () => {
    try {
      const submitData = { ...formData };

      // Remove password field if empty during edit
      if (editingEmployee && !submitData.password) {
        delete submitData.password;
      }

      // Convert empty strings to null for optional fields
      // This prevents validation errors for date and number fields
      if (!submitData.joining_date) submitData.joining_date = null;
      if (!submitData.salary) submitData.salary = null;
      if (!submitData.pan) submitData.pan = null;
      if (!submitData.aadhar) submitData.aadhar = null;

      // Validate required fields (email is used as username)
      if (!submitData.email) {
        showSnackbar('Email is required', 'error');
        return;
      }

      if (!editingEmployee && !submitData.password) {
        showSnackbar('Password is required for new employees', 'error');
        return;
      }

      let employeeId;
      if (editingEmployee) {
        await usersAPI.update(editingEmployee.id, submitData);
        employeeId = editingEmployee.id;
        showSnackbar('Employee updated successfully', 'success');
      } else {
        const response = await usersAPI.create(submitData);
        employeeId = response.data.id;
        showSnackbar('Employee created successfully', 'success');
      }

      // Save work type assignments
      if (employeeId) {
        setAssignmentLoading(true);
        try {
          await workTypeAssignmentsAPI.bulkAssign(employeeId, selectedWorkTypes);
        } catch (error) {
          console.error('Failed to save work type assignments', error);
        } finally {
          setAssignmentLoading(false);
        }
      }

      handleCloseDialog();
      fetchEmployees();
    } catch (error) {
      showSnackbar(getErrorMessage(error, 'Failed to save employee'), 'error');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this employee?')) {
      try {
        await usersAPI.delete(id);
        showSnackbar('Employee deleted successfully', 'success');
        fetchEmployees();
      } catch (error) {
        showSnackbar(getErrorMessage(error, 'Failed to delete employee'), 'error');
      }
    }
  };

  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  const columns = [
    { field: 'email', headerName: 'Email (Login ID)', flex: 1, minWidth: 200 },
    {
      field: 'full_name',
      headerName: 'Full Name',
      flex: 1,
      minWidth: 150,
      valueGetter: (params) => `${params.row.first_name || ''} ${params.row.last_name || ''}`.trim() || '-',
    },
    { field: 'mobile', headerName: 'Mobile', width: 120 },
    { field: 'pan', headerName: 'PAN', width: 110 },
    {
      field: 'joining_date',
      headerName: 'Joining Date',
      width: 110,
      valueFormatter: (params) => params.value ? new Date(params.value).toLocaleDateString('en-IN') : '-',
    },
    {
      field: 'role',
      headerName: 'Role',
      width: 100,
      renderCell: (params) => getRoleChip(params.value),
    },
    {
      field: 'assigned_work_types',
      headerName: 'Task Categories',
      width: 140,
      renderCell: (params) => {
        const assignments = params.value || [];
        if (assignments.length === 0) {
          return <Chip label="None" color="default" size="small" />;
        }
        return (
          <Chip
            icon={<AssignmentIcon sx={{ fontSize: 16 }} />}
            label={`${assignments.length}`}
            color="primary"
            size="small"
            title={assignments.map(a => a.work_type_name).join(', ')}
          />
        );
      },
    },
    {
      field: 'is_active',
      headerName: 'Status',
      width: 90,
      renderCell: (params) => getStatusChip(params.value),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 100,
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

  const roles = [
    { value: 'ADMIN', label: 'Admin' },
    { value: 'PARTNER', label: 'Partner' },
    { value: 'MANAGER', label: 'Manager' },
    { value: 'STAFF', label: 'Staff' },
  ];

  return (
    <Container maxWidth="xl">
      <Box sx={{ mb: 4 }}>
        <Card
          sx={{
            background: 'linear-gradient(135deg, #FFA726 0%, #FB8C00 100%)',
            color: 'white',
            mb: 3,
          }}
        >
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <PeopleIcon sx={{ fontSize: 40 }} />
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 600 }}>
                    Employee Management
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.5 }}>
                    Manage employees and assign task categories
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
                Add Employee
              </Button>
            </Box>
          </CardContent>
        </Card>

        <Card sx={{ borderRadius: 3, boxShadow: 3 }}>
          <Box sx={{ height: 600, width: '100%' }}>
            <DataGrid
              rows={employees}
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
            <PeopleIcon color="primary" />
            {editingEmployee ? 'Edit Employee' : 'Add New Employee'}
          </Box>
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          <Paper sx={{ borderRadius: 0 }}>
            <Tabs
              value={dialogTab}
              onChange={(e, v) => setDialogTab(v)}
              sx={{
                borderBottom: 1,
                borderColor: 'divider',
                bgcolor: '#f8fafc',
                '& .MuiTab-root': { textTransform: 'none', fontWeight: 600 },
              }}
            >
              <Tab icon={<PeopleIcon />} iconPosition="start" label="Basic Info" />
              <Tab icon={<BadgeIcon />} iconPosition="start" label="Employee Details" />
              <Tab icon={<AssignmentIcon />} iconPosition="start" label="Task Categories" />
            </Tabs>

            <Box sx={{ p: 3 }}>
              {dialogTab === 0 && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <TextField
                    label="Email (Login ID)"
                    type="email"
                    fullWidth
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    helperText="This email will be used as the login ID"
                  />

                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                    <TextField
                      label="First Name"
                      fullWidth
                      value={formData.first_name}
                      onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    />
                    <TextField
                      label="Last Name"
                      fullWidth
                      value={formData.last_name}
                      onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    />
                  </Box>

                  <TextField
                    label="Mobile"
                    fullWidth
                    value={formData.mobile}
                    onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                  />

                  <FormControl fullWidth required>
                    <InputLabel>Role</InputLabel>
                    <Select
                      value={formData.role}
                      label="Role"
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    >
                      {roles.map((role) => (
                        <MenuItem key={role.value} value={role.value}>
                          {role.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <TextField
                    label={editingEmployee ? 'Password (leave blank to keep current)' : 'Password'}
                    type="password"
                    fullWidth
                    required={!editingEmployee}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  />

                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.is_active}
                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      />
                    }
                    label="Active"
                  />
                </Box>
              )}

              {dialogTab === 1 && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Alert severity="info" sx={{ mb: 1 }}>
                    Employee identification and salary details (optional fields)
                  </Alert>

                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                    <TextField
                      label="PAN Number"
                      fullWidth
                      value={formData.pan}
                      onChange={(e) => setFormData({ ...formData, pan: e.target.value.toUpperCase() })}
                      inputProps={{ maxLength: 10 }}
                      placeholder="ABCDE1234F"
                    />
                    <TextField
                      label="Aadhar Number"
                      fullWidth
                      value={formData.aadhar}
                      onChange={(e) => setFormData({ ...formData, aadhar: e.target.value.replace(/\D/g, '') })}
                      inputProps={{ maxLength: 12 }}
                      placeholder="123456789012"
                    />
                  </Box>

                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                    <TextField
                      label="Monthly Salary"
                      type="number"
                      fullWidth
                      value={formData.salary}
                      onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                      InputProps={{
                        startAdornment: <Typography sx={{ mr: 1, color: 'text.secondary' }}>₹</Typography>,
                      }}
                    />
                    <TextField
                      label="Joining Date"
                      type="date"
                      fullWidth
                      value={formData.joining_date}
                      onChange={(e) => setFormData({ ...formData, joining_date: e.target.value })}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Box>
                </Box>
              )}

              {dialogTab === 2 && (
                <Box>
                  <Alert severity="info" sx={{ mb: 3 }}>
                    Assign task categories to this employee. All new tasks for assigned categories will be automatically assigned to this employee.
                  </Alert>

                  {workTypes.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                      <Typography color="text.secondary">No task categories available</Typography>
                    </Box>
                  ) : (
                    <Paper variant="outlined" sx={{ maxHeight: 400, overflow: 'auto' }}>
                      <List dense>
                        {workTypes.map((wt) => (
                          <ListItem key={wt.id} divider>
                            <FormControlLabel
                              control={
                                <Checkbox
                                  checked={selectedWorkTypes.includes(wt.id)}
                                  onChange={() => handleWorkTypeToggle(wt.id)}
                                />
                              }
                              label={
                                <Box>
                                  <Typography variant="body1" fontWeight={500}>
                                    {wt.work_name}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {wt.statutory_form || 'No form'} - {wt.default_frequency}
                                  </Typography>
                                </Box>
                              }
                              sx={{ flex: 1 }}
                            />
                          </ListItem>
                        ))}
                      </List>
                    </Paper>
                  )}

                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      {selectedWorkTypes.length} task category(s) selected
                    </Typography>
                  </Box>
                </Box>
              )}
            </Box>
          </Paper>
        </DialogContent>
        <DialogActions sx={{ p: 2, bgcolor: '#f8fafc', borderTop: '1px solid #e2e8f0', justifyContent: 'space-between' }}>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {/* Show Back button on tabs 1 and 2 */}
            {dialogTab > 0 && (
              <Button
                onClick={() => setDialogTab(dialogTab - 1)}
                variant="outlined"
              >
                Back
              </Button>
            )}
            {/* Show Next button on tabs 0 and 1 */}
            {dialogTab < 2 && (
              <Button
                onClick={() => setDialogTab(dialogTab + 1)}
                variant="contained"
                disabled={dialogTab === 0 && !formData.email}
              >
                Next
              </Button>
            )}
            {/* Show Create/Update button only on tab 2 (last tab) */}
            {dialogTab === 2 && (
              <Button
                onClick={handleSubmit}
                variant="contained"
                color="success"
                disabled={!formData.email || assignmentLoading}
              >
                {assignmentLoading ? <CircularProgress size={20} /> : (editingEmployee ? 'Update' : 'Create')}
              </Button>
            )}
          </Box>
        </DialogActions>
      </Dialog>

      {/* Snackbar - positioned at top right */}
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
