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
  Autocomplete,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Business as BusinessIcon,
  Upload as UploadIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format } from 'date-fns';
import { clientsAPI, workTypesAPI } from '../services/api';
import { WorkOutline as WorkIcon } from '@mui/icons-material';

export default function Clients() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [formData, setFormData] = useState({
    client_name: '',
    client_code: '',
    PAN: '',
    GSTIN: '',
    email: '',
    mobile: '',
    category: 'INDIVIDUAL',
    group: '',
    date_of_birth: null,
    date_of_incorporation: null,
    address: '',
  });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [groupOptions, setGroupOptions] = useState([]);

  // Work Type Assignment Dialog
  const [openWorkTypeDialog, setOpenWorkTypeDialog] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [workTypes, setWorkTypes] = useState([]);
  const [selectedWorkTypes, setSelectedWorkTypes] = useState([]);
  const [startFromPeriod, setStartFromPeriod] = useState('');

  // Bulk Upload State
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  useEffect(() => {
    fetchClients();
    fetchWorkTypes();
  }, []);

  useEffect(() => {
    // Extract unique groups from existing clients
    if (Array.isArray(clients)) {
      const uniqueGroups = [...new Set(clients.filter(c => c.group).map(c => c.group))];
      setGroupOptions(uniqueGroups);
    }
  }, [clients]);

  const fetchClients = async () => {
    setLoading(true);
    try {
      const response = await clientsAPI.getAll();
      const data = response.data;
      // Ensure clients is always an array
      setClients(Array.isArray(data) ? data : (data.results || []));
    } catch (error) {
      showSnackbar('Failed to fetch clients', 'error');
      setClients([]); // Set empty array on error
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

  const generateClientCode = (name, category, dob, doi) => {
    if (!name) return '';

    // Get initials from name
    // For "Himansu Chinubhai Majithiya" -> "HC"
    // For "Chinmay Technosoft Private Limited" -> "CT"
    const words = name.trim().split(/\s+/);
    let initials = '';

    if (words.length === 1) {
      // Single word: take first 2 letters
      initials = words[0].slice(0, 2).toUpperCase();
    } else {
      // Multiple words: take first letter of first two meaningful words
      // Skip common words like "Private", "Limited", "Pvt", "Ltd"
      const skipWords = ['PRIVATE', 'LIMITED', 'PVT', 'LTD', 'PUBLIC', 'COMPANY', 'CO'];
      const meaningfulWords = words.filter(w => !skipWords.includes(w.toUpperCase()));

      if (meaningfulWords.length >= 2) {
        initials = meaningfulWords[0][0].toUpperCase() + meaningfulWords[1][0].toUpperCase();
      } else if (meaningfulWords.length === 1) {
        initials = meaningfulWords[0].slice(0, 2).toUpperCase();
      } else {
        // Fallback to first two words
        initials = (words[0][0] + words[1][0]).toUpperCase();
      }
    }

    // Get day and month from appropriate date
    let dateSuffix = '';
    if (category === 'INDIVIDUAL' || category === 'HUF') {
      // Use Date of Birth
      if (dob) {
        const date = new Date(dob);
        const dd = String(date.getDate()).padStart(2, '0');
        dateSuffix = dd;
      }
    } else {
      // Use Date of Incorporation for Firm/Company/Trust/Others
      if (doi) {
        const date = new Date(doi);
        const dd = String(date.getDate()).padStart(2, '0');
        dateSuffix = dd;
      }
    }

    // If no date provided, use current day
    if (!dateSuffix) {
      const date = new Date();
      const dd = String(date.getDate()).padStart(2, '0');
      dateSuffix = dd;
    }

    return `${initials}${dateSuffix}`;
  };

  // Helper function to parse date strings to Date objects
  const parseDate = (dateValue) => {
    if (!dateValue) return null;
    if (dateValue instanceof Date) return dateValue;
    const parsed = new Date(dateValue);
    return isNaN(parsed.getTime()) ? null : parsed;
  };

  const handleOpenDialog = (client = null) => {
    if (client) {
      setEditingClient(client);
      setFormData({
        ...client,
        date_of_birth: parseDate(client.date_of_birth),
        date_of_incorporation: parseDate(client.date_of_incorporation),
      });
    } else {
      setEditingClient(null);
      setFormData({
        client_name: '',
        client_code: '',
        PAN: '',
        GSTIN: '',
        email: '',
        mobile: '',
        category: 'INDIVIDUAL',
        group: '',
        date_of_birth: null,
        date_of_incorporation: null,
        address: '',
      });
    }
    setOpenDialog(true);
  };

  const handleClientNameChange = (name) => {
    setFormData(prev => ({
      ...prev,
      client_name: name,
      // Auto-generate client code
      client_code: !editingClient ? generateClientCode(name, prev.category, prev.date_of_birth, prev.date_of_incorporation) : prev.client_code
    }));
  };

  const handleCategoryChange = (category) => {
    setFormData(prev => ({
      ...prev,
      category,
      // Regenerate client code with new category
      client_code: !editingClient && prev.client_name ? generateClientCode(prev.client_name, category, prev.date_of_birth, prev.date_of_incorporation) : prev.client_code
    }));
  };

  const handleDateChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
      // Regenerate client code when date changes
      client_code: !editingClient && prev.client_name ? generateClientCode(
        prev.client_name,
        prev.category,
        field === 'date_of_birth' ? value : prev.date_of_birth,
        field === 'date_of_incorporation' ? value : prev.date_of_incorporation
      ) : prev.client_code
    }));
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingClient(null);
  };

  const handleSubmit = async () => {
    try {
      // Format dates to YYYY-MM-DD for backend
      const dataToSubmit = { ...formData };
      if (dataToSubmit.date_of_birth) {
        dataToSubmit.date_of_birth = format(new Date(dataToSubmit.date_of_birth), 'yyyy-MM-dd');
      }
      if (dataToSubmit.date_of_incorporation) {
        dataToSubmit.date_of_incorporation = format(new Date(dataToSubmit.date_of_incorporation), 'yyyy-MM-dd');
      }

      if (editingClient) {
        await clientsAPI.update(editingClient.id, dataToSubmit);
        showSnackbar('Client updated successfully', 'success');
      } else {
        await clientsAPI.create(dataToSubmit);
        showSnackbar('Client created successfully', 'success');
      }
      handleCloseDialog();
      fetchClients();
    } catch (error) {
      showSnackbar(error.response?.data?.detail || 'Operation failed', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this client?')) {
      try {
        await clientsAPI.delete(id);
        showSnackbar('Client deleted successfully', 'success');
        fetchClients();
      } catch (error) {
        showSnackbar('Failed to delete client', 'error');
      }
    }
  };

  const handleOpenWorkTypeDialog = (client) => {
    setSelectedClient(client);
    setSelectedWorkTypes([]);
    setStartFromPeriod('');
    setOpenWorkTypeDialog(true);
  };

  const handleCloseWorkTypeDialog = () => {
    setOpenWorkTypeDialog(false);
    setSelectedClient(null);
    setSelectedWorkTypes([]);
    setStartFromPeriod('');
  };

  const handleAssignWorkTypes = async () => {
    if (!selectedClient) return;

    if (selectedWorkTypes.length === 0) {
      showSnackbar('Please select at least one work type', 'warning');
      return;
    }

    if (!startFromPeriod) {
      showSnackbar('Please enter start period', 'warning');
      return;
    }

    try {
      const response = await clientsAPI.assignWorkTypes(selectedClient.id, {
        work_type_ids: selectedWorkTypes,
        start_from_period: startFromPeriod,
      });

      showSnackbar(
        response.data.message ||
          `Successfully assigned ${response.data.created_count} work type(s)`,
        'success'
      );

      if (response.data.errors && response.data.errors.length > 0) {
        setTimeout(() => {
          showSnackbar(
            `Some errors occurred: ${response.data.errors.join(', ')}`,
            'warning'
          );
        }, 2000);
      }

      handleCloseWorkTypeDialog();
    } catch (error) {
      showSnackbar(
        error.response?.data?.error || 'Failed to assign work types',
        'error'
      );
    }
  };

  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  // Bulk Upload Handlers
  const handleDownloadTemplate = async () => {
    try {
      const response = await clientsAPI.downloadTemplate();
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'clients_upload_template.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      showSnackbar('Template downloaded successfully', 'success');
    } catch (error) {
      showSnackbar('Failed to download template', 'error');
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
        showSnackbar('Please select an Excel file (.xlsx or .xls)', 'error');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleBulkUpload = async () => {
    if (!selectedFile) {
      showSnackbar('Please select a file first', 'warning');
      return;
    }

    setUploadingFile(true);
    try {
      const response = await clientsAPI.bulkUpload(selectedFile);
      const data = response.data;

      if (data.created_count > 0) {
        showSnackbar(
          `Successfully uploaded ${data.created_count} client(s)${data.error_count > 0 ? ` with ${data.error_count} error(s)` : ''}`,
          data.error_count > 0 ? 'warning' : 'success'
        );
        fetchClients();
      } else {
        showSnackbar(data.message || 'No clients were uploaded', 'error');
      }

      if (data.errors && data.errors.length > 0) {
        console.error('Upload errors:', data.errors);
      }

      setUploadDialogOpen(false);
      setSelectedFile(null);
    } catch (error) {
      showSnackbar(
        error.response?.data?.error || 'Failed to upload clients',
        'error'
      );
    } finally {
      setUploadingFile(false);
    }
  };

  const columns = [
    { field: 'client_code', headerName: 'Code', width: 100 },
    { field: 'client_name', headerName: 'Client Name', flex: 1, minWidth: 200 },
    { field: 'category', headerName: 'Category', width: 120 },
    { field: 'group', headerName: 'Group', width: 150 },
    { field: 'PAN', headerName: 'PAN', width: 130 },
    { field: 'GSTIN', headerName: 'GSTIN', width: 180 },
    { field: 'email', headerName: 'Email', flex: 1, minWidth: 200 },
    { field: 'mobile', headerName: 'Mobile', width: 140 },
    {
      field: 'status',
      headerName: 'Status',
      width: 100,
      renderCell: (params) => (
        <Chip
          label={params.value}
          color={params.value === 'ACTIVE' ? 'success' : 'default'}
          size="small"
        />
      ),
    },
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
            title="Edit Client"
          >
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            color="secondary"
            onClick={() => handleOpenWorkTypeDialog(params.row)}
            title="Assign Work Types"
          >
            <WorkIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            color="error"
            onClick={() => handleDelete(params.row.id)}
            title="Delete Client"
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>
      ),
    },
  ];

  // Show/hide date fields based on category
  const showDOB = formData.category === 'INDIVIDUAL' || formData.category === 'HUF';
  const showDOI = formData.category === 'FIRM' || formData.category === 'COMPANY' || formData.category === 'TRUST' || formData.category === 'OTHERS';

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
                  <BusinessIcon sx={{ fontSize: 40 }} />
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 600 }}>
                      Clients Management
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.5 }}>
                      Manage your firm clients and their information
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Button
                    variant="outlined"
                    startIcon={<DownloadIcon />}
                    onClick={handleDownloadTemplate}
                    sx={{
                      bgcolor: 'white',
                      color: 'primary.main',
                      borderColor: 'white',
                      '&:hover': { bgcolor: 'rgba(255,255,255,0.9)', borderColor: 'white' },
                    }}
                  >
                    Download Template
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<UploadIcon />}
                    onClick={() => setUploadDialogOpen(true)}
                    sx={{
                      bgcolor: 'white',
                      color: 'primary.main',
                      borderColor: 'white',
                      '&:hover': { bgcolor: 'rgba(255,255,255,0.9)', borderColor: 'white' },
                    }}
                  >
                    Bulk Upload
                  </Button>
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
                    Add Client
                  </Button>
                </Box>
              </Box>
            </CardContent>
          </Card>

          <Card sx={{ borderRadius: 3, boxShadow: 3 }}>
            <Box sx={{ height: 600, width: '100%' }}>
              <DataGrid
                rows={Array.isArray(clients) ? clients : []}
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
          <DialogTitle>
            {editingClient ? 'Edit Client' : 'Add New Client'}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
              <TextField
                label="Client Name"
                fullWidth
                required
                value={formData.client_name}
                onChange={(e) => handleClientNameChange(e.target.value)}
                helperText="Client code will be auto-generated from name initials and date"
              />

              <FormControl fullWidth required>
                <InputLabel>Category</InputLabel>
                <Select
                  value={formData.category}
                  label="Category"
                  onChange={(e) => handleCategoryChange(e.target.value)}
                >
                  <MenuItem value="INDIVIDUAL">Individual</MenuItem>
                  <MenuItem value="FIRM">Firm</MenuItem>
                  <MenuItem value="COMPANY">Company</MenuItem>
                  <MenuItem value="TRUST">Trust</MenuItem>
                  <MenuItem value="HUF">HUF</MenuItem>
                  <MenuItem value="OTHERS">Others</MenuItem>
                </Select>
              </FormControl>

              <Autocomplete
                freeSolo
                options={groupOptions}
                value={formData.group || ''}
                onChange={(event, newValue) => {
                  setFormData({ ...formData, group: newValue || '' });
                }}
                onInputChange={(event, newInputValue) => {
                  setFormData({ ...formData, group: newInputValue });
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Group"
                    helperText="Select existing group or create new one"
                  />
                )}
              />

              {/* Show Date of Birth for Individual/HUF */}
              {showDOB && (
                <DatePicker
                  label="Date of Birth"
                  value={formData.date_of_birth}
                  onChange={(value) => handleDateChange('date_of_birth', value)}
                  renderInput={(params) => <TextField {...params} fullWidth />}
                />
              )}

              {/* Show Date of Incorporation for Firm/Company/Trust/Others */}
              {showDOI && (
                <DatePicker
                  label="Date of Incorporation"
                  value={formData.date_of_incorporation}
                  onChange={(value) => handleDateChange('date_of_incorporation', value)}
                  renderInput={(params) => <TextField {...params} fullWidth />}
                />
              )}

              <TextField
                label="Client Code"
                fullWidth
                required
                value={formData.client_code}
                onChange={(e) => setFormData({ ...formData, client_code: e.target.value })}
                helperText="Format: [Initials][Day] (e.g., HC09, CT01)"
              />

              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <TextField
                  label="PAN"
                  value={formData.PAN || ''}
                  onChange={(e) => setFormData({ ...formData, PAN: e.target.value.toUpperCase() })}
                  inputProps={{ maxLength: 10 }}
                />
                <TextField
                  label="GSTIN"
                  value={formData.GSTIN || ''}
                  onChange={(e) => setFormData({ ...formData, GSTIN: e.target.value.toUpperCase() })}
                  inputProps={{ maxLength: 15 }}
                />
              </Box>

              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <TextField
                  label="Email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
                <TextField
                  label="Mobile"
                  value={formData.mobile || ''}
                  onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                  inputProps={{ maxLength: 15 }}
                />
              </Box>

              <TextField
                label="Address"
                multiline
                rows={3}
                value={formData.address || ''}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button
              onClick={handleSubmit}
              variant="contained"
              disabled={!formData.client_name || !formData.client_code}
            >
              {editingClient ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Assign Work Types Dialog */}
        <Dialog open={openWorkTypeDialog} onClose={handleCloseWorkTypeDialog} maxWidth="md" fullWidth>
          <DialogTitle>
            Assign Work Types to {selectedClient?.client_name}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
              <Alert severity="info">
                Select work types to assign to this client. Tasks will be automatically created for each selected work type.
              </Alert>

              <Autocomplete
                multiple
                options={workTypes}
                getOptionLabel={(option) => `${option.work_name} (${option.statutory_form || 'N/A'})`}
                value={workTypes.filter(wt => selectedWorkTypes.includes(wt.id))}
                onChange={(event, newValue) => {
                  setSelectedWorkTypes(newValue.map(wt => wt.id));
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Select Work Types"
                    placeholder="Choose work types"
                    required
                  />
                )}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip
                      label={option.work_name}
                      {...getTagProps({ index })}
                      color="primary"
                      size="small"
                    />
                  ))
                }
              />

              <TextField
                label="Start From Period"
                fullWidth
                required
                value={startFromPeriod}
                onChange={(e) => setStartFromPeriod(e.target.value)}
                placeholder="e.g., Apr 2025, FY 2025-26, Q1 2025-26"
                helperText="Enter the period from which tasks should be generated"
              />

              {selectedWorkTypes.length > 0 && (
                <Alert severity="success">
                  {selectedWorkTypes.length} work type(s) selected. Initial tasks will be created automatically.
                </Alert>
              )}
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseWorkTypeDialog}>Cancel</Button>
            <Button
              onClick={handleAssignWorkTypes}
              variant="contained"
              disabled={selectedWorkTypes.length === 0 || !startFromPeriod}
            >
              Assign Work Types
            </Button>
          </DialogActions>
        </Dialog>

        {/* Bulk Upload Dialog */}
        <Dialog
          open={uploadDialogOpen}
          onClose={() => !uploadingFile && setUploadDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Bulk Upload Clients</DialogTitle>
          <DialogContent>
            <Box sx={{ mt: 2 }}>
              <Alert severity="info" sx={{ mb: 3 }}>
                Download the template, fill in client details, and upload the completed file.
              </Alert>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Button
                  variant="outlined"
                  startIcon={<DownloadIcon />}
                  onClick={handleDownloadTemplate}
                  fullWidth
                >
                  Download Excel Template
                </Button>

                <Box>
                  <input
                    accept=".xlsx,.xls"
                    style={{ display: 'none' }}
                    id="bulk-upload-file"
                    type="file"
                    onChange={handleFileSelect}
                  />
                  <label htmlFor="bulk-upload-file">
                    <Button
                      variant="outlined"
                      component="span"
                      fullWidth
                      startIcon={<UploadIcon />}
                    >
                      {selectedFile ? selectedFile.name : 'Select Excel File'}
                    </Button>
                  </label>
                </Box>

                {selectedFile && (
                  <Alert severity="success">
                    File selected: {selectedFile.name}
                  </Alert>
                )}
              </Box>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setUploadDialogOpen(false)} disabled={uploadingFile}>
              Cancel
            </Button>
            <Button
              onClick={handleBulkUpload}
              variant="contained"
              disabled={!selectedFile || uploadingFile}
            >
              {uploadingFile ? 'Uploading...' : 'Upload Clients'}
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
