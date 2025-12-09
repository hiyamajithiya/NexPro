import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Alert,
  Grid,
  Avatar,
  Paper,
  TextField,
  Button,
  Divider,
  Switch,
  FormControlLabel,
  Chip,
  InputAdornment,
  IconButton,
  Tabs,
  Tab,
  Tooltip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  LinearProgress,
} from '@mui/material';
import {
  Settings,
  Save,
  Business,
  People,
  AccessTime,
  Email,
  Security,
  Tune,
  Visibility,
  VisibilityOff,
  Send,
  CheckCircle,
  Error as ErrorIcon,
  Google,
  Info,
  ContentCopy,
  Speed,
  Cloud,
} from '@mui/icons-material';
import { platformAdminAPI } from '../../services/api';

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

export default function PlatformSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [stats, setStats] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showGoogleSecret, setShowGoogleSecret] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const [copied, setCopied] = useState(false);

  // Platform settings state - maps to backend PlatformSettings model
  const [settings, setSettings] = useState({
    platform_name: 'NexPro',
    support_email: 'support@nexpro.com',
    enable_signups: true,
    maintenance_mode: false,
    default_trial_days: 30,
    max_free_users: 1,
    max_free_clients: 10,
    require_email_verification: true,
    allow_password_reset: true,
    // Google OAuth Settings
    google_client_id: '',
    google_client_secret: '',
    google_client_secret_set: false,
    google_oauth_enabled: false,
    // Email Provider Settings
    email_provider: 'SMTP',
    // SMTP Settings
    smtp_host: '',
    smtp_port: 587,
    smtp_username: '',
    smtp_password: '',
    smtp_password_set: false,
    smtp_use_tls: true,
    smtp_use_ssl: false,
    smtp_from_email: '',
    smtp_from_name: '',
    smtp_enabled: false,
    // SendGrid Settings
    sendgrid_api_key: '',
    sendgrid_api_key_set: false,
    // AWS SES Settings
    aws_access_key_id: '',
    aws_secret_access_key: '',
    aws_secret_access_key_set: false,
    aws_region: 'us-east-1',
    // Rate Limiting
    email_daily_limit_per_org: 500,
    email_daily_limit_platform: 10000,
  });
  const [showSendGridKey, setShowSendGridKey] = useState(false);
  const [showAwsSecret, setShowAwsSecret] = useState(false);
  const [emailUsage, setEmailUsage] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch stats, settings, and email usage in parallel
      const [statsRes, settingsRes, emailUsageRes] = await Promise.all([
        platformAdminAPI.getStats(),
        platformAdminAPI.getSettings(),
        platformAdminAPI.getEmailUsage().catch(() => ({ data: null }))
      ]);
      setStats(statsRes.data);
      setSettings(prev => ({
        ...prev,
        ...settingsRes.data,
        smtp_password: '',
        google_client_secret: '',
        sendgrid_api_key: '',
        aws_secret_access_key: ''
      }));
      setEmailUsage(emailUsageRes.data);
    } catch (err) {
      setError('Failed to load platform data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const dataToSave = {
        platform_name: settings.platform_name,
        support_email: settings.support_email,
        enable_signups: settings.enable_signups,
        maintenance_mode: settings.maintenance_mode,
        default_trial_days: settings.default_trial_days,
        max_free_users: settings.max_free_users,
        max_free_clients: settings.max_free_clients,
        require_email_verification: settings.require_email_verification,
        allow_password_reset: settings.allow_password_reset,
        // Google OAuth Settings
        google_client_id: settings.google_client_id,
        google_oauth_enabled: settings.google_oauth_enabled,
        // Email Provider Settings
        email_provider: settings.email_provider,
        // SMTP Settings
        smtp_host: settings.smtp_host,
        smtp_port: settings.smtp_port,
        smtp_username: settings.smtp_username,
        smtp_use_tls: settings.smtp_use_tls,
        smtp_use_ssl: settings.smtp_use_ssl,
        smtp_from_email: settings.smtp_from_email,
        smtp_from_name: settings.smtp_from_name,
        smtp_enabled: settings.smtp_enabled,
        // AWS SES Settings
        aws_access_key_id: settings.aws_access_key_id,
        aws_region: settings.aws_region,
        // Rate Limiting
        email_daily_limit_per_org: settings.email_daily_limit_per_org,
        email_daily_limit_platform: settings.email_daily_limit_platform,
      };

      // Only include passwords/secrets if they were changed
      if (settings.smtp_password) {
        dataToSave.smtp_password = settings.smtp_password;
      }
      if (settings.google_client_secret) {
        dataToSave.google_client_secret = settings.google_client_secret;
      }
      if (settings.sendgrid_api_key) {
        dataToSave.sendgrid_api_key = settings.sendgrid_api_key;
      }
      if (settings.aws_secret_access_key) {
        dataToSave.aws_secret_access_key = settings.aws_secret_access_key;
      }

      const response = await platformAdminAPI.updateSettings(dataToSave);
      setSettings(prev => ({
        ...prev,
        ...response.data,
        smtp_password: '',
        google_client_secret: '',
        sendgrid_api_key: '',
        aws_secret_access_key: ''
      }));
      setSuccess('Platform settings saved successfully');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleTestEmail = async () => {
    if (!testEmail) {
      setError('Please enter a test email address');
      return;
    }

    setTesting(true);
    setError('');
    setSuccess('');

    try {
      await platformAdminAPI.testSmtp({ recipient_email: testEmail });
      setSuccess(`Test email sent successfully to ${testEmail}`);
      setTestEmail('');
    } catch (err) {
      setError(err.response?.data?.detail || err.response?.data?.error || 'Failed to send test email');
    } finally {
      setTesting(false);
    }
  };

  const handleCopyRedirectUri = () => {
    const redirectUri = `${window.location.origin}/dashboard/google-sync`;
    navigator.clipboard.writeText(redirectUri).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
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
                <Settings sx={{ fontSize: 28 }} />
              </Avatar>
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 600 }}>
                  Platform Settings
                </Typography>
                <Typography variant="body1" sx={{ opacity: 0.9, mt: 0.5 }}>
                  Configure platform-wide settings and preferences
                </Typography>
              </Box>
            </Box>
            <Button
              variant="contained"
              startIcon={<Save />}
              onClick={handleSave}
              disabled={saving}
              sx={{
                bgcolor: 'rgba(255,255,255,0.2)',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
              }}
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </Button>
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

      {/* Platform Overview Stats */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 3, boxShadow: 2 }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Organizations
                  </Typography>
                  <Typography variant="h4" fontWeight={700}>
                    {stats?.organizations?.total || 0}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#f0f9ff', width: 48, height: 48 }}>
                  <Business sx={{ color: '#3b82f6' }} />
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
                    Total Users
                  </Typography>
                  <Typography variant="h4" fontWeight={700}>
                    {stats?.users?.total || 0}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#f0fdf4', width: 48, height: 48 }}>
                  <People sx={{ color: '#10b981' }} />
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
                  <Typography variant="h4" fontWeight={700}>
                    {stats?.organizations?.trial || 0}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#fffbeb', width: 48, height: 48 }}>
                  <AccessTime sx={{ color: '#f59e0b' }} />
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
                    Platform Status
                  </Typography>
                  <Chip
                    label={settings.maintenance_mode ? 'Maintenance' : 'Online'}
                    color={settings.maintenance_mode ? 'warning' : 'success'}
                    size="small"
                    sx={{ mt: 0.5 }}
                  />
                </Box>
                <Avatar sx={{ bgcolor: settings.maintenance_mode ? '#fef3c7' : '#dcfce7', width: 48, height: 48 }}>
                  <Tune sx={{ color: settings.maintenance_mode ? '#f59e0b' : '#10b981' }} />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabbed Settings Interface */}
      <Paper sx={{ borderRadius: 3, boxShadow: 2 }}>
        <Tabs
          value={activeTab}
          onChange={(e, newValue) => setActiveTab(newValue)}
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            px: 2,
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 500,
              minHeight: 56,
            },
          }}
        >
          <Tab icon={<Tune sx={{ fontSize: 20 }} />} iconPosition="start" label="General" />
          <Tab icon={<Security sx={{ fontSize: 20 }} />} iconPosition="start" label="Security" />
          <Tab icon={<Google sx={{ fontSize: 20 }} />} iconPosition="start" label="Google OAuth" />
          <Tab icon={<Email sx={{ fontSize: 20 }} />} iconPosition="start" label="SMTP Email" />
        </Tabs>

        <Box sx={{ p: 3 }}>
          {/* General Settings Tab */}
          <TabPanel value={activeTab} index={0}>
            <Grid container spacing={4}>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Tune fontSize="small" color="primary" /> Platform Information
                </Typography>
                <TextField
                  fullWidth
                  label="Platform Name"
                  value={settings.platform_name || ''}
                  onChange={(e) => setSettings({ ...settings, platform_name: e.target.value })}
                  sx={{ mb: 3 }}
                />
                <TextField
                  fullWidth
                  label="Support Email"
                  value={settings.support_email || ''}
                  onChange={(e) => setSettings({ ...settings, support_email: e.target.value })}
                  sx={{ mb: 3 }}
                />
                <Divider sx={{ my: 2 }} />
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.enable_signups || false}
                      onChange={(e) => setSettings({ ...settings, enable_signups: e.target.checked })}
                      color="primary"
                    />
                  }
                  label="Allow New Signups"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.maintenance_mode || false}
                      onChange={(e) => setSettings({ ...settings, maintenance_mode: e.target.checked })}
                      color="warning"
                    />
                  }
                  label="Maintenance Mode"
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AccessTime fontSize="small" color="primary" /> Trial & Plan Limits
                </Typography>
                <TextField
                  fullWidth
                  type="number"
                  label="Default Trial Period (days)"
                  value={settings.default_trial_days || 30}
                  onChange={(e) => setSettings({ ...settings, default_trial_days: parseInt(e.target.value) || 0 })}
                  inputProps={{ min: 1, max: 365 }}
                  helperText="Default trial period for new organizations"
                  sx={{ mb: 3 }}
                />
                <TextField
                  fullWidth
                  type="number"
                  label="Max Free Users"
                  value={settings.max_free_users || 1}
                  onChange={(e) => setSettings({ ...settings, max_free_users: parseInt(e.target.value) || 0 })}
                  inputProps={{ min: 1 }}
                  helperText="Maximum users allowed in free plan"
                  sx={{ mb: 3 }}
                />
                <TextField
                  fullWidth
                  type="number"
                  label="Max Free Clients"
                  value={settings.max_free_clients || 10}
                  onChange={(e) => setSettings({ ...settings, max_free_clients: parseInt(e.target.value) || 0 })}
                  inputProps={{ min: 1 }}
                  helperText="Maximum clients allowed in free plan"
                />
              </Grid>
            </Grid>
          </TabPanel>

          {/* Security Settings Tab */}
          <TabPanel value={activeTab} index={1}>
            <Grid container spacing={4}>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Security fontSize="small" color="primary" /> Authentication Settings
                </Typography>

                <Box sx={{ mb: 3 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.require_email_verification || false}
                        onChange={(e) => setSettings({ ...settings, require_email_verification: e.target.checked })}
                        color="primary"
                      />
                    }
                    label="Require Email Verification"
                  />
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ ml: 6 }}>
                    New users must verify their email before accessing the platform
                  </Typography>
                </Box>

                <Box sx={{ mb: 3 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.allow_password_reset || false}
                        onChange={(e) => setSettings({ ...settings, allow_password_reset: e.target.checked })}
                        color="primary"
                      />
                    }
                    label="Allow Password Reset"
                  />
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ ml: 6 }}>
                    Allow users to reset their password via email OTP
                  </Typography>
                </Box>
              </Grid>

              <Grid item xs={12} md={6}>
                <Alert severity="info" icon={<Info />}>
                  <Typography variant="body2" sx={{ fontWeight: 500, mb: 1 }}>
                    Security Recommendations
                  </Typography>
                  <Typography variant="caption" component="div">
                    <ul style={{ margin: 0, paddingLeft: 16 }}>
                      <li>Enable email verification to prevent spam accounts</li>
                      <li>Configure SMTP to enable password reset functionality</li>
                      <li>Regularly review user access and permissions</li>
                    </ul>
                  </Typography>
                </Alert>
              </Grid>
            </Grid>
          </TabPanel>

          {/* Google OAuth Tab */}
          <TabPanel value={activeTab} index={2}>
            <Grid container spacing={4}>
              <Grid item xs={12} md={6}>
                <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
                  <Typography variant="h6" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Google sx={{ color: '#4285f4' }} /> Google OAuth Configuration
                  </Typography>
                  <Chip
                    icon={settings.google_oauth_enabled ? <CheckCircle /> : <ErrorIcon />}
                    label={settings.google_oauth_enabled ? 'Enabled' : 'Disabled'}
                    color={settings.google_oauth_enabled ? 'success' : 'default'}
                    size="small"
                  />
                </Box>

                <Alert severity="info" sx={{ mb: 3 }}>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>Required for Google Sync Hub:</strong> Enables users to sync tasks, calendar, drive, and gmail.
                  </Typography>
                  <Typography variant="caption">
                    Get credentials from{' '}
                    <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer">
                      Google Cloud Console
                    </a>
                  </Typography>
                </Alert>

                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.google_oauth_enabled || false}
                      onChange={(e) => setSettings({ ...settings, google_oauth_enabled: e.target.checked })}
                      color="primary"
                    />
                  }
                  label="Enable Google OAuth"
                  sx={{ mb: 3 }}
                />

                <TextField
                  fullWidth
                  label="Google Client ID"
                  placeholder="your-client-id.apps.googleusercontent.com"
                  value={settings.google_client_id || ''}
                  onChange={(e) => setSettings({ ...settings, google_client_id: e.target.value })}
                  disabled={!settings.google_oauth_enabled}
                  sx={{ mb: 3 }}
                  helperText="OAuth 2.0 Client ID from Google Cloud Console"
                />

                <TextField
                  fullWidth
                  type={showGoogleSecret ? 'text' : 'password'}
                  label="Google Client Secret"
                  placeholder={settings.google_client_secret_set ? '••••••••' : 'Enter client secret'}
                  value={settings.google_client_secret || ''}
                  onChange={(e) => setSettings({ ...settings, google_client_secret: e.target.value })}
                  disabled={!settings.google_oauth_enabled}
                  helperText={settings.google_client_secret_set ? 'Secret is set. Leave blank to keep current.' : 'OAuth 2.0 Client Secret'}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowGoogleSecret(!showGoogleSecret)}
                          edge="end"
                          disabled={!settings.google_oauth_enabled}
                        >
                          {showGoogleSecret ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 3, bgcolor: 'grey.50', borderRadius: 2 }}>
                  <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                    Setup Instructions
                  </Typography>
                  <Typography variant="body2" color="text.secondary" component="div">
                    <ol style={{ margin: 0, paddingLeft: 20, lineHeight: 2 }}>
                      <li>Create a project in Google Cloud Console</li>
                      <li>Enable APIs: Google Tasks, Calendar, Drive, Gmail</li>
                      <li>Go to Credentials → Create OAuth 2.0 Client ID</li>
                      <li>Select "Web application" as application type</li>
                      <li>Add authorized redirect URI:</li>
                    </ol>
                  </Typography>
                  <Box sx={{
                    mt: 1,
                    ml: 3,
                    p: 1,
                    pl: 1.5,
                    bgcolor: 'white',
                    borderRadius: 1,
                    border: '1px solid',
                    borderColor: 'divider',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 1
                  }}>
                    <Typography sx={{ fontFamily: 'monospace', fontSize: '0.85rem', wordBreak: 'break-all' }}>
                      {window.location.origin}/dashboard/google-sync
                    </Typography>
                    <Tooltip title={copied ? 'Copied!' : 'Copy to clipboard'}>
                      <IconButton
                        size="small"
                        onClick={handleCopyRedirectUri}
                        color={copied ? 'success' : 'default'}
                      >
                        {copied ? <CheckCircle fontSize="small" /> : <ContentCopy fontSize="small" />}
                      </IconButton>
                    </Tooltip>
                  </Box>
                  <Typography variant="body2" color="text.secondary" component="div" sx={{ mt: 2 }}>
                    <ol start={6} style={{ margin: 0, paddingLeft: 20, lineHeight: 2 }}>
                      <li>Copy Client ID and Client Secret</li>
                      <li>Paste them in the fields on the left</li>
                      <li>Enable Google OAuth and save settings</li>
                    </ol>
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          </TabPanel>

          {/* Email Configuration Tab */}
          <TabPanel value={activeTab} index={3}>
            {/* Email Usage Stats Banner */}
            {emailUsage && (
              <Paper sx={{ p: 2, mb: 3, bgcolor: 'grey.50', borderRadius: 2 }}>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} md={4}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Speed color="primary" />
                      <Typography variant="subtitle2">Today's Email Usage</Typography>
                    </Box>
                    <Box sx={{ mt: 1 }}>
                      <Box display="flex" justifyContent="space-between" mb={0.5}>
                        <Typography variant="body2">{emailUsage.today?.sent || 0} / {emailUsage.today?.limit || 'unlimited'}</Typography>
                        <Typography variant="body2" color="text.secondary">{emailUsage.today?.percentage || 0}%</Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={Math.min(emailUsage.today?.percentage || 0, 100)}
                        sx={{
                          height: 8,
                          borderRadius: 4,
                          bgcolor: 'grey.200',
                          '& .MuiLinearProgress-bar': {
                            borderRadius: 4,
                            bgcolor: emailUsage.today?.percentage > 80 ? 'error.main' : emailUsage.today?.percentage > 50 ? 'warning.main' : 'success.main',
                          }
                        }}
                      />
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Typography variant="body2" color="text.secondary">Provider</Typography>
                    <Chip
                      label={settings.email_provider || 'SMTP'}
                      size="small"
                      color="primary"
                      sx={{ mt: 0.5 }}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Typography variant="body2" color="text.secondary">30-Day Total</Typography>
                    <Typography variant="h6" fontWeight={600}>{emailUsage.period?.total_sent || 0} emails</Typography>
                  </Grid>
                </Grid>
              </Paper>
            )}

            <Grid container spacing={4}>
              {/* Email Provider Selection */}
              <Grid item xs={12}>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Cloud color="primary" /> Email Provider
                </Typography>
                <FormControl sx={{ minWidth: 300, mb: 2 }}>
                  <InputLabel>Email Provider</InputLabel>
                  <Select
                    value={settings.email_provider || 'SMTP'}
                    label="Email Provider"
                    onChange={(e) => setSettings({ ...settings, email_provider: e.target.value })}
                  >
                    <MenuItem value="SMTP">SMTP (Gmail, Custom Server)</MenuItem>
                    <MenuItem value="SENDGRID">SendGrid (Recommended for Scale)</MenuItem>
                    <MenuItem value="SES">Amazon SES (High Volume)</MenuItem>
                  </Select>
                </FormControl>
                <Alert severity="info" sx={{ mb: 2 }}>
                  {settings.email_provider === 'SMTP' && 'Gmail SMTP has a limit of 500 emails/day. Consider SendGrid or SES for higher volumes.'}
                  {settings.email_provider === 'SENDGRID' && 'SendGrid offers 100 free emails/day, with scalable paid plans starting at $15/month for 40,000 emails.'}
                  {settings.email_provider === 'SES' && 'Amazon SES costs ~$0.10 per 1,000 emails with no daily limits (after leaving sandbox).'}
                </Alert>
              </Grid>

              {/* SMTP Configuration */}
              {settings.email_provider === 'SMTP' && (
                <>
                  <Grid item xs={12} md={6}>
                    <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
                      <Typography variant="h6" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Email color="primary" /> SMTP Configuration
                      </Typography>
                      <Chip
                        icon={settings.smtp_enabled ? <CheckCircle /> : <ErrorIcon />}
                        label={settings.smtp_enabled ? 'Enabled' : 'Disabled'}
                        color={settings.smtp_enabled ? 'success' : 'default'}
                        size="small"
                      />
                    </Box>

                    <FormControlLabel
                      control={
                        <Switch
                          checked={settings.smtp_enabled || false}
                          onChange={(e) => setSettings({ ...settings, smtp_enabled: e.target.checked })}
                          color="primary"
                        />
                      }
                      label="Enable SMTP Email Sending"
                      sx={{ mb: 3 }}
                    />

                    <Grid container spacing={2} sx={{ mb: 2 }}>
                      <Grid item xs={8}>
                        <TextField
                          fullWidth
                          label="SMTP Host"
                          placeholder="smtp.gmail.com"
                          value={settings.smtp_host || ''}
                          onChange={(e) => setSettings({ ...settings, smtp_host: e.target.value })}
                          disabled={!settings.smtp_enabled}
                        />
                      </Grid>
                      <Grid item xs={4}>
                        <TextField
                          fullWidth
                          type="number"
                          label="Port"
                          value={settings.smtp_port || 587}
                          onChange={(e) => setSettings({ ...settings, smtp_port: parseInt(e.target.value) || 587 })}
                          disabled={!settings.smtp_enabled}
                        />
                      </Grid>
                    </Grid>

                    <TextField
                      fullWidth
                      label="SMTP Username"
                      placeholder="your-email@gmail.com"
                      value={settings.smtp_username || ''}
                      onChange={(e) => setSettings({ ...settings, smtp_username: e.target.value })}
                      disabled={!settings.smtp_enabled}
                      sx={{ mb: 2 }}
                    />

                    <TextField
                      fullWidth
                      type={showPassword ? 'text' : 'password'}
                      label="SMTP Password"
                      placeholder={settings.smtp_password_set ? '••••••••' : 'Enter password'}
                      value={settings.smtp_password || ''}
                      onChange={(e) => setSettings({ ...settings, smtp_password: e.target.value })}
                      disabled={!settings.smtp_enabled}
                      sx={{ mb: 2 }}
                      helperText={settings.smtp_password_set ? 'Password is set. Leave blank to keep current.' : 'Enter your SMTP password or app password'}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton onClick={() => setShowPassword(!showPassword)} edge="end" disabled={!settings.smtp_enabled}>
                              {showPassword ? <VisibilityOff /> : <Visibility />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                    />

                    <Box sx={{ mb: 2 }}>
                      <FormControlLabel
                        control={<Switch checked={settings.smtp_use_tls || false} onChange={(e) => setSettings({ ...settings, smtp_use_tls: e.target.checked, smtp_use_ssl: e.target.checked ? false : settings.smtp_use_ssl })} disabled={!settings.smtp_enabled} size="small" />}
                        label="Use TLS (Port 587)"
                      />
                      <FormControlLabel
                        control={<Switch checked={settings.smtp_use_ssl || false} onChange={(e) => setSettings({ ...settings, smtp_use_ssl: e.target.checked, smtp_use_tls: e.target.checked ? false : settings.smtp_use_tls })} disabled={!settings.smtp_enabled} size="small" />}
                        label="Use SSL (Port 465)"
                      />
                    </Box>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>Sender Information</Typography>
                    <TextField fullWidth label="From Email" placeholder="noreply@yourdomain.com" value={settings.smtp_from_email || ''} onChange={(e) => setSettings({ ...settings, smtp_from_email: e.target.value })} disabled={!settings.smtp_enabled} sx={{ mb: 2 }} />
                    <TextField fullWidth label="From Name" placeholder="NexPro Platform" value={settings.smtp_from_name || ''} onChange={(e) => setSettings({ ...settings, smtp_from_name: e.target.value })} disabled={!settings.smtp_enabled} sx={{ mb: 3 }} />

                    <Divider sx={{ my: 2 }} />

                    <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>Test Email</Typography>
                    <Box display="flex" gap={1}>
                      <TextField fullWidth label="Test Recipient" placeholder="test@example.com" value={testEmail} onChange={(e) => setTestEmail(e.target.value)} disabled={!settings.smtp_enabled || testing} size="small" />
                      <Button variant="contained" startIcon={testing ? <CircularProgress size={16} /> : <Send />} onClick={handleTestEmail} disabled={!settings.smtp_enabled || testing || !testEmail} sx={{ minWidth: 120 }}>
                        {testing ? 'Sending...' : 'Send'}
                      </Button>
                    </Box>
                  </Grid>
                </>
              )}

              {/* SendGrid Configuration */}
              {settings.email_provider === 'SENDGRID' && (
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Email color="primary" /> SendGrid Configuration
                  </Typography>

                  <TextField
                    fullWidth
                    type={showSendGridKey ? 'text' : 'password'}
                    label="SendGrid API Key"
                    placeholder={settings.sendgrid_api_key_set ? '••••••••' : 'SG.xxxxx'}
                    value={settings.sendgrid_api_key || ''}
                    onChange={(e) => setSettings({ ...settings, sendgrid_api_key: e.target.value })}
                    sx={{ mb: 2 }}
                    helperText={settings.sendgrid_api_key_set ? 'API key is set. Leave blank to keep current.' : 'Get your API key from SendGrid dashboard'}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton onClick={() => setShowSendGridKey(!showSendGridKey)} edge="end">
                            {showSendGridKey ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />

                  <TextField fullWidth label="From Email" placeholder="noreply@yourdomain.com" value={settings.smtp_from_email || ''} onChange={(e) => setSettings({ ...settings, smtp_from_email: e.target.value })} sx={{ mb: 2 }} helperText="Must be a verified sender in SendGrid" />
                  <TextField fullWidth label="From Name" placeholder="NexPro Platform" value={settings.smtp_from_name || ''} onChange={(e) => setSettings({ ...settings, smtp_from_name: e.target.value })} />
                </Grid>
              )}

              {/* Amazon SES Configuration */}
              {settings.email_provider === 'SES' && (
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Email color="primary" /> Amazon SES Configuration
                  </Typography>

                  <TextField fullWidth label="AWS Access Key ID" placeholder="AKIA..." value={settings.aws_access_key_id || ''} onChange={(e) => setSettings({ ...settings, aws_access_key_id: e.target.value })} sx={{ mb: 2 }} />

                  <TextField
                    fullWidth
                    type={showAwsSecret ? 'text' : 'password'}
                    label="AWS Secret Access Key"
                    placeholder={settings.aws_secret_access_key_set ? '••••••••' : 'Enter secret key'}
                    value={settings.aws_secret_access_key || ''}
                    onChange={(e) => setSettings({ ...settings, aws_secret_access_key: e.target.value })}
                    sx={{ mb: 2 }}
                    helperText={settings.aws_secret_access_key_set ? 'Secret key is set. Leave blank to keep current.' : ''}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton onClick={() => setShowAwsSecret(!showAwsSecret)} edge="end">
                            {showAwsSecret ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />

                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel>AWS Region</InputLabel>
                    <Select value={settings.aws_region || 'us-east-1'} label="AWS Region" onChange={(e) => setSettings({ ...settings, aws_region: e.target.value })}>
                      <MenuItem value="us-east-1">US East (N. Virginia)</MenuItem>
                      <MenuItem value="us-west-2">US West (Oregon)</MenuItem>
                      <MenuItem value="eu-west-1">EU (Ireland)</MenuItem>
                      <MenuItem value="ap-south-1">Asia Pacific (Mumbai)</MenuItem>
                      <MenuItem value="ap-southeast-1">Asia Pacific (Singapore)</MenuItem>
                    </Select>
                  </FormControl>

                  <TextField fullWidth label="From Email" placeholder="noreply@yourdomain.com" value={settings.smtp_from_email || ''} onChange={(e) => setSettings({ ...settings, smtp_from_email: e.target.value })} sx={{ mb: 2 }} helperText="Must be a verified identity in SES" />
                  <TextField fullWidth label="From Name" placeholder="NexPro Platform" value={settings.smtp_from_name || ''} onChange={(e) => setSettings({ ...settings, smtp_from_name: e.target.value })} />
                </Grid>
              )}

              {/* Rate Limiting Settings */}
              <Grid item xs={12} md={6}>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Speed color="primary" /> Rate Limiting
                </Typography>

                <TextField
                  fullWidth
                  type="number"
                  label="Daily Limit Per Organization"
                  value={settings.email_daily_limit_per_org || 500}
                  onChange={(e) => setSettings({ ...settings, email_daily_limit_per_org: parseInt(e.target.value) || 0 })}
                  sx={{ mb: 2 }}
                  helperText="Maximum emails each organization can send per day (0 = unlimited)"
                  inputProps={{ min: 0 }}
                />

                <TextField
                  fullWidth
                  type="number"
                  label="Daily Limit Platform-Wide"
                  value={settings.email_daily_limit_platform || 10000}
                  onChange={(e) => setSettings({ ...settings, email_daily_limit_platform: parseInt(e.target.value) || 0 })}
                  helperText="Maximum total emails across all organizations per day (0 = unlimited)"
                  inputProps={{ min: 0 }}
                />
              </Grid>
            </Grid>
          </TabPanel>
        </Box>
      </Paper>
    </Box>
  );
}
