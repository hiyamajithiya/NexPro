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
  Paper,
  Tabs,
  Tab,
} from '@mui/material';
import {
  AccessTime,
  Extension,
  TrendingUp,
  Warning,
  CheckCircle,
  Refresh,
  Business,
  People,
} from '@mui/icons-material';
import { platformAdminAPI } from '../../services/api';

export default function TrialManagement() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [organizations, setOrganizations] = useState([]);
  const [expiringTrials, setExpiringTrials] = useState([]);
  const [tabValue, setTabValue] = useState(0);
  const [actionDialog, setActionDialog] = useState({ open: false, type: '', org: null });
  const [extendDays, setExtendDays] = useState(14);
  const [selectedPlan, setSelectedPlan] = useState('STARTER');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [orgsRes, trialsRes] = await Promise.all([
        platformAdminAPI.getOrganizations(),
        platformAdminAPI.getExpiringTrials(),
      ]);
      // Filter only trial organizations
      const trialOrgs = orgsRes.data.filter(org => org.status === 'TRIAL');
      setOrganizations(trialOrgs);
      setExpiringTrials(trialsRes.data);
    } catch (err) {
      setError('Failed to load trial data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async () => {
    setActionLoading(true);
    try {
      const { type, org } = actionDialog;

      switch (type) {
        case 'extend':
          await platformAdminAPI.extendTrial(org.id, extendDays);
          break;
        case 'upgrade':
          await platformAdminAPI.upgradePlan(org.id, selectedPlan);
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

  const getDisplayData = () => {
    if (tabValue === 0) return organizations;
    if (tabValue === 1) return expiringTrials;
    if (tabValue === 2) return organizations.filter(org => org.is_trial_expired);
    return organizations;
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  const activeTrials = organizations.filter(org => !org.is_trial_expired).length;
  const expiredTrials = organizations.filter(org => org.is_trial_expired).length;

  return (
    <Box>
      {/* Header */}
      <Card
        sx={{
          background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
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
                <AccessTime sx={{ fontSize: 28 }} />
              </Avatar>
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 600 }}>
                  Trial Management
                </Typography>
                <Typography variant="body1" sx={{ opacity: 0.9, mt: 0.5 }}>
                  Manage trial periods and conversions
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

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 3, boxShadow: 2 }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Total Trials
                  </Typography>
                  <Typography variant="h4" fontWeight={700}>
                    {organizations.length}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#f0f9ff', width: 48, height: 48 }}>
                  <AccessTime sx={{ color: '#3b82f6' }} />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 3, boxShadow: 2 }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Active Trials
                  </Typography>
                  <Typography variant="h4" fontWeight={700} color="success.main">
                    {activeTrials}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#f0fdf4', width: 48, height: 48 }}>
                  <CheckCircle sx={{ color: '#10b981' }} />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 3, boxShadow: 2 }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Expiring Soon
                  </Typography>
                  <Typography variant="h4" fontWeight={700} color="warning.main">
                    {expiringTrials.length}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#fffbeb', width: 48, height: 48 }}>
                  <Warning sx={{ color: '#f59e0b' }} />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 3, boxShadow: 2 }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Expired
                  </Typography>
                  <Typography variant="h4" fontWeight={700} color="error.main">
                    {expiredTrials}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#fef2f2', width: 48, height: 48 }}>
                  <Warning sx={{ color: '#ef4444' }} />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Paper sx={{ mb: 3, borderRadius: 2 }}>
        <Tabs
          value={tabValue}
          onChange={(e, v) => setTabValue(v)}
          sx={{
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 600,
            },
          }}
        >
          <Tab label={`All Trials (${organizations.length})`} />
          <Tab label={`Expiring Soon (${expiringTrials.length})`} />
          <Tab label={`Expired (${expiredTrials})`} />
        </Tabs>
      </Paper>

      {/* Trials Table */}
      <Card sx={{ borderRadius: 3, boxShadow: 3 }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: '#f8fafc' }}>
                <TableCell sx={{ fontWeight: 600 }}>Organization</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Trial Status</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Days Remaining</TableCell>
                <TableCell align="center" sx={{ fontWeight: 600 }}>Users</TableCell>
                <TableCell align="center" sx={{ fontWeight: 600 }}>Clients</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Trial Ends</TableCell>
                <TableCell align="center" sx={{ fontWeight: 600 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {getDisplayData().length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <CheckCircle sx={{ fontSize: 48, color: 'success.main', mb: 1 }} />
                    <Typography variant="body1" color="text.secondary">
                      No trials in this category
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                getDisplayData().map((org) => (
                  <TableRow key={org.id} hover>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={2}>
                        <Avatar sx={{ bgcolor: '#667eea', width: 36, height: 36 }}>
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
                        label={org.is_trial_expired || org.is_expired ? 'Expired' : 'Active'}
                        color={org.is_trial_expired || org.is_expired ? 'error' : 'success'}
                      />
                    </TableCell>
                    <TableCell>
                      {org.is_trial_expired || org.is_expired ? (
                        <Typography variant="body2" color="error.main" fontWeight={600}>
                          Expired
                        </Typography>
                      ) : (
                        <Box>
                          <Typography variant="body2" fontWeight={600} color={org.days_remaining <= 7 ? 'warning.main' : 'text.primary'}>
                            {org.days_remaining} days
                          </Typography>
                          <LinearProgress
                            variant="determinate"
                            value={Math.max(0, Math.min(100, (org.days_remaining / 30) * 100))}
                            sx={{
                              height: 4,
                              borderRadius: 2,
                              mt: 0.5,
                              bgcolor: 'grey.200',
                              '& .MuiLinearProgress-bar': {
                                borderRadius: 2,
                                bgcolor: org.days_remaining <= 7 ? 'warning.main' : 'success.main',
                              }
                            }}
                          />
                        </Box>
                      )}
                    </TableCell>
                    <TableCell align="center">
                      <Box display="flex" alignItems="center" justifyContent="center" gap={0.5}>
                        <People sx={{ fontSize: 16, color: 'text.secondary' }} />
                        <Typography variant="body2">{org.user_count || 0}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <Box display="flex" alignItems="center" justifyContent="center" gap={0.5}>
                        <Business sx={{ fontSize: 16, color: 'text.secondary' }} />
                        <Typography variant="body2">{org.client_count || 0}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption">
                        {org.trial_ends_at ? new Date(org.trial_ends_at).toLocaleDateString() : '-'}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                        <Tooltip title="Extend Trial">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => openActionDialog('extend', org)}
                          >
                            <Extension fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Convert to Paid">
                          <IconButton
                            size="small"
                            color="success"
                            onClick={() => openActionDialog('upgrade', org)}
                          >
                            <TrendingUp fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
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
          background: actionDialog.type === 'extend'
            ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
            : 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
          color: 'white',
        }}>
          {actionDialog.type === 'extend' && 'Extend Trial Period'}
          {actionDialog.type === 'upgrade' && 'Convert to Paid Plan'}
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          {actionLoading && <LinearProgress sx={{ mb: 2 }} />}

          <Paper sx={{ p: 2, mb: 3, borderRadius: 2, bgcolor: '#f8fafc' }}>
            <Typography variant="body2" color="text.secondary">
              Organization
            </Typography>
            <Typography variant="h6" fontWeight={600}>{actionDialog.org?.name}</Typography>
            <Typography variant="caption" color="text.secondary">{actionDialog.org?.email}</Typography>
          </Paper>

          {actionDialog.type === 'extend' && (
            <Box>
              <Alert severity="info" sx={{ mb: 2 }}>
                Current trial ends: {actionDialog.org?.trial_ends_at
                  ? new Date(actionDialog.org.trial_ends_at).toLocaleDateString()
                  : 'Unknown'}
              </Alert>
              <TextField
                fullWidth
                type="number"
                label="Extend by (days)"
                value={extendDays}
                onChange={(e) => setExtendDays(parseInt(e.target.value) || 0)}
                inputProps={{ min: 1, max: 365 }}
                helperText="The trial period will be extended from the current end date"
              />
            </Box>
          )}

          {actionDialog.type === 'upgrade' && (
            <Box>
              <Alert severity="success" sx={{ mb: 2 }}>
                Converting to a paid plan will give the organization full access to all features.
              </Alert>
              <FormControl fullWidth>
                <InputLabel>Select Plan</InputLabel>
                <Select
                  value={selectedPlan}
                  onChange={(e) => setSelectedPlan(e.target.value)}
                  label="Select Plan"
                >
                  <MenuItem value="STARTER">
                    <Box>
                      <Typography>Starter</Typography>
                      <Typography variant="caption" color="text.secondary">Up to 3 users, 50 clients</Typography>
                    </Box>
                  </MenuItem>
                  <MenuItem value="PROFESSIONAL">
                    <Box>
                      <Typography>Professional</Typography>
                      <Typography variant="caption" color="text.secondary">Up to 10 users, 200 clients</Typography>
                    </Box>
                  </MenuItem>
                  <MenuItem value="ENTERPRISE">
                    <Box>
                      <Typography>Enterprise</Typography>
                      <Typography variant="caption" color="text.secondary">Unlimited users & clients</Typography>
                    </Box>
                  </MenuItem>
                </Select>
              </FormControl>
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
            color={actionDialog.type === 'upgrade' ? 'success' : 'primary'}
          >
            {actionLoading ? 'Processing...' : actionDialog.type === 'extend' ? 'Extend Trial' : 'Convert to Paid'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
