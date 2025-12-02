import React, { useState, useEffect } from 'react';
import {
  Container,
  Box,
  Typography,
  Grid,
  TextField,
  Button,
  Alert,
  Snackbar,
  CircularProgress,
  Card,
  CardContent,
  LinearProgress,
  Chip,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Business as BusinessIcon,
  Save as SaveIcon,
  Check as CheckIcon,
  Warning as WarningIcon,
  People as PeopleIcon,
  Groups as GroupsIcon,
  TrendingUp as TrendingUpIcon,
  Star as StarIcon,
  LocationOn as LocationIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  Receipt as ReceiptIcon,
  Badge as BadgeIcon,
} from '@mui/icons-material';
import { organizationAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const planColors = {
  FREE: 'default',
  STARTER: 'primary',
  PROFESSIONAL: 'secondary',
  ENTERPRISE: 'success',
};

const statusColors = {
  ACTIVE: 'success',
  TRIAL: 'warning',
  SUSPENDED: 'error',
  CANCELLED: 'default',
};

export default function OrganizationSettings() {
  const { updateOrganization, hasAdminAccess } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [orgData, setOrgData] = useState(null);
  const [usage, setUsage] = useState(null);
  const [plans, setPlans] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Upgrade request state
  const [upgradeDialog, setUpgradeDialog] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [upgradeForm, setUpgradeForm] = useState({
    contact_email: '',
    contact_phone: '',
    message: '',
  });
  const [submittingUpgrade, setSubmittingUpgrade] = useState(false);
  const [upgradeRequests, setUpgradeRequests] = useState([]);

  // Form fields
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    country: '',
    pincode: '',
    firm_name: '',
    gstin: '',
    pan: '',
  });

  useEffect(() => {
    fetchOrganizationData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchOrganizationData = async () => {
    setLoading(true);
    try {
      const [orgResponse, usageResponse, plansResponse, upgradeRequestsResponse] = await Promise.all([
        organizationAPI.getCurrent(),
        organizationAPI.getUsage(),
        organizationAPI.getPlans(),
        organizationAPI.getUpgradeRequests(),
      ]);

      setOrgData(orgResponse.data);
      setUsage(usageResponse.data);
      setPlans(plansResponse.data);
      setUpgradeRequests(upgradeRequestsResponse.data.requests || []);

      // Set default contact email for upgrade form
      setUpgradeForm(prev => ({
        ...prev,
        contact_email: orgResponse.data.email || '',
        contact_phone: orgResponse.data.phone || '',
      }));

      // Populate form
      setFormData({
        name: orgResponse.data.name || '',
        email: orgResponse.data.email || '',
        phone: orgResponse.data.phone || '',
        address: orgResponse.data.address || '',
        city: orgResponse.data.city || '',
        state: orgResponse.data.state || '',
        country: orgResponse.data.country || '',
        pincode: orgResponse.data.pincode || '',
        firm_name: orgResponse.data.firm_name || '',
        gstin: orgResponse.data.gstin || '',
        pan: orgResponse.data.pan || '',
      });
    } catch (err) {
      showSnackbar('Failed to load organization data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field) => (e) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await organizationAPI.updateCurrent(formData);
      setOrgData(response.data);
      updateOrganization(response.data);
      showSnackbar('Organization settings updated successfully', 'success');
    } catch (err) {
      showSnackbar(err.response?.data?.detail || 'Failed to update organization', 'error');
    } finally {
      setSaving(false);
    }
  };

  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  const handleOpenUpgradeDialog = (plan) => {
    setSelectedPlan(plan);
    setUpgradeDialog(true);
  };

  const handleCloseUpgradeDialog = () => {
    setUpgradeDialog(false);
    setSelectedPlan(null);
  };

  const handleSubmitUpgradeRequest = async () => {
    if (!selectedPlan) return;

    setSubmittingUpgrade(true);
    try {
      await organizationAPI.requestUpgrade({
        requested_plan: selectedPlan.code,
        contact_email: upgradeForm.contact_email,
        contact_phone: upgradeForm.contact_phone,
        message: upgradeForm.message,
      });
      showSnackbar('Upgrade request submitted successfully! Our team will contact you shortly.', 'success');
      handleCloseUpgradeDialog();
      // Refresh upgrade requests
      const response = await organizationAPI.getUpgradeRequests();
      setUpgradeRequests(response.data.requests || []);
    } catch (error) {
      showSnackbar(error.response?.data?.error || 'Failed to submit upgrade request', 'error');
    } finally {
      setSubmittingUpgrade(false);
    }
  };

  const hasPendingRequest = upgradeRequests.some(r => r.status === 'PENDING');

  if (loading) {
    return (
      <Container maxWidth="xl">
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
          <CircularProgress size={48} />
        </Box>
      </Container>
    );
  }

  const canEdit = hasAdminAccess();

  return (
    <Container maxWidth="xl">
      <Box sx={{ mb: 4 }}>
        {/* Header Card - matching Settings.js theme */}
        <Card
          sx={{
            background: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
            color: '#333',
            mb: 3,
          }}
        >
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <BusinessIcon sx={{ fontSize: 40, color: 'primary.main' }} />
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 600, color: 'primary.main' }}>
                  Organization Settings
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.8, mt: 0.5 }}>
                  Manage your organization profile and subscription
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>

        {/* Current Plan & Usage Card */}
        <Card sx={{ mb: 3, borderRadius: 3, boxShadow: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
              <StarIcon color="primary" />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Current Plan & Usage
              </Typography>
            </Box>

            <Grid container spacing={3}>
              {/* Plan Info */}
              <Grid item xs={12} md={4}>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Subscription Plan
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip
                      label={usage?.plan_name || orgData?.plan || 'FREE'}
                      color={planColors[orgData?.plan] || 'default'}
                      sx={{ fontWeight: 600 }}
                    />
                    <Chip
                      label={orgData?.status || 'ACTIVE'}
                      color={statusColors[orgData?.status] || 'default'}
                      variant="outlined"
                      size="small"
                    />
                  </Box>
                </Box>

                {usage?.trial?.is_trial && (
                  <Alert
                    severity={usage.trial.is_expired ? 'error' : 'warning'}
                    icon={<WarningIcon />}
                    sx={{ mt: 2 }}
                  >
                    {usage.trial.is_expired
                      ? 'Trial has expired. Please upgrade to continue.'
                      : `${usage.trial.days_remaining} days left in trial`}
                  </Alert>
                )}
              </Grid>

              {/* Users Usage */}
              <Grid item xs={12} md={4}>
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <PeopleIcon sx={{ fontSize: 20, color: 'primary.main' }} />
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Users</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2" color="text.secondary">
                      {usage?.users?.current || 0} of {usage?.users?.max === -1 ? 'Unlimited' : usage?.users?.max}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {usage?.users?.max !== -1 ? `${usage?.users?.percentage || 0}%` : ''}
                    </Typography>
                  </Box>
                  {usage?.users?.max !== -1 && (
                    <LinearProgress
                      variant="determinate"
                      value={usage?.users?.percentage || 0}
                      color={usage?.users?.percentage > 80 ? 'warning' : 'primary'}
                      sx={{ height: 8, borderRadius: 4 }}
                    />
                  )}
                </Box>
              </Grid>

              {/* Clients Usage */}
              <Grid item xs={12} md={4}>
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <GroupsIcon sx={{ fontSize: 20, color: 'secondary.main' }} />
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Clients</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2" color="text.secondary">
                      {usage?.clients?.current || 0} of {usage?.clients?.max === -1 ? 'Unlimited' : usage?.clients?.max}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {usage?.clients?.max !== -1 ? `${usage?.clients?.percentage || 0}%` : ''}
                    </Typography>
                  </Box>
                  {usage?.clients?.max !== -1 && (
                    <LinearProgress
                      variant="determinate"
                      value={usage?.clients?.percentage || 0}
                      color={usage?.clients?.percentage > 80 ? 'warning' : 'secondary'}
                      sx={{ height: 8, borderRadius: 4 }}
                    />
                  )}
                </Box>
              </Grid>

              {/* Features */}
              {usage?.features?.length > 0 && (
                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>Features Included</Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {usage.features.map((feature) => (
                      <Chip
                        key={feature}
                        icon={<CheckIcon />}
                        label={feature.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                        size="small"
                        variant="outlined"
                        color="success"
                      />
                    ))}
                  </Box>
                </Grid>
              )}
            </Grid>
          </CardContent>
        </Card>

        {/* Upgrade Options */}
        {plans?.upgrade_options?.length > 0 && (
          <Card sx={{ mb: 3, borderRadius: 3, boxShadow: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TrendingUpIcon color="primary" />
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Upgrade Options
                  </Typography>
                </Box>
                {hasPendingRequest && (
                  <Chip label="Upgrade Request Pending" color="warning" size="small" />
                )}
              </Box>

              {hasPendingRequest && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  You have a pending upgrade request. Our team will contact you shortly.
                </Alert>
              )}

              <Grid container spacing={2}>
                {plans.upgrade_options.map((plan) => (
                  <Grid item xs={12} md={4} key={plan.code}>
                    <Card variant="outlined" sx={{ p: 2, height: '100%', borderColor: 'primary.light', display: 'flex', flexDirection: 'column' }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                        {plan.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1, flex: 1 }}>
                        {plan.description}
                      </Typography>
                      <Typography variant="h6" color="primary" sx={{ fontWeight: 600 }}>
                        {plan.price_monthly > 0 ? `₹${plan.price_monthly}/month` : 'Custom Pricing'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ mb: 2 }}>
                        {plan.max_users === -1 ? 'Unlimited' : plan.max_users} users,{' '}
                        {plan.max_clients === -1 ? 'Unlimited' : plan.max_clients} clients
                      </Typography>
                      <Button
                        variant="contained"
                        size="small"
                        onClick={() => handleOpenUpgradeDialog(plan)}
                        disabled={hasPendingRequest}
                        fullWidth
                      >
                        Request Upgrade
                      </Button>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        )}

        {/* Basic Information */}
        <Card sx={{ mb: 3, borderRadius: 3, boxShadow: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
              <BadgeIcon color="primary" />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Basic Information
              </Typography>
            </Box>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Organization Name"
                  value={formData.name}
                  onChange={handleChange('name')}
                  disabled={!canEdit}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Firm Name (Display Name)"
                  value={formData.firm_name}
                  onChange={handleChange('firm_name')}
                  disabled={!canEdit}
                  placeholder="Name to display on documents"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange('email')}
                  disabled={!canEdit}
                  InputProps={{
                    startAdornment: <EmailIcon sx={{ color: 'text.secondary', mr: 1 }} />,
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Phone"
                  value={formData.phone}
                  onChange={handleChange('phone')}
                  disabled={!canEdit}
                  InputProps={{
                    startAdornment: <PhoneIcon sx={{ color: 'text.secondary', mr: 1 }} />,
                  }}
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Address Information */}
        <Card sx={{ mb: 3, borderRadius: 3, boxShadow: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
              <LocationIcon color="primary" />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Address Information
              </Typography>
            </Box>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Address"
                  value={formData.address}
                  onChange={handleChange('address')}
                  disabled={!canEdit}
                  multiline
                  rows={2}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="City"
                  value={formData.city}
                  onChange={handleChange('city')}
                  disabled={!canEdit}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="State"
                  value={formData.state}
                  onChange={handleChange('state')}
                  disabled={!canEdit}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Country"
                  value={formData.country}
                  onChange={handleChange('country')}
                  disabled={!canEdit}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Pincode"
                  value={formData.pincode}
                  onChange={handleChange('pincode')}
                  disabled={!canEdit}
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Tax & Compliance */}
        <Card sx={{ mb: 3, borderRadius: 3, boxShadow: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
              <ReceiptIcon color="primary" />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Tax & Compliance
              </Typography>
            </Box>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="GSTIN"
                  value={formData.gstin}
                  onChange={handleChange('gstin')}
                  disabled={!canEdit}
                  placeholder="22AAAAA0000A1Z5"
                  helperText="15-digit GST Identification Number"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="PAN"
                  value={formData.pan}
                  onChange={handleChange('pan')}
                  disabled={!canEdit}
                  placeholder="AAAAA0000A"
                  inputProps={{ maxLength: 10, style: { textTransform: 'uppercase' } }}
                  helperText="10-character PAN number"
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Save Button */}
        {canEdit && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="contained"
              size="large"
              startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
              onClick={handleSave}
              disabled={saving}
              sx={{ mt: 1 }}
            >
              {saving ? 'Saving...' : 'Save Organization Settings'}
            </Button>
          </Box>
        )}
      </Box>

      {/* Upgrade Request Dialog */}
      <Dialog open={upgradeDialog} onClose={handleCloseUpgradeDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TrendingUpIcon color="primary" />
            <Typography variant="h6">Request Plan Upgrade</Typography>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          {selectedPlan && (
            <>
              <Alert severity="info" sx={{ mb: 3 }}>
                <Typography variant="body2">
                  <strong>Upgrading to:</strong> {selectedPlan.name}
                  <br />
                  <strong>Price:</strong> {selectedPlan.price_monthly > 0 ? `₹${selectedPlan.price_monthly}/month` : 'Custom Pricing'}
                </Typography>
              </Alert>

              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Contact Email"
                    type="email"
                    value={upgradeForm.contact_email}
                    onChange={(e) => setUpgradeForm({ ...upgradeForm, contact_email: e.target.value })}
                    required
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Contact Phone"
                    value={upgradeForm.contact_phone}
                    onChange={(e) => setUpgradeForm({ ...upgradeForm, contact_phone: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Additional Message (Optional)"
                    multiline
                    rows={3}
                    value={upgradeForm.message}
                    onChange={(e) => setUpgradeForm({ ...upgradeForm, message: e.target.value })}
                    placeholder="Any specific requirements or questions about the upgrade..."
                  />
                </Grid>
              </Grid>
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, bgcolor: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
          <Button onClick={handleCloseUpgradeDialog} disabled={submittingUpgrade}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmitUpgradeRequest}
            variant="contained"
            disabled={!upgradeForm.contact_email || submittingUpgrade}
            startIcon={submittingUpgrade ? <CircularProgress size={20} color="inherit" /> : <TrendingUpIcon />}
          >
            {submittingUpgrade ? 'Submitting...' : 'Submit Request'}
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
