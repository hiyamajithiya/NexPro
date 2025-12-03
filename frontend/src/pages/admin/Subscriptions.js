import { useState, useEffect } from 'react';
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
  Tabs,
  Tab,
  TextField,
  Switch,
  FormControlLabel,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  TrendingUp,
  Refresh,
  Business,
  CheckCircle,
  ArrowUpward,
  LocalOffer,
  Add,
  Edit,
  Delete,
  Star,
  Warning,
  Visibility,
  People,
  Storage,
  AttachMoney,
} from '@mui/icons-material';
import { platformAdminAPI, subscriptionPlansAPI } from '../../services/api';

// Dynamic color palette for plans
const colorPalette = [
  '#6B7280', '#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444',
  '#EC4899', '#14B8A6', '#6366F1', '#84CC16'
];

// Function to get color for a plan based on its index or code
const getPlanColor = (planCode, index) => {
  const knownColors = {
    FREE: '#6B7280',
    STARTER: '#3B82F6',
    PROFESSIONAL: '#8B5CF6',
    ENTERPRISE: '#10B981',
  };
  return knownColors[planCode] || colorPalette[index % colorPalette.length];
};

export default function Subscriptions() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [organizations, setOrganizations] = useState([]);
  const [stats, setStats] = useState(null);
  const [plans, setPlans] = useState([]);
  const [activeTab, setActiveTab] = useState(0);

  // Subscription dialogs
  const [upgradeDialog, setUpgradeDialog] = useState({ open: false, org: null });
  const [selectedPlan, setSelectedPlan] = useState('');

  // Plan management dialogs
  const [editDialog, setEditDialog] = useState({ open: false, plan: null });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, plan: null });
  const [viewDialog, setViewDialog] = useState({ open: false, plan: null, color: null });

  const [actionLoading, setActionLoading] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    price_monthly: 0,
    price_yearly: 0,
    currency: 'INR',
    max_users: 1,
    max_clients: 10,
    max_storage_mb: 100,
    features: [],
    is_active: true,
    is_default: false,
    sort_order: 0,
  });
  const [featuresInput, setFeaturesInput] = useState('');

  // Create dynamic plan colors and details from fetched plans
  const planColors = {};
  const planDetails = {};
  const plansArray = Array.isArray(plans) ? plans : [];
  plansArray.forEach((plan, index) => {
    planColors[plan.code] = getPlanColor(plan.code, index);
    planDetails[plan.code] = {
      name: plan.name,
      users: plan.max_users >= 999 ? -1 : plan.max_users,
      clients: plan.max_clients >= 9999 ? -1 : plan.max_clients,
      price_monthly: plan.price_monthly,
      price_yearly: plan.price_yearly,
      currency: plan.currency,
    };
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [orgsRes, statsRes, plansRes] = await Promise.all([
        platformAdminAPI.getOrganizations(),
        platformAdminAPI.getStats(),
        subscriptionPlansAPI.getAll(),
      ]);
      // Filter only active (non-trial) organizations
      const paidOrgs = orgsRes.data.filter(org => org.status === 'ACTIVE');
      setOrganizations(paidOrgs);
      setStats(statsRes.data);
      // Handle both array and paginated response formats
      const plansData = plansRes.data;
      setPlans(Array.isArray(plansData) ? plansData : (plansData?.results || []));
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
      setSuccess('Plan upgraded successfully');
      fetchData();
    } catch (err) {
      setError(`Upgrade failed: ${err.response?.data?.error || err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Plan Management Functions
  const handleInitializeDefaults = async () => {
    setActionLoading(true);
    try {
      await subscriptionPlansAPI.initializeDefaults();
      setSuccess('Default plans created successfully');
      fetchData();
    } catch (err) {
      setError(`Failed to initialize plans: ${err.response?.data?.message || err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const openEditDialog = (plan = null) => {
    if (plan) {
      setFormData({
        code: plan.code,
        name: plan.name,
        description: plan.description || '',
        price_monthly: plan.price_monthly,
        price_yearly: plan.price_yearly,
        currency: plan.currency,
        max_users: plan.max_users,
        max_clients: plan.max_clients,
        max_storage_mb: plan.max_storage_mb,
        features: plan.features || [],
        is_active: plan.is_active,
        is_default: plan.is_default,
        sort_order: plan.sort_order,
      });
      setFeaturesInput((plan.features || []).join('\n'));
    } else {
      setFormData({
        code: '',
        name: '',
        description: '',
        price_monthly: 0,
        price_yearly: 0,
        currency: 'INR',
        max_users: 1,
        max_clients: 10,
        max_storage_mb: 100,
        features: [],
        is_active: true,
        is_default: false,
        sort_order: plansArray.length,
      });
      setFeaturesInput('');
    }
    setEditDialog({ open: true, plan });
  };

  const handleSavePlan = async () => {
    setActionLoading(true);
    try {
      const features = featuresInput.split('\n').filter(f => f.trim());
      const data = { ...formData, features };

      if (editDialog.plan) {
        await subscriptionPlansAPI.update(editDialog.plan.id, data);
        setSuccess('Plan updated successfully');
      } else {
        await subscriptionPlansAPI.create(data);
        setSuccess('Plan created successfully');
      }
      setEditDialog({ open: false, plan: null });
      fetchData();
    } catch (err) {
      setError(`Save failed: ${err.response?.data?.code?.[0] || err.response?.data?.error || err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeletePlan = async () => {
    setActionLoading(true);
    try {
      await subscriptionPlansAPI.delete(deleteDialog.plan.id);
      setSuccess('Plan deleted successfully');
      setDeleteDialog({ open: false, plan: null });
      fetchData();
    } catch (err) {
      setError(`Delete failed: ${err.response?.data?.error || err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSetDefault = async (plan) => {
    setActionLoading(true);
    try {
      await subscriptionPlansAPI.setDefault(plan.id);
      setSuccess(`${plan.name} is now the default plan`);
      fetchData();
    } catch (err) {
      setError(`Failed to set default: ${err.response?.data?.error || err.message}`);
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
                  Subscriptions & Plans
                </Typography>
                <Typography variant="body1" sx={{ opacity: 0.9, mt: 0.5 }}>
                  Manage subscription plans and organization subscriptions
                </Typography>
              </Box>
            </Box>
            <Box display="flex" gap={2}>
              {activeTab === 1 && (
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => openEditDialog()}
                  sx={{
                    bgcolor: 'rgba(255,255,255,0.2)',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
                  }}
                >
                  New Plan
                </Button>
              )}
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
          </Box>
        </CardContent>
      </Card>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      {/* Tabs */}
      <Paper sx={{ mb: 3, borderRadius: 2 }}>
        <Tabs
          value={activeTab}
          onChange={(e, newValue) => setActiveTab(newValue)}
          sx={{
            '& .MuiTab-root': { fontWeight: 600 },
            borderBottom: 1,
            borderColor: 'divider',
          }}
        >
          <Tab icon={<TrendingUp />} iconPosition="start" label="Subscriptions Overview" />
          <Tab icon={<LocalOffer />} iconPosition="start" label="Manage Plans" />
        </Tabs>
      </Paper>

      {/* Tab 0: Subscriptions Overview */}
      {activeTab === 0 && (
        <Box>
          {/* Warning if no subscription plans */}
          {plansArray.length === 0 && (
            <Alert
              severity="warning"
              sx={{ mb: 3 }}
              action={
                <Button color="inherit" size="small" onClick={() => setActiveTab(1)}>
                  Create Plans
                </Button>
              }
            >
              No subscription plans configured. Go to <strong>Manage Plans</strong> tab to create subscription plans first.
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
                        <Typography variant="h4" fontWeight={700} sx={{ color: planColors[plan] || '#667eea' }}>
                          {count}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {planDetails[plan]?.users === -1 ? 'Unlimited' : `Up to ${planDetails[plan]?.users || 0}`} users
                        </Typography>
                      </Box>
                      <Avatar
                        sx={{
                          bgcolor: `${planColors[plan] || '#667eea'}22`,
                          width: 48,
                          height: 48,
                        }}
                      >
                        <Business sx={{ color: planColors[plan] || '#667eea' }} />
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
                            bgcolor: planColors[plan] || '#667eea',
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
                                backgroundColor: `${planColors[org.plan] || '#667eea'}22`,
                                color: planColors[org.plan] || '#667eea',
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
                            <Tooltip title="Change Plan">
                              <IconButton
                                size="small"
                                color="primary"
                                onClick={() => {
                                  setUpgradeDialog({ open: true, org });
                                  const availablePlans = plansArray.filter(p => p.is_active && p.code !== org.plan);
                                  setSelectedPlan(availablePlans.length > 0 ? availablePlans[0].code : '');
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
        </Box>
      )}

      {/* Tab 1: Manage Plans */}
      {activeTab === 1 && (
        <Box>
          {/* Initialize Button (if no plans) */}
          {plansArray.length === 0 && (
            <Paper sx={{ p: 4, textAlign: 'center', mb: 4, borderRadius: 3 }}>
              <LocalOffer sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                No subscription plans found
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Initialize with default plans or create a new plan
              </Typography>
              <Button
                variant="contained"
                color="primary"
                onClick={handleInitializeDefaults}
                disabled={actionLoading}
              >
                {actionLoading ? 'Creating...' : 'Create Default Plans'}
              </Button>
            </Paper>
          )}

          {/* Plans Table */}
          {plansArray.length > 0 && (
            <Card sx={{ borderRadius: 3, boxShadow: 3 }}>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#f8fafc' }}>
                      <TableCell sx={{ fontWeight: 600 }}>Plan</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Code</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>Monthly</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>Yearly</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 600 }}>Users</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 600 }}>Clients</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 600 }}>Orgs Using</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 600 }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {plansArray.map((plan, index) => {
                      const planColor = getPlanColor(plan.code, index);
                      return (
                        <TableRow key={plan.id} hover>
                          <TableCell>
                            <Box display="flex" alignItems="center" gap={2}>
                              <Avatar sx={{ bgcolor: planColor, width: 36, height: 36 }}>
                                {plan.name.charAt(0).toUpperCase()}
                              </Avatar>
                              <Box>
                                <Box display="flex" alignItems="center" gap={1}>
                                  <Typography variant="body2" fontWeight={600}>
                                    {plan.name}
                                  </Typography>
                                  {plan.is_default && (
                                    <Chip
                                      size="small"
                                      label="Default"
                                      icon={<Star sx={{ fontSize: 14 }} />}
                                      color="warning"
                                      sx={{ height: 20, fontSize: '0.7rem' }}
                                    />
                                  )}
                                </Box>
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {plan.description || 'No description'}
                                </Typography>
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              label={plan.code}
                              sx={{
                                backgroundColor: `${planColor}22`,
                                color: planColor,
                                fontWeight: 600,
                              }}
                            />
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" fontWeight={600}>
                              {plan.currency} {parseFloat(plan.price_monthly).toLocaleString()}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2">
                              {plan.currency} {parseFloat(plan.price_yearly).toLocaleString()}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Typography variant="body2">
                              {plan.max_users >= 999 ? 'Unlimited' : plan.max_users}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Typography variant="body2">
                              {plan.max_clients >= 9999 ? 'Unlimited' : plan.max_clients}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Chip
                              size="small"
                              label={plan.organizations_count || 0}
                              color={plan.organizations_count > 0 ? 'primary' : 'default'}
                            />
                          </TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              label={plan.is_active ? 'Active' : 'Inactive'}
                              color={plan.is_active ? 'success' : 'default'}
                            />
                          </TableCell>
                          <TableCell align="center">
                            <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                              <Tooltip title="View Details">
                                <IconButton
                                  size="small"
                                  color="info"
                                  onClick={() => setViewDialog({ open: true, plan, color: planColor })}
                                >
                                  <Visibility fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              {!plan.is_default && (
                                <Tooltip title="Set as Default">
                                  <IconButton
                                    size="small"
                                    color="warning"
                                    onClick={() => handleSetDefault(plan)}
                                  >
                                    <Star fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              )}
                              <Tooltip title="Edit Plan">
                                <IconButton
                                  size="small"
                                  color="primary"
                                  onClick={() => openEditDialog(plan)}
                                >
                                  <Edit fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title={plan.organizations_count > 0 ? 'Cannot delete - plan in use' : 'Delete Plan'}>
                                <span>
                                  <IconButton
                                    size="small"
                                    color="error"
                                    onClick={() => setDeleteDialog({ open: true, plan })}
                                    disabled={plan.organizations_count > 0}
                                  >
                                    <Delete fontSize="small" />
                                  </IconButton>
                                </span>
                              </Tooltip>
                            </Box>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </Card>
          )}
        </Box>
      )}

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
          Change Subscription Plan
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
                  backgroundColor: `${planColors[upgradeDialog.org?.plan] || '#667eea'}22`,
                  color: planColors[upgradeDialog.org?.plan] || '#667eea',
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
              {plansArray
                .filter(plan => plan.is_active && plan.code !== upgradeDialog.org?.plan)
                .map(plan => (
                  <MenuItem key={plan.code} value={plan.code}>
                    <Box>
                      <Typography>
                        {plan.name} - {plan.currency} {parseFloat(plan.price_monthly).toLocaleString()}/month
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {plan.max_users >= 999 ? 'Unlimited' : `Up to ${plan.max_users}`} users, {plan.max_clients >= 9999 ? 'Unlimited' : plan.max_clients} clients
                      </Typography>
                    </Box>
                  </MenuItem>
                ))}
              {plansArray.filter(plan => plan.is_active && plan.code !== upgradeDialog.org?.plan).length === 0 && (
                <MenuItem disabled>
                  <Typography color="text.secondary">No other plans available</Typography>
                </MenuItem>
              )}
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
            disabled={actionLoading || !selectedPlan}
          >
            {actionLoading ? 'Processing...' : 'Change Plan'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit/Create Plan Dialog */}
      <Dialog
        open={editDialog.open}
        onClose={() => setEditDialog({ open: false, plan: null })}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
        }}>
          {editDialog.plan ? 'Edit Plan' : 'Create New Plan'}
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          {actionLoading && <LinearProgress sx={{ mb: 2 }} />}

          <Grid container spacing={3} sx={{ mt: 0 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Plan Code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                disabled={!!editDialog.plan}
                helperText="Unique identifier (e.g., STARTER, PROFESSIONAL)"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Plan Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                multiline
                rows={2}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Currency"
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value.toUpperCase() })}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                type="number"
                label="Monthly Price"
                value={formData.price_monthly}
                onChange={(e) => setFormData({ ...formData, price_monthly: parseFloat(e.target.value) || 0 })}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                type="number"
                label="Yearly Price"
                value={formData.price_yearly}
                onChange={(e) => setFormData({ ...formData, price_yearly: parseFloat(e.target.value) || 0 })}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                type="number"
                label="Max Users"
                value={formData.max_users}
                onChange={(e) => setFormData({ ...formData, max_users: parseInt(e.target.value) || 1 })}
                helperText="Use 999 for unlimited"
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                type="number"
                label="Max Clients"
                value={formData.max_clients}
                onChange={(e) => setFormData({ ...formData, max_clients: parseInt(e.target.value) || 10 })}
                helperText="Use 9999 for unlimited"
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                type="number"
                label="Max Storage (MB)"
                value={formData.max_storage_mb}
                onChange={(e) => setFormData({ ...formData, max_storage_mb: parseInt(e.target.value) || 100 })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Features (one per line)"
                value={featuresInput}
                onChange={(e) => setFeaturesInput(e.target.value)}
                multiline
                rows={4}
                helperText="List plan features, one per line"
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                type="number"
                label="Sort Order"
                value={formData.sort_order}
                onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                helperText="Lower number = higher position"
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  />
                }
                label="Active"
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.is_default}
                    onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                  />
                }
                label="Default Plan"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={() => setEditDialog({ open: false, plan: null })}
            disabled={actionLoading}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSavePlan}
            disabled={actionLoading || !formData.code || !formData.name}
          >
            {actionLoading ? 'Saving...' : (editDialog.plan ? 'Update Plan' : 'Create Plan')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Plan Dialog */}
      <Dialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, plan: null })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{
          background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
          color: 'white',
        }}>
          Delete Plan
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          {actionLoading && <LinearProgress sx={{ mb: 2 }} />}

          <Alert severity="error" icon={<Warning />} sx={{ mb: 2 }}>
            <Typography variant="body2" fontWeight={600}>
              This action cannot be undone!
            </Typography>
            <Typography variant="body2">
              The subscription plan will be permanently deleted.
            </Typography>
          </Alert>

          <Paper sx={{ p: 2, bgcolor: '#fef2f2', borderRadius: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Plan to be deleted:
            </Typography>
            <Typography variant="h6" fontWeight={600} color="error.main">
              {deleteDialog.plan?.name} ({deleteDialog.plan?.code})
            </Typography>
          </Paper>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={() => setDeleteDialog({ open: false, plan: null })}
            disabled={actionLoading}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDeletePlan}
            disabled={actionLoading}
          >
            {actionLoading ? 'Deleting...' : 'Delete Permanently'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Plan Details Dialog */}
      <Dialog
        open={viewDialog.open}
        onClose={() => setViewDialog({ open: false, plan: null, color: null })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{
          background: `linear-gradient(135deg, ${viewDialog.color || '#667eea'} 0%, ${viewDialog.color || '#764ba2'}99 100%)`,
          color: 'white',
        }}>
          <Box display="flex" alignItems="center" gap={2}>
            <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)' }}>
              {viewDialog.plan?.name?.charAt(0).toUpperCase()}
            </Avatar>
            <Box>
              <Typography variant="h6">{viewDialog.plan?.name}</Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                {viewDialog.plan?.code}
              </Typography>
            </Box>
            {viewDialog.plan?.is_default && (
              <Chip
                size="small"
                label="Default"
                icon={<Star sx={{ fontSize: 14, color: 'inherit' }} />}
                sx={{
                  bgcolor: 'rgba(255,255,255,0.2)',
                  color: 'white',
                  ml: 'auto'
                }}
              />
            )}
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          {/* Description */}
          {viewDialog.plan?.description && (
            <Paper sx={{ p: 2, mb: 3, bgcolor: '#f8fafc', borderRadius: 2 }}>
              <Typography variant="body2" color="text.secondary">
                {viewDialog.plan.description}
              </Typography>
            </Paper>
          )}

          {/* Pricing */}
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Pricing
          </Typography>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={6}>
              <Paper sx={{ p: 2, textAlign: 'center', borderRadius: 2, border: '1px solid #e5e7eb' }}>
                <AttachMoney color="primary" />
                <Typography variant="h5" fontWeight={700} color="primary">
                  {viewDialog.plan?.currency} {parseFloat(viewDialog.plan?.price_monthly || 0).toLocaleString()}
                </Typography>
                <Typography variant="caption" color="text.secondary">per month</Typography>
              </Paper>
            </Grid>
            <Grid item xs={6}>
              <Paper sx={{ p: 2, textAlign: 'center', borderRadius: 2, border: '1px solid #e5e7eb' }}>
                <AttachMoney color="success" />
                <Typography variant="h5" fontWeight={700} color="success.main">
                  {viewDialog.plan?.currency} {parseFloat(viewDialog.plan?.price_yearly || 0).toLocaleString()}
                </Typography>
                <Typography variant="caption" color="text.secondary">per year</Typography>
              </Paper>
            </Grid>
          </Grid>

          {/* Limits */}
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Plan Limits
          </Typography>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={4}>
              <Paper sx={{ p: 2, textAlign: 'center', borderRadius: 2, bgcolor: '#f0f9ff' }}>
                <People sx={{ color: '#3b82f6', mb: 0.5 }} />
                <Typography variant="h6" fontWeight={600}>
                  {viewDialog.plan?.max_users >= 999 ? '∞' : viewDialog.plan?.max_users}
                </Typography>
                <Typography variant="caption" color="text.secondary">Users</Typography>
              </Paper>
            </Grid>
            <Grid item xs={4}>
              <Paper sx={{ p: 2, textAlign: 'center', borderRadius: 2, bgcolor: '#f0fdf4' }}>
                <Business sx={{ color: '#10b981', mb: 0.5 }} />
                <Typography variant="h6" fontWeight={600}>
                  {viewDialog.plan?.max_clients >= 9999 ? '∞' : viewDialog.plan?.max_clients}
                </Typography>
                <Typography variant="caption" color="text.secondary">Clients</Typography>
              </Paper>
            </Grid>
            <Grid item xs={4}>
              <Paper sx={{ p: 2, textAlign: 'center', borderRadius: 2, bgcolor: '#fef3c7' }}>
                <Storage sx={{ color: '#f59e0b', mb: 0.5 }} />
                <Typography variant="h6" fontWeight={600}>
                  {viewDialog.plan?.max_storage_mb >= 99999 ? '∞' : `${viewDialog.plan?.max_storage_mb}MB`}
                </Typography>
                <Typography variant="caption" color="text.secondary">Storage</Typography>
              </Paper>
            </Grid>
          </Grid>

          {/* Features */}
          {viewDialog.plan?.features && viewDialog.plan.features.length > 0 && (
            <>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Features
              </Typography>
              <Paper sx={{ borderRadius: 2, border: '1px solid #e5e7eb' }}>
                <List dense>
                  {viewDialog.plan.features.map((feature, idx) => (
                    <ListItem key={idx} divider={idx < viewDialog.plan.features.length - 1}>
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        <CheckCircle sx={{ color: viewDialog.color || '#10b981', fontSize: 20 }} />
                      </ListItemIcon>
                      <ListItemText primary={feature} />
                    </ListItem>
                  ))}
                </List>
              </Paper>
            </>
          )}

          {/* Status Info */}
          <Divider sx={{ my: 3 }} />
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Box display="flex" gap={1}>
              <Chip
                size="small"
                label={viewDialog.plan?.is_active ? 'Active' : 'Inactive'}
                color={viewDialog.plan?.is_active ? 'success' : 'default'}
              />
              <Chip
                size="small"
                label={`${viewDialog.plan?.organizations_count || 0} organizations using`}
                variant="outlined"
              />
            </Box>
            <Typography variant="caption" color="text.secondary">
              Sort Order: {viewDialog.plan?.sort_order}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setViewDialog({ open: false, plan: null, color: null })}>
            Close
          </Button>
          <Button
            variant="contained"
            startIcon={<Edit />}
            onClick={() => {
              setViewDialog({ open: false, plan: null, color: null });
              openEditDialog(viewDialog.plan);
            }}
          >
            Edit Plan
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
