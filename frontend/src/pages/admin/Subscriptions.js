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
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  LinearProgress,
  Grid,
  Avatar,
  Paper,
} from '@mui/material';
import {
  TrendingUp,
  Refresh,
  Business,
  CheckCircle,
  ArrowUpward,
} from '@mui/icons-material';
import { platformAdminAPI } from '../../services/api';

const planColors = {
  FREE: '#6B7280',
  STARTER: '#3B82F6',
  PROFESSIONAL: '#8B5CF6',
  ENTERPRISE: '#10B981',
};

const planDetails = {
  FREE: { name: 'Free', users: 1, clients: 10 },
  STARTER: { name: 'Starter', users: 3, clients: 50 },
  PROFESSIONAL: { name: 'Professional', users: 10, clients: 200 },
  ENTERPRISE: { name: 'Enterprise', users: -1, clients: -1 },
};

export default function Subscriptions() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [organizations, setOrganizations] = useState([]);
  const [stats, setStats] = useState(null);
  const [upgradeDialog, setUpgradeDialog] = useState({ open: false, org: null });
  const [selectedPlan, setSelectedPlan] = useState('STARTER');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [orgsRes, statsRes] = await Promise.all([
        platformAdminAPI.getOrganizations(),
        platformAdminAPI.getStats(),
      ]);
      // Filter only active (non-trial) organizations
      const paidOrgs = orgsRes.data.filter(org => org.status === 'ACTIVE');
      setOrganizations(paidOrgs);
      setStats(statsRes.data);
    } catch (err) {
      setError('Failed to load subscription data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async () => {
    setActionLoading(true);
    try {
      await platformAdminAPI.upgradePlan(upgradeDialog.org.id, selectedPlan);
      setUpgradeDialog({ open: false, org: null });
      fetchData();
    } catch (err) {
      setError(`Upgrade failed: ${err.response?.data?.error || err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  const planDistribution = stats?.plan_distribution || {};

  return (
    <Box>
      {/* Header */}
      <Card
        sx={{
          background: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
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
                <TrendingUp sx={{ fontSize: 28 }} />
              </Avatar>
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 600 }}>
                  Subscriptions
                </Typography>
                <Typography variant="body1" sx={{ opacity: 0.9, mt: 0.5 }}>
                  Manage plans and subscriptions
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

      {/* Plan Distribution Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {Object.entries(planDistribution).map(([plan, count]) => (
          <Grid item xs={12} sm={6} md={3} key={plan}>
            <Card sx={{ borderRadius: 3, boxShadow: 2, overflow: 'visible' }}>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      {planDetails[plan]?.name || plan}
                    </Typography>
                    <Typography variant="h4" fontWeight={700} sx={{ color: planColors[plan] }}>
                      {count}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {planDetails[plan]?.users === -1 ? 'Unlimited' : `Up to ${planDetails[plan]?.users}`} users
                    </Typography>
                  </Box>
                  <Avatar
                    sx={{
                      bgcolor: `${planColors[plan]}22`,
                      width: 48,
                      height: 48,
                    }}
                  >
                    <Business sx={{ color: planColors[plan] }} />
                  </Avatar>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Revenue Summary */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, borderRadius: 3, boxShadow: 2, height: '100%' }}>
            <Box display="flex" alignItems="center" gap={2} mb={2}>
              <TrendingUp color="primary" />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Subscription Overview
              </Typography>
            </Box>
            <Box>
              <Box display="flex" justifyContent="space-between" alignItems="center" py={1.5} borderBottom="1px solid #eee">
                <Typography variant="body2">Total Organizations</Typography>
                <Typography variant="body2" fontWeight={600}>{stats?.organizations?.total || 0}</Typography>
              </Box>
              <Box display="flex" justifyContent="space-between" alignItems="center" py={1.5} borderBottom="1px solid #eee">
                <Typography variant="body2">Active Subscriptions</Typography>
                <Typography variant="body2" fontWeight={600} color="success.main">{stats?.organizations?.active || 0}</Typography>
              </Box>
              <Box display="flex" justifyContent="space-between" alignItems="center" py={1.5} borderBottom="1px solid #eee">
                <Typography variant="body2">Trial Organizations</Typography>
                <Typography variant="body2" fontWeight={600} color="warning.main">{stats?.organizations?.trial || 0}</Typography>
              </Box>
              <Box display="flex" justifyContent="space-between" alignItems="center" py={1.5}>
                <Typography variant="body2">Conversion Rate</Typography>
                <Typography variant="body2" fontWeight={600}>
                  {stats?.organizations?.total > 0
                    ? Math.round((stats?.organizations?.active / stats?.organizations?.total) * 100)
                    : 0}%
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, borderRadius: 3, boxShadow: 2, height: '100%' }}>
            <Box display="flex" alignItems="center" gap={2} mb={2}>
              <CheckCircle color="success" />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Plan Breakdown
              </Typography>
            </Box>
            <Box>
              {Object.entries(planDistribution).map(([plan, count]) => (
                <Box key={plan} sx={{ mb: 2 }}>
                  <Box display="flex" justifyContent="space-between" mb={0.5}>
                    <Typography variant="body2">{planDetails[plan]?.name || plan}</Typography>
                    <Typography variant="body2" fontWeight={600}>{count}</Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={stats?.organizations?.total > 0 ? (count / stats.organizations.total) * 100 : 0}
                    sx={{
                      height: 8,
                      borderRadius: 4,
                      bgcolor: 'grey.200',
                      '& .MuiLinearProgress-bar': {
                        borderRadius: 4,
                        bgcolor: planColors[plan],
                      }
                    }}
                  />
                </Box>
              ))}
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Active Subscriptions Table */}
      <Card sx={{ borderRadius: 3, boxShadow: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
            Active Paid Subscriptions
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: '#f8fafc' }}>
                  <TableCell sx={{ fontWeight: 600 }}>Organization</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Current Plan</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 600 }}>Users</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 600 }}>Clients</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Since</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 600 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {organizations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                      <Business sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                      <Typography variant="body1" color="text.secondary">
                        No active paid subscriptions
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  organizations.map((org) => (
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
                        <Chip
                          size="small"
                          label="Active"
                          color="success"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption">
                          {new Date(org.created_at).toLocaleDateString()}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="Upgrade Plan">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => {
                              setUpgradeDialog({ open: true, org });
                              setSelectedPlan(org.plan === 'STARTER' ? 'PROFESSIONAL' : 'ENTERPRISE');
                            }}
                          >
                            <ArrowUpward fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Upgrade Dialog */}
      <Dialog
        open={upgradeDialog.open}
        onClose={() => setUpgradeDialog({ open: false, org: null })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
        }}>
          Upgrade Subscription Plan
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          {actionLoading && <LinearProgress sx={{ mb: 2 }} />}

          <Paper sx={{ p: 2, mb: 3, borderRadius: 2, bgcolor: '#f8fafc' }}>
            <Typography variant="body2" color="text.secondary">
              Organization
            </Typography>
            <Typography variant="h6" fontWeight={600}>{upgradeDialog.org?.name}</Typography>
            <Box display="flex" alignItems="center" gap={1} mt={1}>
              <Typography variant="body2" color="text.secondary">Current Plan:</Typography>
              <Chip
                size="small"
                label={upgradeDialog.org?.plan_name}
                sx={{
                  backgroundColor: `${planColors[upgradeDialog.org?.plan]}22`,
                  color: planColors[upgradeDialog.org?.plan],
                  fontWeight: 600,
                }}
              />
            </Box>
          </Paper>

          <FormControl fullWidth>
            <InputLabel>New Plan</InputLabel>
            <Select
              value={selectedPlan}
              onChange={(e) => setSelectedPlan(e.target.value)}
              label="New Plan"
            >
              <MenuItem value="STARTER">
                <Box>
                  <Typography>Starter - $29/month</Typography>
                  <Typography variant="caption" color="text.secondary">Up to 3 users, 50 clients</Typography>
                </Box>
              </MenuItem>
              <MenuItem value="PROFESSIONAL">
                <Box>
                  <Typography>Professional - $79/month</Typography>
                  <Typography variant="caption" color="text.secondary">Up to 10 users, 200 clients</Typography>
                </Box>
              </MenuItem>
              <MenuItem value="ENTERPRISE">
                <Box>
                  <Typography>Enterprise - Custom pricing</Typography>
                  <Typography variant="caption" color="text.secondary">Unlimited users & clients</Typography>
                </Box>
              </MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={() => setUpgradeDialog({ open: false, org: null })}
            disabled={actionLoading}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleUpgrade}
            disabled={actionLoading}
          >
            {actionLoading ? 'Processing...' : 'Upgrade Plan'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
