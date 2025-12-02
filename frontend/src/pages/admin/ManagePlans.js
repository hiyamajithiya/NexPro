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
  Switch,
  FormControlLabel,
  LinearProgress,
  Grid,
  Avatar,
  Paper,
} from '@mui/material';
import {
  LocalOffer,
  Refresh,
  Add,
  Edit,
  Delete,
  Star,
  Warning,
} from '@mui/icons-material';
import { subscriptionPlansAPI } from '../../services/api';

const planColors = {
  FREE: '#6B7280',
  STARTER: '#3B82F6',
  PROFESSIONAL: '#8B5CF6',
  ENTERPRISE: '#10B981',
};

export default function ManagePlans() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [plans, setPlans] = useState([]);
  const [editDialog, setEditDialog] = useState({ open: false, plan: null });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, plan: null });
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

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await subscriptionPlansAPI.getAll();
      setPlans(response.data);
    } catch (err) {
      setError('Failed to load subscription plans');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleInitializeDefaults = async () => {
    setActionLoading(true);
    try {
      await subscriptionPlansAPI.initializeDefaults();
      setSuccess('Default plans created successfully');
      fetchPlans();
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
        sort_order: plans.length,
      });
      setFeaturesInput('');
    }
    setEditDialog({ open: true, plan });
  };

  const handleSave = async () => {
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
      fetchPlans();
    } catch (err) {
      setError(`Save failed: ${err.response?.data?.code?.[0] || err.response?.data?.error || err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    setActionLoading(true);
    try {
      await subscriptionPlansAPI.delete(deleteDialog.plan.id);
      setSuccess('Plan deleted successfully');
      setDeleteDialog({ open: false, plan: null });
      fetchPlans();
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
      fetchPlans();
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
                <LocalOffer sx={{ fontSize: 28 }} />
              </Avatar>
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 600 }}>
                  Manage Plans
                </Typography>
                <Typography variant="body1" sx={{ opacity: 0.9, mt: 0.5 }}>
                  Create and customize subscription plans
                </Typography>
              </Box>
            </Box>
            <Box display="flex" gap={2}>
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
              <Button
                variant="contained"
                startIcon={<Refresh />}
                onClick={fetchPlans}
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

      {/* Initialize Button (if no plans) */}
      {plans.length === 0 && (
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
      {plans.length > 0 && (
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
                {plans.map((plan) => (
                  <TableRow key={plan.id} hover>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={2}>
                        <Avatar sx={{ bgcolor: planColors[plan.code] || '#667eea', width: 36, height: 36 }}>
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
                          backgroundColor: `${planColors[plan.code] || '#667eea'}22`,
                          color: planColors[plan.code] || '#667eea',
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
                        label={plan.organizations_count}
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
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}

      {/* Edit/Create Dialog */}
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
            onClick={handleSave}
            disabled={actionLoading || !formData.code || !formData.name}
          >
            {actionLoading ? 'Saving...' : (editDialog.plan ? 'Update Plan' : 'Create Plan')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Dialog */}
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
            onClick={handleDelete}
            disabled={actionLoading}
          >
            {actionLoading ? 'Deleting...' : 'Delete Permanently'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
