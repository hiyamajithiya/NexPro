import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Grid,
  Alert,
  Snackbar,
  Switch,
  FormControlLabel,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  LinearProgress,
  Divider,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Save as SaveIcon,
  Notifications as NotificationsIcon,
  Security as SecurityIcon,
  Email as EmailIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  Send as SendIcon,
  Business as BusinessIcon,
  Check as CheckIcon,
  Warning as WarningIcon,
  People as PeopleIcon,
  Groups as GroupsIcon,
  TrendingUp as TrendingUpIcon,
  LocationOn as LocationIcon,
  Phone as PhoneIcon,
  Receipt as ReceiptIcon,
  Badge as BadgeIcon,
} from '@mui/icons-material';
import { organizationEmailsAPI, usersAPI, organizationAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

// Tab Panel Component
function TabPanel({ children, value, index, ...other }) {
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

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

export default function Settings() {
  const { updateOrganization, hasAdminAccess } = useAuth();
  const [tabValue, setTabValue] = useState(0);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Organization state
  const [loadingOrg, setLoadingOrg] = useState(true);
  const [savingOrg, setSavingOrg] = useState(false);
  const [orgData, setOrgData] = useState(null);
  const [usage, setUsage] = useState(null);
  const [plans, setPlans] = useState(null);
  const [orgFormData, setOrgFormData] = useState({
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

  // Notification Settings (API-backed)
  const [notificationSettings, setNotificationSettings] = useState({
    emailReminders: true,
    taskNotifications: true,
    overdueAlerts: true,
    weeklyReports: false,
  });
  const [loadingNotifications, setLoadingNotifications] = useState(true);
  const [savingNotifications, setSavingNotifications] = useState(false);

  // Test email dialog for email accounts
  const [testEmailDialog, setTestEmailDialog] = useState(false);
  const [testEmailAddress, setTestEmailAddress] = useState('');
  const [sendingTestEmail, setSendingTestEmail] = useState(false);
  const [testingAccount, setTestingAccount] = useState(null);

  // Email Accounts (multi-email support)
  const [emailAccounts, setEmailAccounts] = useState([]);
  const [loadingEmailAccounts, setLoadingEmailAccounts] = useState(true);
  const [emailAccountDialog, setEmailAccountDialog] = useState(false);
  const [editingEmailAccount, setEditingEmailAccount] = useState(null);
  const [emailAccountForm, setEmailAccountForm] = useState({
    email_address: '',
    display_name: '',
    is_active: true,
    is_default: false,
    use_custom_smtp: false,
    smtp_host: '',
    smtp_port: 587,
    smtp_username: '',
    smtp_password: '',
    smtp_use_tls: true,
  });

  // Security Settings
  const [securitySettings, setSecuritySettings] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [changingPassword, setChangingPassword] = useState(false);

  const canEdit = hasAdminAccess();

  // Load all settings on component mount
  useEffect(() => {
    fetchOrganizationData();
    loadNotificationSettings();
    loadEmailAccounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchOrganizationData = async () => {
    setLoadingOrg(true);
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
      setOrgFormData({
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
      setLoadingOrg(false);
    }
  };

  const loadNotificationSettings = async () => {
    try {
      setLoadingNotifications(true);
      const response = await usersAPI.getNotificationPreferences();
      const data = response.data;
      setNotificationSettings({
        emailReminders: data.notify_email_reminders,
        taskNotifications: data.notify_task_assignments,
        overdueAlerts: data.notify_overdue_alerts,
        weeklyReports: data.notify_weekly_reports,
      });
    } catch (error) {
      console.error('Error loading notification settings:', error);
    } finally {
      setLoadingNotifications(false);
    }
  };

  const loadEmailAccounts = async () => {
    try {
      const response = await organizationEmailsAPI.getAll();
      const data = response.data;
      setEmailAccounts(Array.isArray(data) ? data : (data.results || []));
    } catch (error) {
      console.error('Error loading email accounts:', error);
    } finally {
      setLoadingEmailAccounts(false);
    }
  };

  const handleOrgChange = (field) => (e) => {
    setOrgFormData((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSaveOrg = async () => {
    setSavingOrg(true);
    try {
      const response = await organizationAPI.updateCurrent(orgFormData);
      setOrgData(response.data);
      updateOrganization(response.data);
      showSnackbar('Organization settings updated successfully', 'success');
    } catch (err) {
      showSnackbar(err.response?.data?.detail || 'Failed to update organization', 'error');
    } finally {
      setSavingOrg(false);
    }
  };

  const handleOpenEmailAccountDialog = (account = null) => {
    if (account) {
      setEditingEmailAccount(account);
      setEmailAccountForm({
        email_address: account.email_address,
        display_name: account.display_name || '',
        is_active: account.is_active,
        is_default: account.is_default,
        use_custom_smtp: account.use_custom_smtp || false,
        smtp_host: account.smtp_host || '',
        smtp_port: account.smtp_port || 587,
        smtp_username: account.smtp_username || '',
        smtp_password: '', // Don't load password for security
        smtp_use_tls: account.smtp_use_tls !== false,
      });
    } else {
      setEditingEmailAccount(null);
      setEmailAccountForm({
        email_address: '',
        display_name: '',
        is_active: true,
        is_default: false,
        use_custom_smtp: false,
        smtp_host: '',
        smtp_port: 587,
        smtp_username: '',
        smtp_password: '',
        smtp_use_tls: true,
      });
    }
    setEmailAccountDialog(true);
  };

  const handleCloseEmailAccountDialog = () => {
    setEmailAccountDialog(false);
    setEditingEmailAccount(null);
  };

  const handleSaveEmailAccount = async () => {
    try {
      if (editingEmailAccount) {
        await organizationEmailsAPI.update(editingEmailAccount.id, emailAccountForm);
        showSnackbar('Email account updated successfully', 'success');
      } else {
        await organizationEmailsAPI.create(emailAccountForm);
        showSnackbar('Email account created successfully', 'success');
      }
      handleCloseEmailAccountDialog();
      loadEmailAccounts();
    } catch (error) {
      showSnackbar(error.response?.data?.detail || 'Failed to save email account', 'error');
    }
  };

  const handleDeleteEmailAccount = async (id) => {
    if (window.confirm('Are you sure you want to delete this email account?')) {
      try {
        await organizationEmailsAPI.delete(id);
        showSnackbar('Email account deleted successfully', 'success');
        loadEmailAccounts();
      } catch (error) {
        showSnackbar('Failed to delete email account', 'error');
      }
    }
  };

  const handleSetDefaultEmail = async (id) => {
    try {
      await organizationEmailsAPI.setDefault(id);
      showSnackbar('Default email updated', 'success');
      loadEmailAccounts();
    } catch (error) {
      showSnackbar('Failed to set default email', 'error');
    }
  };

  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  const handleNotificationSettingsSave = async () => {
    setSavingNotifications(true);
    try {
      await usersAPI.updateNotificationPreferences({
        notify_email_reminders: notificationSettings.emailReminders,
        notify_task_assignments: notificationSettings.taskNotifications,
        notify_overdue_alerts: notificationSettings.overdueAlerts,
        notify_weekly_reports: notificationSettings.weeklyReports,
      });
      showSnackbar('Notification preferences saved', 'success');
    } catch (error) {
      console.error('Error saving notification settings:', error);
      showSnackbar('Failed to save notification settings', 'error');
    } finally {
      setSavingNotifications(false);
    }
  };

  const handlePasswordChange = async () => {
    // Validation
    if (!securitySettings.currentPassword || !securitySettings.newPassword || !securitySettings.confirmPassword) {
      showSnackbar('Please fill in all password fields', 'error');
      return;
    }

    if (securitySettings.newPassword !== securitySettings.confirmPassword) {
      showSnackbar('New passwords do not match', 'error');
      return;
    }

    if (securitySettings.newPassword.length < 8) {
      showSnackbar('New password must be at least 8 characters long', 'error');
      return;
    }

    setChangingPassword(true);
    try {
      await usersAPI.changePassword({
        current_password: securitySettings.currentPassword,
        new_password: securitySettings.newPassword,
      });
      showSnackbar('Password changed successfully', 'success');
      setSecuritySettings({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error) {
      showSnackbar(error.response?.data?.error || 'Failed to change password', 'error');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleOpenTestEmailDialog = (account) => {
    setTestingAccount(account);
    setTestEmailAddress('');
    setTestEmailDialog(true);
  };

  const handleCloseTestEmailDialog = () => {
    setTestEmailDialog(false);
    setTestingAccount(null);
    setTestEmailAddress('');
  };

  const handleSendTestEmail = async () => {
    if (!testEmailAddress) {
      showSnackbar('Please enter a recipient email address', 'warning');
      return;
    }

    if (!testingAccount) {
      showSnackbar('No email account selected', 'error');
      return;
    }

    setSendingTestEmail(true);
    try {
      await organizationEmailsAPI.testEmail(testingAccount.id, testEmailAddress);
      showSnackbar('Test email sent successfully! Check inbox.', 'success');
      handleCloseTestEmailDialog();
    } catch (error) {
      showSnackbar(
        error.response?.data?.error || 'Failed to send test email',
        'error'
      );
    } finally {
      setSendingTestEmail(false);
    }
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

  return (
    <Container maxWidth="xl">
      <Box sx={{ mb: 4 }}>
        {/* Header */}
        <Card
          sx={{
            background: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
            color: '#333',
            mb: 3,
          }}
        >
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <SettingsIcon sx={{ fontSize: 40, color: 'primary.main' }} />
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 600, color: 'primary.main' }}>
                  Settings
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.8, mt: 0.5 }}>
                  Manage your organization and application preferences
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>

        {/* Tabs Navigation */}
        <Paper sx={{ borderRadius: 3, mb: 3 }}>
          <Tabs
            value={tabValue}
            onChange={(e, newValue) => setTabValue(newValue)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ borderBottom: 1, borderColor: 'divider' }}
          >
            <Tab icon={<BusinessIcon />} label="Organization" iconPosition="start" />
            <Tab icon={<EmailIcon />} label="Email Accounts" iconPosition="start" />
            <Tab icon={<NotificationsIcon />} label="Notifications" iconPosition="start" />
            <Tab icon={<SecurityIcon />} label="Security" iconPosition="start" />
          </Tabs>
        </Paper>

        {/* Organization Tab */}
        <TabPanel value={tabValue} index={0}>
          {loadingOrg ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
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
                        value={orgFormData.name}
                        onChange={handleOrgChange('name')}
                        disabled={!canEdit}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Firm Name (Display Name)"
                        value={orgFormData.firm_name}
                        onChange={handleOrgChange('firm_name')}
                        disabled={!canEdit}
                        placeholder="Name to display on documents"
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Email"
                        type="email"
                        value={orgFormData.email}
                        onChange={handleOrgChange('email')}
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
                        value={orgFormData.phone}
                        onChange={handleOrgChange('phone')}
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
                        value={orgFormData.address}
                        onChange={handleOrgChange('address')}
                        disabled={!canEdit}
                        multiline
                        rows={2}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="City"
                        value={orgFormData.city}
                        onChange={handleOrgChange('city')}
                        disabled={!canEdit}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="State"
                        value={orgFormData.state}
                        onChange={handleOrgChange('state')}
                        disabled={!canEdit}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Country"
                        value={orgFormData.country}
                        onChange={handleOrgChange('country')}
                        disabled={!canEdit}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Pincode"
                        value={orgFormData.pincode}
                        onChange={handleOrgChange('pincode')}
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
                        value={orgFormData.gstin}
                        onChange={handleOrgChange('gstin')}
                        disabled={!canEdit}
                        placeholder="22AAAAA0000A1Z5"
                        helperText="15-digit GST Identification Number"
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="PAN"
                        value={orgFormData.pan}
                        onChange={handleOrgChange('pan')}
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
                    startIcon={savingOrg ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                    onClick={handleSaveOrg}
                    disabled={savingOrg}
                    sx={{ mt: 1 }}
                  >
                    {savingOrg ? 'Saving...' : 'Save Organization Settings'}
                  </Button>
                </Box>
              )}
            </>
          )}
        </TabPanel>

        {/* Email Accounts Tab */}
        <TabPanel value={tabValue} index={1}>
          <Card sx={{ borderRadius: 3, boxShadow: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <EmailIcon color="primary" />
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Email Accounts
                  </Typography>
                </Box>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={() => handleOpenEmailAccountDialog()}
                >
                  Add Email
                </Button>
              </Box>

              <Alert severity="info" sx={{ mb: 2 }}>
                Configure multiple email addresses for different work types. Each work type can use a specific email for sending reminders.
              </Alert>

              {loadingEmailAccounts ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress />
                </Box>
              ) : emailAccounts.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography color="text.secondary">No email accounts configured yet</Typography>
                  <Button
                    variant="outlined"
                    startIcon={<AddIcon />}
                    onClick={() => handleOpenEmailAccountDialog()}
                    sx={{ mt: 2 }}
                  >
                    Add Your First Email Account
                  </Button>
                </Box>
              ) : (
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: '#f8fafc' }}>
                        <TableCell>Email Address</TableCell>
                        <TableCell>Display Name</TableCell>
                        <TableCell align="center">SMTP</TableCell>
                        <TableCell align="center">Default</TableCell>
                        <TableCell align="center">Status</TableCell>
                        <TableCell align="center">Work Types</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {emailAccounts.map((account) => (
                        <TableRow key={account.id} hover>
                          <TableCell>{account.email_address}</TableCell>
                          <TableCell>{account.display_name || '-'}</TableCell>
                          <TableCell align="center">
                            <Chip
                              label={account.use_custom_smtp ? 'Custom' : 'Default'}
                              color={account.use_custom_smtp ? 'info' : 'default'}
                              size="small"
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell align="center">
                            <IconButton
                              size="small"
                              onClick={() => !account.is_default && handleSetDefaultEmail(account.id)}
                              color={account.is_default ? 'warning' : 'default'}
                            >
                              {account.is_default ? <StarIcon /> : <StarBorderIcon />}
                            </IconButton>
                          </TableCell>
                          <TableCell align="center">
                            <Chip
                              label={account.is_active ? 'Active' : 'Inactive'}
                              color={account.is_active ? 'success' : 'default'}
                              size="small"
                            />
                          </TableCell>
                          <TableCell align="center">
                            <Chip
                              label={account.work_types_count || 0}
                              size="small"
                              color="primary"
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell align="right">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => handleOpenTestEmailDialog(account)}
                              title="Send Test Email"
                            >
                              <SendIcon fontSize="small" />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => handleOpenEmailAccountDialog(account)}
                              title="Edit"
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDeleteEmailAccount(account.id)}
                              disabled={account.is_default}
                              title="Delete"
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </TabPanel>

        {/* Notifications Tab */}
        <TabPanel value={tabValue} index={2}>
          <Card sx={{ borderRadius: 3, boxShadow: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                <NotificationsIcon color="primary" />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Notification Preferences
                </Typography>
              </Box>
              {loadingNotifications ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress />
                </Box>
              ) : (
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={notificationSettings.emailReminders}
                          onChange={(e) =>
                            setNotificationSettings({
                              ...notificationSettings,
                              emailReminders: e.target.checked,
                            })
                          }
                          color="primary"
                        />
                      }
                      label="Email Reminders for Due Tasks"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={notificationSettings.taskNotifications}
                          onChange={(e) =>
                            setNotificationSettings({
                              ...notificationSettings,
                              taskNotifications: e.target.checked,
                            })
                          }
                          color="primary"
                        />
                      }
                      label="Task Assignment Notifications"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={notificationSettings.overdueAlerts}
                          onChange={(e) =>
                            setNotificationSettings({
                              ...notificationSettings,
                              overdueAlerts: e.target.checked,
                            })
                          }
                          color="primary"
                        />
                      }
                      label="Overdue Task Alerts"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={notificationSettings.weeklyReports}
                          onChange={(e) =>
                            setNotificationSettings({
                              ...notificationSettings,
                              weeklyReports: e.target.checked,
                            })
                          }
                          color="primary"
                        />
                      }
                      label="Weekly Summary Reports"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Button
                      variant="contained"
                      startIcon={savingNotifications ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                      onClick={handleNotificationSettingsSave}
                      disabled={savingNotifications}
                      sx={{ mt: 1 }}
                    >
                      {savingNotifications ? 'Saving...' : 'Save Preferences'}
                    </Button>
                  </Grid>
                </Grid>
              )}
            </CardContent>
          </Card>
        </TabPanel>

        {/* Security Tab */}
        <TabPanel value={tabValue} index={3}>
          <Card sx={{ borderRadius: 3, boxShadow: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                <SecurityIcon color="primary" />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Change Password
                </Typography>
              </Box>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    type="password"
                    label="Current Password"
                    value={securitySettings.currentPassword}
                    onChange={(e) =>
                      setSecuritySettings({ ...securitySettings, currentPassword: e.target.value })
                    }
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    type="password"
                    label="New Password"
                    value={securitySettings.newPassword}
                    onChange={(e) =>
                      setSecuritySettings({ ...securitySettings, newPassword: e.target.value })
                    }
                    helperText="Minimum 8 characters"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    type="password"
                    label="Confirm New Password"
                    value={securitySettings.confirmPassword}
                    onChange={(e) =>
                      setSecuritySettings({ ...securitySettings, confirmPassword: e.target.value })
                    }
                    error={Boolean(securitySettings.confirmPassword && securitySettings.newPassword !== securitySettings.confirmPassword)}
                    helperText={securitySettings.confirmPassword && securitySettings.newPassword !== securitySettings.confirmPassword ? 'Passwords do not match' : ''}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Button
                    variant="contained"
                    startIcon={changingPassword ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                    onClick={handlePasswordChange}
                    disabled={
                      changingPassword ||
                      !securitySettings.currentPassword ||
                      !securitySettings.newPassword ||
                      !securitySettings.confirmPassword ||
                      securitySettings.newPassword !== securitySettings.confirmPassword
                    }
                    sx={{ mt: 1 }}
                  >
                    {changingPassword ? 'Changing...' : 'Change Password'}
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </TabPanel>
      </Box>

      {/* Email Account Dialog */}
      <Dialog open={emailAccountDialog} onClose={handleCloseEmailAccountDialog} maxWidth="md" fullWidth>
        <DialogTitle sx={{ bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <EmailIcon color="primary" />
            {editingEmailAccount ? 'Edit Email Account' : 'Add Email Account'}
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Grid container spacing={2} sx={{ mt: 0 }}>
            {/* Basic Information */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: 'primary.main' }}>
                Basic Information
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Email Address"
                type="email"
                required
                value={emailAccountForm.email_address}
                onChange={(e) => setEmailAccountForm({ ...emailAccountForm, email_address: e.target.value })}
                placeholder="gst@yourfirm.com"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Display Name"
                value={emailAccountForm.display_name}
                onChange={(e) => setEmailAccountForm({ ...emailAccountForm, display_name: e.target.value })}
                placeholder="GST Department"
                helperText="Friendly name (e.g., 'GST Team')"
              />
            </Grid>
            <Grid item xs={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={emailAccountForm.is_active}
                    onChange={(e) => setEmailAccountForm({ ...emailAccountForm, is_active: e.target.checked })}
                    color="primary"
                  />
                }
                label="Active"
              />
            </Grid>
            <Grid item xs={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={emailAccountForm.is_default}
                    onChange={(e) => setEmailAccountForm({ ...emailAccountForm, is_default: e.target.checked })}
                    color="warning"
                  />
                }
                label="Set as default"
              />
            </Grid>

            {/* SMTP Configuration */}
            <Grid item xs={12}>
              <Box sx={{ borderTop: '1px solid #e2e8f0', pt: 2, mt: 1 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={emailAccountForm.use_custom_smtp}
                      onChange={(e) => setEmailAccountForm({ ...emailAccountForm, use_custom_smtp: e.target.checked })}
                      color="primary"
                    />
                  }
                  label={
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'primary.main' }}>
                      Use Custom SMTP Settings
                    </Typography>
                  }
                />
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', ml: 6 }}>
                  Enable to configure specific SMTP server for this email account
                </Typography>
              </Box>
            </Grid>

            {emailAccountForm.use_custom_smtp && (
              <>
                <Grid item xs={12}>
                  <Alert severity="info" sx={{ mb: 1 }}>
                    Configure SMTP settings to send emails from this account. For Gmail, use App Passwords.
                  </Alert>
                </Grid>
                <Grid item xs={12} md={8}>
                  <TextField
                    fullWidth
                    label="SMTP Host"
                    value={emailAccountForm.smtp_host}
                    onChange={(e) => setEmailAccountForm({ ...emailAccountForm, smtp_host: e.target.value })}
                    placeholder="smtp.gmail.com"
                    helperText="e.g., smtp.gmail.com, smtp.office365.com"
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="SMTP Port"
                    type="number"
                    value={emailAccountForm.smtp_port}
                    onChange={(e) => setEmailAccountForm({ ...emailAccountForm, smtp_port: parseInt(e.target.value) || 587 })}
                    helperText="Usually 587 (TLS) or 465 (SSL)"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="SMTP Username"
                    value={emailAccountForm.smtp_username}
                    onChange={(e) => setEmailAccountForm({ ...emailAccountForm, smtp_username: e.target.value })}
                    placeholder="your-email@gmail.com"
                    helperText="Usually your email address"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="SMTP Password"
                    type="password"
                    value={emailAccountForm.smtp_password}
                    onChange={(e) => setEmailAccountForm({ ...emailAccountForm, smtp_password: e.target.value })}
                    placeholder={editingEmailAccount ? '••••••••' : ''}
                    helperText={editingEmailAccount ? 'Leave blank to keep existing password' : 'For Gmail, use App Password'}
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={emailAccountForm.smtp_use_tls}
                        onChange={(e) => setEmailAccountForm({ ...emailAccountForm, smtp_use_tls: e.target.checked })}
                        color="primary"
                      />
                    }
                    label="Use TLS Encryption"
                  />
                </Grid>
              </>
            )}
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2, bgcolor: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
          <Button onClick={handleCloseEmailAccountDialog}>Cancel</Button>
          <Button
            onClick={handleSaveEmailAccount}
            variant="contained"
            disabled={!emailAccountForm.email_address}
          >
            {editingEmailAccount ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Test Email Dialog */}
      <Dialog open={testEmailDialog} onClose={handleCloseTestEmailDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SendIcon color="primary" />
            <Typography variant="h6">Send Test Email</Typography>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          {testingAccount && (
            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="body2">
                <strong>From:</strong> {testingAccount.email_address}
                {testingAccount.use_custom_smtp && (
                  <Chip label="Custom SMTP" size="small" sx={{ ml: 1 }} />
                )}
              </Typography>
            </Alert>
          )}
          <TextField
            fullWidth
            label="Recipient Email Address"
            type="email"
            value={testEmailAddress}
            onChange={(e) => setTestEmailAddress(e.target.value)}
            placeholder="your-email@example.com"
            helperText="Enter the email address where you want to receive the test email"
            autoFocus
          />
        </DialogContent>
        <DialogActions sx={{ p: 2, bgcolor: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
          <Button onClick={handleCloseTestEmailDialog} disabled={sendingTestEmail}>
            Cancel
          </Button>
          <Button
            onClick={handleSendTestEmail}
            variant="contained"
            disabled={!testEmailAddress || sendingTestEmail}
            startIcon={sendingTestEmail ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
          >
            {sendingTestEmail ? 'Sending...' : 'Send Test Email'}
          </Button>
        </DialogActions>
      </Dialog>

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
