import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Alert,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  LinearProgress,
  Grid,
  Avatar,
  InputAdornment,
  Paper,
} from '@mui/material';
import {
  Business,
  Visibility,
  Block,
  PlayArrow,
  TrendingUp,
  Extension,
  Search,
  Refresh,
  People,
  Assignment,
  Delete,
  Warning,
} from '@mui/icons-material';
import { platformAdminAPI } from '../../services/api';

const planColors = {
  FREE: '#6B7280',
  STARTER: '#3B82F6',
  PROFESSIONAL: '#8B5CF6',
  ENTERPRISE: '#10B981',
};

const statusColors = {
  ACTIVE: 'success',
  TRIAL: 'warning',
  SUSPENDED: 'error',
  CANCELLED: 'default',
};

export default function Organizations() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [organizations, setOrganizations] = useState([]);
  const [filteredOrgs, setFilteredOrgs] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [actionDialog, setActionDialog] = useState({ open: false, type: '', org: null });
  const [extendDays, setExtendDays] = useState(14);
  const [selectedPlan, setSelectedPlan] = useState('STARTER');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    filterOrganizations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizations, searchTerm, statusFilter]);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await platformAdminAPI.getOrganizations();
      setOrganizations(response.data);
    } catch (err) {
      setError('Failed to load organizations');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filterOrganizations = () => {
    let filtered = [...organizations];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(org =>
        org.name.toLowerCase().includes(term) ||
        org.email.toLowerCase().includes(term)
      );
    }

    if (statusFilter !== 'ALL') {
      filtered = filtered.filter(org => org.status === statusFilter);
    }

    setFilteredOrgs(filtered);
  };

  const handleAction = async () => {
    setActionLoading(true);
    try {
      const { type, org } = actionDialog;

      switch (type) {
        case 'suspend':
          await platformAdminAPI.suspendOrg(org.id);
          break;
        case 'activate':
          await platformAdminAPI.activateOrg(org.id);
          break;
        case 'extend':
          await platformAdminAPI.extendTrial(org.id, extendDays);
          break;
        case 'upgrade':
          await platformAdminAPI.changePlan(org.id, selectedPlan);
          break;
        case 'delete':
          await platformAdminAPI.deleteOrg(org.id);
          break;
        default:
          break;
      }

      setActionDialog({ open: false, type: '', org: null });
      fetchData();
    } catch (err) {
      setError(`Action failed: ${err.response?.data?.error || err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const openActionDialog = (type, org) => {
    setActionDialog({ open: true, type, org });
    if (type === 'extend') setExtendDays(14);
    if (type === 'upgrade') setSelectedPlan('STARTER');
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Card
        sx={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          mb: 4,
          borderRadius: 3,
        }}
      >
        <CardContent sx={{ py: 3 }}>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Box display="flex" alignItems="center" gap={2}>
              <Avatar
                sx={{
                  width: 56,
                  height: 56,
                  bgcolor: 'rgba(255,255,255,0.2)',
                }}
              >
                <Business sx={{ fontSize: 28 }} />
              </Avatar>
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 600 }}>
                  Organizations
                </Typography>
                <Typography variant="body1" sx={{ opacity: 0.9, mt: 0.5 }}>
                  Manage all registered organizations
                </Typography>
              </Box>
            </Box>
            <Button
              variant="contained"
              startIcon={<Refresh />}
              onClick={fetchData}
              sx={{
                bgcolor: 'rgba(255,255,255,0.2)',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
              }}
            >
              Refresh
            </Button>
          </Box>
        </CardContent>
      </Card>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              placeholder="Search organizations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
              size="small"
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                label="Status"
              >
                <MenuItem value="ALL">All Status</MenuItem>
                <MenuItem value="ACTIVE">Active</MenuItem>
                <MenuItem value="TRIAL">Trial</MenuItem>
                <MenuItem value="SUSPENDED">Suspended</MenuItem>
                <MenuItem value="CANCELLED">Cancelled</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <Typography variant="body2" color="text.secondary">
              Showing {filteredOrgs.length} of {organizations.length} organizations
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      {/* Organizations Table */}
      <Card sx={{ borderRadius: 3, boxShadow: 3 }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: '#f8fafc' }}>
                <TableCell sx={{ fontWeight: 600 }}>Organization</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Plan</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                <TableCell align="center" sx={{ fontWeight: 600 }}>Users</TableCell>
                <TableCell align="center" sx={{ fontWeight: 600 }}>Clients</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Trial Status</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Created</TableCell>
                <TableCell align="center" sx={{ fontWeight: 600 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredOrgs.map((org) => (
                <TableRow key={org.id} hover>
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={2}>
                      <Avatar sx={{ bgcolor: planColors[org.plan] || '#667eea', width: 36, height: 36 }}>
                        {org.name.charAt(0).toUpperCase()}
                      </Avatar>
                      <Box>
                        <Typography variant="body2" fontWeight={600}>
                          {org.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {org.email}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={org.plan_name}
                      sx={{
                        backgroundColor: `${planColors[org.plan]}22`,
                        color: planColors[org.plan],
                        fontWeight: 600,
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={org.status}
                      color={statusColors[org.status]}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2">
                      {org.user_count} / {org.max_users === -1 ? '∞' : org.max_users}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2">
                      {org.client_count} / {org.max_clients === -1 ? '∞' : org.max_clients}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {org.status === 'TRIAL' ? (
                      <Box>
                        {org.is_trial_expired ? (
                          <Chip size="small" label="Expired" color="error" />
                        ) : (
                          <Typography variant="caption" color="warning.main" fontWeight={600}>
                            {org.days_remaining} days left
                          </Typography>
                        )}
                      </Box>
                    ) : (
                      <Typography variant="caption" color="text.secondary">
                        -
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption">
                      {new Date(org.created_at).toLocaleDateString()}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                      <Tooltip title="View Details">
                        <IconButton
                          size="small"
                          onClick={() => setSelectedOrg(org)}
                        >
                          <Visibility fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      {org.status === 'TRIAL' && (
                        <Tooltip title="Extend Trial">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => openActionDialog('extend', org)}
                          >
                            <Extension fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      {org.status === 'SUSPENDED' ? (
                        <Tooltip title="Activate">
                          <IconButton
                            size="small"
                            color="success"
                            onClick={() => openActionDialog('activate', org)}
                          >
                            <PlayArrow fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      ) : (
                        <Tooltip title="Suspend">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => openActionDialog('suspend', org)}
                          >
                            <Block fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      <Tooltip title="Change Plan">
                        <IconButton
                          size="small"
                          color="secondary"
                          onClick={() => openActionDialog('upgrade', org)}
                        >
                          <TrendingUp fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete Organization">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => openActionDialog('delete', org)}
                        >
                          <Delete fontSize="small" />
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

      {/* Action Dialog */}
      <Dialog
        open={actionDialog.open}
        onClose={() => setActionDialog({ open: false, type: '', org: null })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{
          background: actionDialog.type === 'delete'
            ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
            : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
        }}>
          {actionDialog.type === 'suspend' && 'Suspend Organization'}
          {actionDialog.type === 'activate' && 'Activate Organization'}
          {actionDialog.type === 'extend' && 'Extend Trial Period'}
          {actionDialog.type === 'upgrade' && 'Change Plan'}
          {actionDialog.type === 'delete' && 'Delete Organization'}
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          {actionLoading && <LinearProgress sx={{ mb: 2 }} />}

          <Typography variant="body2" sx={{ mb: 2 }}>
            Organization: <strong>{actionDialog.org?.name}</strong>
          </Typography>

          {actionDialog.type === 'suspend' && (
            <Alert severity="warning">
              This will suspend the organization and prevent users from accessing the platform.
            </Alert>
          )}

          {actionDialog.type === 'activate' && (
            <Alert severity="info">
              This will reactivate the organization and restore access for all users.
            </Alert>
          )}

          {actionDialog.type === 'extend' && (
            <Box sx={{ mt: 2 }}>
              <TextField
                fullWidth
                type="number"
                label="Extend by (days)"
                value={extendDays}
                onChange={(e) => setExtendDays(parseInt(e.target.value) || 0)}
                inputProps={{ min: 1, max: 365 }}
              />
            </Box>
          )}

          {actionDialog.type === 'upgrade' && (
            <Box sx={{ mt: 2 }}>
              <FormControl fullWidth>
                <InputLabel>New Plan</InputLabel>
                <Select
                  value={selectedPlan}
                  onChange={(e) => setSelectedPlan(e.target.value)}
                  label="New Plan"
                >
                  <MenuItem value="FREE">Free Trial</MenuItem>
                  <MenuItem value="STARTER">Starter</MenuItem>
                  <MenuItem value="PROFESSIONAL">Professional</MenuItem>
                  <MenuItem value="ENTERPRISE">Enterprise</MenuItem>
                </Select>
              </FormControl>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Current plan: {actionDialog.org?.plan_name}
              </Typography>
            </Box>
          )}

          {actionDialog.type === 'delete' && (
            <Box>
              <Alert severity="error" icon={<Warning />} sx={{ mb: 2 }}>
                <Typography variant="body2" fontWeight={600}>
                  This action cannot be undone!
                </Typography>
                <Typography variant="body2">
                  All users, clients, tasks, and data associated with this organization will be permanently deleted.
                </Typography>
              </Alert>
              <Paper sx={{ p: 2, bgcolor: '#fef2f2', borderRadius: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Organization to be deleted:
                </Typography>
                <Typography variant="h6" fontWeight={600} color="error.main">
                  {actionDialog.org?.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {actionDialog.org?.user_count} users, {actionDialog.org?.client_count} clients, {actionDialog.org?.task_count} tasks
                </Typography>
              </Paper>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={() => setActionDialog({ open: false, type: '', org: null })}
            disabled={actionLoading}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleAction}
            disabled={actionLoading}
            color={actionDialog.type === 'suspend' || actionDialog.type === 'delete' ? 'error' : 'primary'}
          >
            {actionLoading ? 'Processing...' : (actionDialog.type === 'delete' ? 'Delete Permanently' : 'Confirm')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Organization Details Dialog */}
      <Dialog
        open={!!selectedOrg}
        onClose={() => setSelectedOrg(null)}
        maxWidth="md"
        fullWidth
      >
        {selectedOrg && (
          <>
            <DialogTitle sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Business />
                {selectedOrg.name}
              </Box>
            </DialogTitle>
            <DialogContent sx={{ pt: 3 }}>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <Paper sx={{ p: 2, borderRadius: 2, bgcolor: '#f8fafc' }}>
                    <Typography variant="caption" color="text.secondary">
                      Email
                    </Typography>
                    <Typography variant="body1" fontWeight={600}>{selectedOrg.email}</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Paper sx={{ p: 2, borderRadius: 2, bgcolor: '#f8fafc' }}>
                    <Typography variant="caption" color="text.secondary">
                      Plan
                    </Typography>
                    <Box mt={0.5}>
                      <Chip
                        size="small"
                        label={selectedOrg.plan_name}
                        sx={{
                          backgroundColor: `${planColors[selectedOrg.plan]}22`,
                          color: planColors[selectedOrg.plan],
                          fontWeight: 600,
                        }}
                      />
                    </Box>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Paper sx={{ p: 2, borderRadius: 2, bgcolor: '#f8fafc' }}>
                    <Typography variant="caption" color="text.secondary">
                      Status
                    </Typography>
                    <Box mt={0.5}>
                      <Chip
                        size="small"
                        label={selectedOrg.status}
                        color={statusColors[selectedOrg.status]}
                      />
                    </Box>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Paper sx={{ p: 2, borderRadius: 2, bgcolor: '#f8fafc' }}>
                    <Typography variant="caption" color="text.secondary">
                      Created
                    </Typography>
                    <Typography variant="body1" fontWeight={600}>
                      {new Date(selectedOrg.created_at).toLocaleDateString()}
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Paper sx={{ p: 2, borderRadius: 2, textAlign: 'center', bgcolor: '#f0f9ff' }}>
                    <People color="primary" sx={{ fontSize: 32 }} />
                    <Typography variant="h5" fontWeight={700} color="primary.main">
                      {selectedOrg.user_count}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Users (Max: {selectedOrg.max_users === -1 ? '∞' : selectedOrg.max_users})
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Paper sx={{ p: 2, borderRadius: 2, textAlign: 'center', bgcolor: '#f0fdf4' }}>
                    <Business sx={{ fontSize: 32, color: '#10b981' }} />
                    <Typography variant="h5" fontWeight={700} sx={{ color: '#10b981' }}>
                      {selectedOrg.client_count}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Clients (Max: {selectedOrg.max_clients === -1 ? '∞' : selectedOrg.max_clients})
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Paper sx={{ p: 2, borderRadius: 2, textAlign: 'center', bgcolor: '#fef3c7' }}>
                    <Assignment sx={{ fontSize: 32, color: '#f59e0b' }} />
                    <Typography variant="h5" fontWeight={700} sx={{ color: '#f59e0b' }}>
                      {selectedOrg.task_count}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Total Tasks
                    </Typography>
                  </Paper>
                </Grid>
                {selectedOrg.status === 'TRIAL' && (
                  <Grid item xs={12}>
                    <Paper sx={{ p: 2, borderRadius: 2, bgcolor: selectedOrg.is_trial_expired ? '#fef2f2' : '#fffbeb' }}>
                      <Typography variant="caption" color="text.secondary">
                        Trial Ends
                      </Typography>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography variant="body1" fontWeight={600}>
                          {selectedOrg.trial_ends_at
                            ? new Date(selectedOrg.trial_ends_at).toLocaleDateString()
                            : '-'}
                        </Typography>
                        {selectedOrg.is_trial_expired && (
                          <Chip size="small" label="Expired" color="error" />
                        )}
                      </Box>
                    </Paper>
                  </Grid>
                )}
              </Grid>
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
              <Button onClick={() => setSelectedOrg(null)}>Close</Button>
              {selectedOrg.status === 'TRIAL' && (
                <Button
                  variant="outlined"
                  color="primary"
                  onClick={() => {
                    setSelectedOrg(null);
                    openActionDialog('extend', selectedOrg);
                  }}
                >
                  Extend Trial
                </Button>
              )}
              <Button
                variant="contained"
                onClick={() => {
                  setSelectedOrg(null);
                  openActionDialog('upgrade', selectedOrg);
                }}
              >
                Upgrade Plan
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
}
