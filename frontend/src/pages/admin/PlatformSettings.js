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
} from '@mui/icons-material';
import { platformAdminAPI } from '../../services/api';

export default function PlatformSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [stats, setStats] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [testEmail, setTestEmail] = useState('');

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
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch both stats and settings in parallel
      const [statsRes, settingsRes] = await Promise.all([
        platformAdminAPI.getStats(),
        platformAdminAPI.getSettings()
      ]);
      setStats(statsRes.data);
      setSettings(prev => ({ ...prev, ...settingsRes.data, smtp_password: '' }));
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
        // SMTP Settings
        smtp_host: settings.smtp_host,
        smtp_port: settings.smtp_port,
        smtp_username: settings.smtp_username,
        smtp_use_tls: settings.smtp_use_tls,
        smtp_use_ssl: settings.smtp_use_ssl,
        smtp_from_email: settings.smtp_from_email,
        smtp_from_name: settings.smtp_from_name,
        smtp_enabled: settings.smtp_enabled,
      };

      // Only include password if it was changed
      if (settings.smtp_password) {
        dataToSave.smtp_password = settings.smtp_password;
      }

      const response = await platformAdminAPI.updateSettings(dataToSave);
      setSettings(prev => ({ ...prev, ...response.data, smtp_password: '' }));
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

      {/* Platform Overview */}
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

      <Grid container spacing={3}>
        {/* General Settings */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, borderRadius: 3, boxShadow: 2 }}>
            <Box display="flex" alignItems="center" gap={2} mb={3}>
              <Tune color="primary" />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                General Settings
              </Typography>
            </Box>
            <Box>
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
            </Box>
          </Paper>
        </Grid>

        {/* Trial Settings */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, borderRadius: 3, boxShadow: 2 }}>
            <Box display="flex" alignItems="center" gap={2} mb={3}>
              <AccessTime color="primary" />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Trial & Plan Settings
              </Typography>
            </Box>
            <Box>
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
            </Box>
          </Paper>
        </Grid>

        {/* Security Settings */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, borderRadius: 3, boxShadow: 2 }}>
            <Box display="flex" alignItems="center" gap={2} mb={3}>
              <Security color="primary" />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Security Settings
              </Typography>
            </Box>
            <Box>
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
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2, ml: 4 }}>
                New users must verify their email before accessing the platform
              </Typography>
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
              <Typography variant="caption" color="text.secondary" display="block" sx={{ ml: 4 }}>
                Allow users to reset their password via email OTP
              </Typography>
            </Box>
          </Paper>
        </Grid>

        {/* SMTP Email Configuration */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, borderRadius: 3, boxShadow: 2 }}>
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
              <Box display="flex" alignItems="center" gap={2}>
                <Email color="primary" />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  SMTP Email Configuration
                </Typography>
              </Box>
              <Chip
                icon={settings.smtp_enabled ? <CheckCircle /> : <ErrorIcon />}
                label={settings.smtp_enabled ? 'Enabled' : 'Disabled'}
                color={settings.smtp_enabled ? 'success' : 'default'}
                size="small"
              />
            </Box>
            <Box>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.smtp_enabled || false}
                    onChange={(e) => setSettings({ ...settings, smtp_enabled: e.target.checked })}
                    color="primary"
                  />
                }
                label="Enable SMTP Email Sending"
                sx={{ mb: 2 }}
              />

              <Grid container spacing={2}>
                <Grid item xs={8}>
                  <TextField
                    fullWidth
                    label="SMTP Host"
                    placeholder="smtp.gmail.com"
                    value={settings.smtp_host || ''}
                    onChange={(e) => setSettings({ ...settings, smtp_host: e.target.value })}
                    disabled={!settings.smtp_enabled}
                    size="small"
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
                    size="small"
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
                size="small"
                sx={{ mt: 2 }}
              />

              <TextField
                fullWidth
                type={showPassword ? 'text' : 'password'}
                label="SMTP Password"
                placeholder={settings.smtp_password_set ? '••••••••' : 'Enter password'}
                value={settings.smtp_password || ''}
                onChange={(e) => setSettings({ ...settings, smtp_password: e.target.value })}
                disabled={!settings.smtp_enabled}
                size="small"
                sx={{ mt: 2 }}
                helperText={settings.smtp_password_set ? 'Password is set. Leave blank to keep current password.' : 'Enter your SMTP password or app password'}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                        disabled={!settings.smtp_enabled}
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              <Divider sx={{ my: 2 }} />

              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="From Email"
                    placeholder="noreply@yourdomain.com"
                    value={settings.smtp_from_email || ''}
                    onChange={(e) => setSettings({ ...settings, smtp_from_email: e.target.value })}
                    disabled={!settings.smtp_enabled}
                    size="small"
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="From Name"
                    placeholder="NexPro Platform"
                    value={settings.smtp_from_name || ''}
                    onChange={(e) => setSettings({ ...settings, smtp_from_name: e.target.value })}
                    disabled={!settings.smtp_enabled}
                    size="small"
                  />
                </Grid>
              </Grid>

              <Box sx={{ mt: 2 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.smtp_use_tls || false}
                      onChange={(e) => setSettings({
                        ...settings,
                        smtp_use_tls: e.target.checked,
                        smtp_use_ssl: e.target.checked ? false : settings.smtp_use_ssl
                      })}
                      disabled={!settings.smtp_enabled}
                      size="small"
                    />
                  }
                  label="Use TLS (Port 587)"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.smtp_use_ssl || false}
                      onChange={(e) => setSettings({
                        ...settings,
                        smtp_use_ssl: e.target.checked,
                        smtp_use_tls: e.target.checked ? false : settings.smtp_use_tls
                      })}
                      disabled={!settings.smtp_enabled}
                      size="small"
                    />
                  }
                  label="Use SSL (Port 465)"
                />
              </Box>

              <Divider sx={{ my: 2 }} />

              {/* Test Email Section */}
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                Test Email Configuration
              </Typography>
              <Box display="flex" gap={1}>
                <TextField
                  fullWidth
                  label="Test Recipient Email"
                  placeholder="test@example.com"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  disabled={!settings.smtp_enabled || testing}
                  size="small"
                />
                <Button
                  variant="outlined"
                  startIcon={testing ? <CircularProgress size={16} /> : <Send />}
                  onClick={handleTestEmail}
                  disabled={!settings.smtp_enabled || testing || !testEmail}
                  sx={{ minWidth: 120 }}
                >
                  {testing ? 'Sending...' : 'Send Test'}
                </Button>
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Save settings first, then send a test email to verify configuration
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
