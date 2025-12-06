import React, { useState, useEffect, useCallback } from 'react';
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
  Chip,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Speed,
  Warning,
  Error as ErrorIcon,
  CheckCircle,
  Refresh,
  TrendingUp,
  Storage,
  People,
  Save,
  Info,
} from '@mui/icons-material';
import { googleQuotaAPI } from '../../services/api';

export default function GoogleQuotaMonitor() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [summary, setSummary] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [history, setHistory] = useState([]);
  const [historyDays, setHistoryDays] = useState(7);

  // Quota settings form
  const [quotaSettings, setQuotaSettings] = useState({
    google_tasks_daily_quota: 50000,
    google_calendar_daily_quota: 1000000,
    google_drive_daily_quota: 1000000000,
    google_gmail_daily_quota: 1000000,
    quota_warning_threshold: 70,
    quota_critical_threshold: 90,
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [summaryRes, alertsRes, historyRes] = await Promise.all([
        googleQuotaAPI.getSummary(),
        googleQuotaAPI.getAlerts(),
        googleQuotaAPI.getHistory(historyDays),
      ]);

      setSummary(summaryRes.data);
      setAlerts(alertsRes.data.alerts || []);
      setHistory(historyRes.data.history || []);

      // Update quota settings from response
      if (summaryRes.data.quota_settings) {
        setQuotaSettings(summaryRes.data.quota_settings);
      }
    } catch (err) {
      setError('Failed to load quota data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [historyDays]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSaveQuotas = async () => {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      await googleQuotaAPI.updateQuotas(quotaSettings);
      setSuccess('Quota settings saved successfully');
      fetchData(); // Refresh data
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save quota settings');
    } finally {
      setSaving(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'critical':
        return 'error';
      case 'warning':
        return 'warning';
      default:
        return 'success';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'critical':
        return <ErrorIcon />;
      case 'warning':
        return <Warning />;
      default:
        return <CheckCircle />;
    }
  };

  const formatNumber = (num) => {
    if (num >= 1000000000) return `${(num / 1000000000).toFixed(1)}B`;
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num?.toString() || '0';
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
          background: 'linear-gradient(135deg, #1a73e8 0%, #4285f4 100%)',
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
                <Speed sx={{ fontSize: 28 }} />
              </Avatar>
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 600 }}>
                  Google API Quota Monitor
                </Typography>
                <Typography variant="body1" sx={{ opacity: 0.9, mt: 0.5 }}>
                  Monitor usage, manage quotas, and estimate tenant capacity
                </Typography>
              </Box>
            </Box>
            <Tooltip title="Refresh Data">
              <IconButton
                onClick={fetchData}
                sx={{ color: 'white' }}
              >
                <Refresh />
              </IconButton>
            </Tooltip>
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

      {/* Alerts Section */}
      {alerts.length > 0 && (
        <Alert
          severity={alerts.some(a => a.level === 'critical') ? 'error' : 'warning'}
          sx={{ mb: 3 }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
            {alerts.length} Alert{alerts.length > 1 ? 's' : ''} Active
          </Typography>
          {alerts.map((alert, idx) => (
            <Typography key={idx} variant="body2">
              • {alert.message}
            </Typography>
          ))}
        </Alert>
      )}

      {/* Summary Stats */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 3, boxShadow: 2 }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Today's Total Queries
                  </Typography>
                  <Typography variant="h4" fontWeight={700}>
                    {formatNumber(summary?.total_queries || 0)}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#e3f2fd', width: 48, height: 48 }}>
                  <TrendingUp sx={{ color: '#1976d2' }} />
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
                    Est. Tenant Capacity
                  </Typography>
                  <Typography variant="h4" fontWeight={700}>
                    {formatNumber(summary?.estimated_tenant_capacity || 0)}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#e8f5e9', width: 48, height: 48 }}>
                  <People sx={{ color: '#388e3c' }} />
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
                    Tasks API Usage
                  </Typography>
                  <Typography variant="h4" fontWeight={700}>
                    {summary?.apis?.TASKS?.percentage || 0}%
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#fff3e0', width: 48, height: 48 }}>
                  <Storage sx={{ color: '#f57c00' }} />
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
                    Active Alerts
                  </Typography>
                  <Chip
                    label={alerts.length === 0 ? 'All Clear' : `${alerts.length} Alert${alerts.length > 1 ? 's' : ''}`}
                    color={alerts.length === 0 ? 'success' : alerts.some(a => a.level === 'critical') ? 'error' : 'warning'}
                    size="small"
                    sx={{ mt: 0.5 }}
                  />
                </Box>
                <Avatar sx={{ bgcolor: alerts.length === 0 ? '#e8f5e9' : '#ffebee', width: 48, height: 48 }}>
                  {alerts.length === 0 ? <CheckCircle sx={{ color: '#388e3c' }} /> : <Warning sx={{ color: '#d32f2f' }} />}
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* API Usage Details */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, borderRadius: 3 }}>
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
              API Usage by Service
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>API</TableCell>
                    <TableCell align="right">Queries Today</TableCell>
                    <TableCell align="right">Daily Limit</TableCell>
                    <TableCell>Usage</TableCell>
                    <TableCell align="center">Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {summary?.apis && Object.entries(summary.apis).map(([apiType, data]) => (
                    <TableRow key={apiType}>
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>
                          {apiType}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        {formatNumber(data.queries)}
                      </TableCell>
                      <TableCell align="right">
                        {formatNumber(data.quota_limit)}
                      </TableCell>
                      <TableCell sx={{ width: 200 }}>
                        <Box display="flex" alignItems="center" gap={1}>
                          <LinearProgress
                            variant="determinate"
                            value={Math.min(data.percentage, 100)}
                            color={getStatusColor(data.status)}
                            sx={{ flexGrow: 1, height: 8, borderRadius: 4 }}
                          />
                          <Typography variant="body2" sx={{ minWidth: 45 }}>
                            {data.percentage}%
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          icon={getStatusIcon(data.status)}
                          label={data.status}
                          size="small"
                          color={getStatusColor(data.status)}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, borderRadius: 3, height: '100%' }}>
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
              Quota Limits
            </Typography>
            <Alert severity="info" icon={<Info />} sx={{ mb: 3 }}>
              <Typography variant="caption">
                These are Google's free tier limits. You can request higher quotas from Google Cloud Console at no cost.
              </Typography>
            </Alert>

            <TextField
              fullWidth
              label="Tasks API Daily Quota"
              type="number"
              value={quotaSettings.google_tasks_daily_quota}
              onChange={(e) => setQuotaSettings({
                ...quotaSettings,
                google_tasks_daily_quota: parseInt(e.target.value) || 0
              })}
              sx={{ mb: 2 }}
              size="small"
              helperText="Default: 50,000"
            />
            <TextField
              fullWidth
              label="Calendar API Daily Quota"
              type="number"
              value={quotaSettings.google_calendar_daily_quota}
              onChange={(e) => setQuotaSettings({
                ...quotaSettings,
                google_calendar_daily_quota: parseInt(e.target.value) || 0
              })}
              sx={{ mb: 2 }}
              size="small"
              helperText="Default: 1,000,000"
            />
            <TextField
              fullWidth
              label="Drive API Daily Quota"
              type="number"
              value={quotaSettings.google_drive_daily_quota}
              onChange={(e) => setQuotaSettings({
                ...quotaSettings,
                google_drive_daily_quota: parseInt(e.target.value) || 0
              })}
              sx={{ mb: 2 }}
              size="small"
              helperText="Default: 1,000,000,000"
            />
            <TextField
              fullWidth
              label="Gmail API Daily Quota"
              type="number"
              value={quotaSettings.google_gmail_daily_quota}
              onChange={(e) => setQuotaSettings({
                ...quotaSettings,
                google_gmail_daily_quota: parseInt(e.target.value) || 0
              })}
              sx={{ mb: 2 }}
              size="small"
              helperText="Default: 1,000,000"
            />

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
              Alert Thresholds
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Warning %"
                  type="number"
                  value={quotaSettings.quota_warning_threshold}
                  onChange={(e) => setQuotaSettings({
                    ...quotaSettings,
                    quota_warning_threshold: parseInt(e.target.value) || 0
                  })}
                  size="small"
                  InputProps={{ inputProps: { min: 0, max: 100 } }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Critical %"
                  type="number"
                  value={quotaSettings.quota_critical_threshold}
                  onChange={(e) => setQuotaSettings({
                    ...quotaSettings,
                    quota_critical_threshold: parseInt(e.target.value) || 0
                  })}
                  size="small"
                  InputProps={{ inputProps: { min: 0, max: 100 } }}
                />
              </Grid>
            </Grid>

            <Button
              fullWidth
              variant="contained"
              startIcon={saving ? <CircularProgress size={16} /> : <Save />}
              onClick={handleSaveQuotas}
              disabled={saving}
              sx={{ mt: 3 }}
            >
              {saving ? 'Saving...' : 'Save Quota Settings'}
            </Button>
          </Paper>
        </Grid>
      </Grid>

      {/* Usage History */}
      <Paper sx={{ p: 3, borderRadius: 3 }}>
        <Box display="flex" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Usage History
          </Typography>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Period</InputLabel>
            <Select
              value={historyDays}
              label="Period"
              onChange={(e) => setHistoryDays(e.target.value)}
            >
              <MenuItem value={7}>Last 7 days</MenuItem>
              <MenuItem value={14}>Last 14 days</MenuItem>
              <MenuItem value={30}>Last 30 days</MenuItem>
            </Select>
          </FormControl>
        </Box>

        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell align="right">Tasks</TableCell>
                <TableCell align="right">Calendar</TableCell>
                <TableCell align="right">Drive</TableCell>
                <TableCell align="right">Gmail</TableCell>
                <TableCell align="right">Total</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {history.map((day, idx) => {
                const totalQueries = Object.values(day.apis || {}).reduce(
                  (sum, api) => sum + (api.queries || 0), 0
                );
                return (
                  <TableRow key={idx}>
                    <TableCell>{day.date}</TableCell>
                    <TableCell align="right">
                      {formatNumber(day.apis?.TASKS?.queries || 0)}
                    </TableCell>
                    <TableCell align="right">
                      {formatNumber(day.apis?.CALENDAR?.queries || 0)}
                    </TableCell>
                    <TableCell align="right">
                      {formatNumber(day.apis?.DRIVE?.queries || 0)}
                    </TableCell>
                    <TableCell align="right">
                      {formatNumber(day.apis?.GMAIL?.queries || 0)}
                    </TableCell>
                    <TableCell align="right">
                      <strong>{formatNumber(totalQueries)}</strong>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
}
