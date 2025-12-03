import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Alert,
  Snackbar,
  CircularProgress,
  InputAdornment,
  Tooltip,
  Autocomplete,
  Paper,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Lock as LockIcon,
  ContentCopy as CopyIcon,
  OpenInNew as OpenInNewIcon,
  Security as SecurityIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { credentialsAPI, clientsAPI } from '../services/api';

const PORTAL_TYPES = [
  { value: 'GST', label: 'GST Portal' },
  { value: 'INCOME_TAX', label: 'Income Tax Portal' },
  { value: 'TDS', label: 'TDS Portal' },
  { value: 'MCA', label: 'MCA Portal' },
  { value: 'BANK', label: 'Bank Portal' },
  { value: 'OTHERS', label: 'Others' },
];

const getPortalColor = (type) => {
  const colors = {
    GST: '#10b981',
    INCOME_TAX: '#3b82f6',
    TDS: '#8b5cf6',
    MCA: '#f59e0b',
    BANK: '#ef4444',
    OTHERS: '#6b7280',
  };
  return colors[type] || '#6b7280';
};

export default function CredentialVault() {
  const [loading, setLoading] = useState(true);
  const [credentials, setCredentials] = useState([]);
  const [clients, setClients] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingCredential, setEditingCredential] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [revealedPasswords, setRevealedPasswords] = useState({});
  const [revealingId, setRevealingId] = useState(null);
  const [formData, setFormData] = useState({
    client: '',
    portal_type: 'GST',
    portal_name: '',
    login_url: '',
    username: '',
    password: '',
    extra_info: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [credentialsRes, clientsRes] = await Promise.all([
        credentialsAPI.getAll(),
        clientsAPI.getAll({ status: 'ACTIVE' }),
      ]);
      const credData = credentialsRes.data;
      const clientData = clientsRes.data;
      setCredentials(Array.isArray(credData) ? credData : (credData.results || []));
      setClients(Array.isArray(clientData) ? clientData : (clientData.results || []));
    } catch (error) {
      showSnackbar('Failed to fetch data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  const handleOpenDialog = (credential = null) => {
    if (credential) {
      setEditingCredential(credential);
      setFormData({
        client: credential.client,
        portal_type: credential.portal_type,
        portal_name: credential.portal_name || '',
        login_url: credential.login_url || '',
        username: credential.username,
        password: '', // Don't populate password for security
        extra_info: credential.extra_info || '',
      });
    } else {
      setEditingCredential(null);
      setFormData({
        client: '',
        portal_type: 'GST',
        portal_name: '',
        login_url: '',
        username: '',
        password: '',
        extra_info: '',
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingCredential(null);
  };

  const handleSubmit = async () => {
    if (!formData.client || !formData.username) {
      showSnackbar('Please fill in required fields', 'warning');
      return;
    }

    try {
      if (editingCredential) {
        await credentialsAPI.update(editingCredential.id, formData);
        showSnackbar('Credential updated successfully', 'success');
      } else {
        await credentialsAPI.create(formData);
        showSnackbar('Credential added successfully', 'success');
      }
      handleCloseDialog();
      fetchData();
    } catch (error) {
      showSnackbar(error.response?.data?.detail || 'Operation failed', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this credential?')) {
      try {
        await credentialsAPI.delete(id);
        showSnackbar('Credential deleted successfully', 'success');
        fetchData();
      } catch (error) {
        showSnackbar('Failed to delete credential', 'error');
      }
    }
  };

  const handleRevealPassword = async (id) => {
    if (revealedPasswords[id]) {
      // Hide password
      setRevealedPasswords(prev => {
        const updated = { ...prev };
        delete updated[id];
        return updated;
      });
      return;
    }

    setRevealingId(id);
    try {
      const response = await credentialsAPI.reveal(id);
      setRevealedPasswords(prev => ({
        ...prev,
        [id]: response.data.password,
      }));
      // Auto-hide after 30 seconds
      setTimeout(() => {
        setRevealedPasswords(prev => {
          const updated = { ...prev };
          delete updated[id];
          return updated;
        });
      }, 30000);
    } catch (error) {
      showSnackbar('Failed to reveal password', 'error');
    } finally {
      setRevealingId(null);
    }
  };

  const handleCopyPassword = async (id) => {
    if (revealedPasswords[id]) {
      await navigator.clipboard.writeText(revealedPasswords[id]);
      showSnackbar('Password copied to clipboard', 'success');
    } else {
      showSnackbar('Please reveal the password first', 'warning');
    }
  };

  const handleCopyUsername = async (username) => {
    await navigator.clipboard.writeText(username);
    showSnackbar('Username copied to clipboard', 'success');
  };

  return (
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
                <SecurityIcon sx={{ fontSize: 40 }} />
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 600 }}>
                    Credential Vault
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.5 }}>
                    Securely store and manage client portal credentials (encrypted)
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={fetchData}
                  sx={{
                    color: 'white',
                    borderColor: 'white',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.1)', borderColor: 'white' },
                  }}
                >
                  Refresh
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
                  Add Credential
                </Button>
              </Box>
            </Box>
          </CardContent>
        </Card>

        {loading ? (
          <Box display="flex" justifyContent="center" p={4}>
            <CircularProgress />
          </Box>
        ) : credentials.length === 0 ? (
          <Card sx={{ textAlign: 'center', py: 8, borderRadius: 3 }}>
            <LockIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h5" gutterBottom color="text.secondary">
              No Credentials Stored
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              Add client portal credentials to securely store them here.
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog()}
            >
              Add First Credential
            </Button>
          </Card>
        ) : (
          <Card sx={{ borderRadius: 3, boxShadow: 3 }}>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: '#f8fafc' }}>
                    <TableCell sx={{ fontWeight: 600 }}>Client</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Portal Type</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Username</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Password</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Portal URL</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Last Updated</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 600 }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {credentials.map((cred) => (
                    <TableRow key={cred.id} hover>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" fontWeight={600}>
                            {cred.client_name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {cred.client_code}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={cred.portal_type_display || cred.portal_type}
                          size="small"
                          sx={{
                            bgcolor: `${getPortalColor(cred.portal_type)}22`,
                            color: getPortalColor(cred.portal_type),
                            fontWeight: 600,
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2">{cred.username}</Typography>
                          <Tooltip title="Copy username">
                            <IconButton
                              size="small"
                              onClick={() => handleCopyUsername(cred.username)}
                            >
                              <CopyIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography
                            variant="body2"
                            sx={{ fontFamily: 'monospace', minWidth: 100 }}
                          >
                            {revealedPasswords[cred.id] || '••••••••'}
                          </Typography>
                          <Tooltip title={revealedPasswords[cred.id] ? 'Hide password' : 'Reveal password'}>
                            <IconButton
                              size="small"
                              onClick={() => handleRevealPassword(cred.id)}
                              disabled={revealingId === cred.id}
                            >
                              {revealingId === cred.id ? (
                                <CircularProgress size={16} />
                              ) : revealedPasswords[cred.id] ? (
                                <VisibilityOffIcon fontSize="small" />
                              ) : (
                                <VisibilityIcon fontSize="small" />
                              )}
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Copy password">
                            <IconButton
                              size="small"
                              onClick={() => handleCopyPassword(cred.id)}
                              disabled={!revealedPasswords[cred.id]}
                            >
                              <CopyIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                      <TableCell>
                        {cred.login_url ? (
                          <Tooltip title="Open portal">
                            <Button
                              size="small"
                              endIcon={<OpenInNewIcon fontSize="small" />}
                              onClick={() => window.open(cred.login_url, '_blank')}
                            >
                              Open Portal
                            </Button>
                          </Tooltip>
                        ) : (
                          <Typography variant="caption" color="text.secondary">
                            Not set
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(cred.last_updated).toLocaleDateString()}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                          <Tooltip title="Edit">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => handleOpenDialog(cred)}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDelete(cred.id)}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        )}
      </Box>

      {/* Add/Edit Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingCredential ? 'Edit Credential' : 'Add New Credential'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <Autocomplete
              options={clients}
              getOptionLabel={(option) =>
                option.client_name
                  ? `${option.client_name} (${option.client_code})`
                  : ''
              }
              value={clients.find(c => c.id === formData.client) || null}
              onChange={(e, newValue) => {
                setFormData({ ...formData, client: newValue?.id || '' });
              }}
              renderInput={(params) => (
                <TextField {...params} label="Client *" placeholder="Select client" />
              )}
              disabled={!!editingCredential}
            />

            <FormControl fullWidth>
              <InputLabel>Portal Type *</InputLabel>
              <Select
                value={formData.portal_type}
                label="Portal Type *"
                onChange={(e) => setFormData({ ...formData, portal_type: e.target.value })}
              >
                {PORTAL_TYPES.map((type) => (
                  <MenuItem key={type.value} value={type.value}>
                    {type.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Portal Name (Optional)"
              value={formData.portal_name}
              onChange={(e) => setFormData({ ...formData, portal_name: e.target.value })}
              placeholder="e.g., HDFC Bank, SBI, etc."
            />

            <TextField
              label="Login URL"
              value={formData.login_url}
              onChange={(e) => setFormData({ ...formData, login_url: e.target.value })}
              placeholder="https://..."
            />

            <TextField
              label="Username *"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              required
            />

            <TextField
              label={editingCredential ? 'New Password (leave empty to keep existing)' : 'Password *'}
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required={!editingCredential}
              helperText={editingCredential ? 'Only enter if you want to change the password' : ''}
            />

            <TextField
              label="Additional Info"
              value={formData.extra_info}
              onChange={(e) => setFormData({ ...formData, extra_info: e.target.value })}
              multiline
              rows={3}
              placeholder="Security questions, notes, etc."
            />

            <Alert severity="info">
              Passwords are encrypted using organization-specific encryption keys. Access is logged for audit purposes.
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={!formData.client || !formData.username || (!editingCredential && !formData.password)}
          >
            {editingCredential ? 'Update' : 'Save'}
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
