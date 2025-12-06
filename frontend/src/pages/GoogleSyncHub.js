import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Switch,
  FormControlLabel,
  TextField,
  Chip,
  Alert,
  CircularProgress,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Tab,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Tooltip,
  Collapse,
  Divider,
} from '@mui/material';
import {
  Google as GoogleIcon,
  Sync as SyncIcon,
  Link as LinkIcon,
  LinkOff as LinkOffIcon,
  Settings as SettingsIcon,
  Refresh as RefreshIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  ExpandMore as ExpandMoreIcon,
  Task as TaskIcon,
  CalendarMonth as CalendarIcon,
  CloudUpload as DriveIcon,
  Email as GmailIcon,
  History as HistoryIcon,
  FolderOpen as FolderIcon,
  NotificationsActive as ReminderIcon,
  HelpOutline as HelpIcon,
  Info as InfoIcon,
  LightbulbOutlined as TipIcon,
  ExpandLess as ExpandLessIcon,
  Security as SecurityIcon,
  Speed as SpeedIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';
import { googleSyncAPI } from '../services/api';

// Tab Panel Component
function TabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

// Help Section Component
const HelpSection = ({ title, children, defaultExpanded = false }) => {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <Paper
      variant="outlined"
      sx={{
        mb: 2,
        bgcolor: 'rgba(99, 102, 241, 0.03)',
        border: '1px solid rgba(99, 102, 241, 0.2)',
      }}
    >
      <Box
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          '&:hover': { bgcolor: 'rgba(99, 102, 241, 0.05)' },
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <HelpIcon sx={{ color: '#6366f1' }} />
          <Typography variant="subtitle2" sx={{ color: '#6366f1', fontWeight: 600 }}>
            {title}
          </Typography>
        </Box>
        <IconButton size="small">
          {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </IconButton>
      </Box>
      <Collapse in={expanded}>
        <Divider />
        <Box sx={{ p: 2 }}>
          {children}
        </Box>
      </Collapse>
    </Paper>
  );
};

// Quick Tip Component
const QuickTip = ({ children }) => (
  <Box
    sx={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: 1,
      p: 1.5,
      bgcolor: 'rgba(251, 188, 4, 0.1)',
      borderRadius: 1,
      border: '1px solid rgba(251, 188, 4, 0.3)',
      mb: 1,
    }}
  >
    <TipIcon sx={{ color: '#FBBC04', fontSize: 20, mt: 0.3 }} />
    <Typography variant="body2" color="text.secondary">
      {children}
    </Typography>
  </Box>
);

const GoogleSyncHub = () => {
  const [loading, setLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState(null);
  // eslint-disable-next-line no-unused-vars
  const [settings, setSettings] = useState(null);
  const [syncLogs, setSyncLogs] = useState([]);
  const [taskLists, setTaskLists] = useState([]);
  const [calendars, setCalendars] = useState([]);
  const [tabValue, setTabValue] = useState(0);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [localSettings, setLocalSettings] = useState({});
  const [showGettingStarted, setShowGettingStarted] = useState(true);
  const [processingOAuth, setProcessingOAuth] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();
  const oauthProcessedRef = useRef(false);

  const userData = JSON.parse(localStorage.getItem('user_data') || '{}');
  const isAdmin = userData.role === 'ADMIN';

  // Fetch connection status
  const fetchConnectionStatus = useCallback(async () => {
    try {
      const response = await googleSyncAPI.getConnectionStatus();
      setConnectionStatus(response.data);
    } catch (err) {
      console.error('Error fetching connection status:', err);
    }
  }, []);

  // Fetch settings (admin only)
  const fetchSettings = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const response = await googleSyncAPI.getSettings();
      setSettings(response.data);
      setLocalSettings(response.data);
    } catch (err) {
      console.error('Error fetching settings:', err);
    }
  }, [isAdmin]);

  // Fetch sync logs
  const fetchSyncLogs = useCallback(async () => {
    try {
      const response = await googleSyncAPI.getSyncLogs({ limit: 50 });
      setSyncLogs(response.data.results || response.data || []);
    } catch (err) {
      console.error('Error fetching sync logs:', err);
    }
  }, []);

  // Fetch Google resources
  const fetchGoogleResources = useCallback(async () => {
    if (!connectionStatus?.is_connected) return;

    try {
      if (connectionStatus.tasks_enabled) {
        const response = await googleSyncAPI.getTaskLists();
        setTaskLists(response.data || []);
      }
      if (connectionStatus.calendar_enabled) {
        const response = await googleSyncAPI.getCalendars();
        setCalendars(response.data || []);
      }
    } catch (err) {
      console.error('Error fetching Google resources:', err);
    }
  }, [connectionStatus]);

  // Auto-capture OAuth code from URL redirect
  useEffect(() => {
    const processOAuthCode = async () => {
      // Check if we have a code in URL params (Google OAuth redirect)
      const params = new URLSearchParams(location.search);
      const code = params.get('code');
      const oauthError = params.get('error');

      // If there's an error from Google OAuth
      if (oauthError) {
        setError(`Google OAuth error: ${oauthError}. ${params.get('error_description') || ''}`);
        // Clean up URL
        navigate('/dashboard/google-sync', { replace: true });
        return;
      }

      // If we have a code and haven't processed it yet
      if (code && !oauthProcessedRef.current) {
        oauthProcessedRef.current = true;
        setProcessingOAuth(true);
        setSuccess('Authorization code received. Connecting to Google...');

        try {
          await googleSyncAPI.connect(code, ['tasks', 'calendar', 'drive', 'gmail']);
          setSuccess('Successfully connected to Google!');
          // Refresh connection status
          await fetchConnectionStatus();
          await fetchSyncLogs();
        } catch (err) {
          setError(err.response?.data?.error || 'Failed to connect to Google. Please try again.');
        } finally {
          setProcessingOAuth(false);
          // Clean up URL - remove the code parameter
          navigate('/dashboard/google-sync', { replace: true });
        }
      }
    };

    processOAuthCode();
  }, [location.search, navigate, fetchConnectionStatus, fetchSyncLogs]);

  // Initial load
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchConnectionStatus(),
        fetchSettings(),
        fetchSyncLogs(),
      ]);
      setLoading(false);
    };
    loadData();
  }, [fetchConnectionStatus, fetchSettings, fetchSyncLogs]);

  // Fetch Google resources when connected
  useEffect(() => {
    if (connectionStatus?.is_connected) {
      fetchGoogleResources();
    }
  }, [connectionStatus, fetchGoogleResources]);

  // Connect to Google
  const handleConnect = async (services = ['tasks', 'calendar', 'drive', 'gmail']) => {
    try {
      setError(null);
      setSuccess('Redirecting to Google for authorization...');
      const response = await googleSyncAPI.getAuthUrl(services.join(','));
      // Redirect to Google OAuth (same window - better UX)
      // The callback will redirect back to this page with the code in URL params
      window.location.href = response.data.auth_url;
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to initiate Google connection');
    }
  };

  // Handle OAuth callback code
  const [authCode, setAuthCode] = useState('');
  const handleAuthCodeSubmit = async () => {
    try {
      setError(null);
      await googleSyncAPI.connect(authCode, ['tasks', 'calendar', 'drive', 'gmail']);
      setSuccess('Successfully connected to Google!');
      setAuthCode('');
      fetchConnectionStatus();
      fetchSyncLogs();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to connect to Google');
    }
  };

  // Disconnect from Google
  const handleDisconnect = async () => {
    if (!window.confirm('Are you sure you want to disconnect from Google? All sync mappings will be removed.')) {
      return;
    }
    try {
      setError(null);
      await googleSyncAPI.disconnect();
      setSuccess('Disconnected from Google');
      setConnectionStatus(null);
      fetchConnectionStatus();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to disconnect');
    }
  };

  // Update enabled services
  const handleServiceToggle = async (service, enabled) => {
    try {
      setError(null);
      await googleSyncAPI.updateServices({ [service]: enabled });
      fetchConnectionStatus();
      setSuccess(`${service.replace('_', ' ')} ${enabled ? 'enabled' : 'disabled'}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update service');
    }
  };

  // Sync all tasks
  const handleSyncAll = async () => {
    try {
      setSyncing(true);
      setError(null);
      const response = await googleSyncAPI.syncAllTasks();
      setSuccess(`Sync completed: ${response.data.synced_count} tasks synced, ${response.data.error_count} errors`);
      fetchSyncLogs();
    } catch (err) {
      setError(err.response?.data?.error || 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  // Save settings
  const handleSaveSettings = async () => {
    try {
      setError(null);
      await googleSyncAPI.updateSettings(localSettings);
      setSettings(localSettings);
      setSettingsDialogOpen(false);
      setSuccess('Settings saved successfully');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save settings');
    }
  };

  // Set task list
  const handleSetTaskList = async (taskListId) => {
    try {
      setError(null);
      await googleSyncAPI.setTaskList(taskListId);
      fetchConnectionStatus();
      setSuccess('Task list updated');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to set task list');
    }
  };

  // Set calendar
  const handleSetCalendar = async (calendarId) => {
    try {
      setError(null);
      await googleSyncAPI.setCalendar(calendarId);
      fetchConnectionStatus();
      setSuccess('Calendar updated');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to set calendar');
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <GoogleIcon sx={{ fontSize: 40, color: '#4285F4' }} />
          <Box>
            <Typography variant="h4" fontWeight="bold">
              Google Sync Hub
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Connect and sync your tasks with Google services
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {isAdmin && (
            <Button
              variant="outlined"
              startIcon={<SettingsIcon />}
              onClick={() => setSettingsDialogOpen(true)}
            >
              Sync Settings
            </Button>
          )}
        </Box>
      </Box>

      {/* Alerts */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {/* Getting Started Guide - Show when not connected */}
      {!connectionStatus?.is_connected && showGettingStarted && (
        <Paper sx={{ mb: 3, p: 3, bgcolor: 'rgba(66, 133, 244, 0.05)', border: '1px solid rgba(66, 133, 244, 0.2)' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <InfoIcon sx={{ color: '#4285F4' }} />
              <Typography variant="h6" sx={{ color: '#4285F4' }}>
                Getting Started Guide
              </Typography>
            </Box>
            <IconButton size="small" onClick={() => setShowGettingStarted(false)}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>

          <Typography variant="body2" paragraph>
            Google Sync Hub allows you to seamlessly integrate NexPro with your Google Workspace.
            Follow these steps to get connected:
          </Typography>

          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <Box sx={{ textAlign: 'center', p: 2 }}>
                <Box sx={{
                  width: 40, height: 40, borderRadius: '50%',
                  bgcolor: '#4285F4', color: 'white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  mx: 'auto', mb: 1, fontWeight: 'bold'
                }}>1</Box>
                <Typography variant="subtitle2" gutterBottom>Click Connect</Typography>
                <Typography variant="caption" color="text.secondary">
                  Click "Connect with Google" button below to start
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box sx={{ textAlign: 'center', p: 2 }}>
                <Box sx={{
                  width: 40, height: 40, borderRadius: '50%',
                  bgcolor: '#34A853', color: 'white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  mx: 'auto', mb: 1, fontWeight: 'bold'
                }}>2</Box>
                <Typography variant="subtitle2" gutterBottom>Sign In & Authorize</Typography>
                <Typography variant="caption" color="text.secondary">
                  Sign in to Google and grant permissions on the Google page
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box sx={{ textAlign: 'center', p: 2 }}>
                <Box sx={{
                  width: 40, height: 40, borderRadius: '50%',
                  bgcolor: '#FBBC04', color: 'white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  mx: 'auto', mb: 1, fontWeight: 'bold'
                }}>3</Box>
                <Typography variant="subtitle2" gutterBottom>Automatically Connected</Typography>
                <Typography variant="caption" color="text.secondary">
                  You'll be redirected back here and connected automatically
                </Typography>
              </Box>
            </Grid>
          </Grid>

          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2">
              <strong>No charges!</strong> All Google APIs used (Tasks, Calendar, Drive, Gmail) are completely FREE
              with generous quotas. Your data stays secure with OAuth 2.0 authentication.
            </Typography>
          </Alert>
        </Paper>
      )}

      {/* Connection Status Card */}
      <Paper sx={{ mb: 3, p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LinkIcon />
            Connection Status
          </Typography>
          <Chip
            icon={connectionStatus?.is_connected ? <CheckIcon /> : <CloseIcon />}
            label={connectionStatus?.is_connected ? 'Connected' : 'Not Connected'}
            color={connectionStatus?.is_connected ? 'success' : 'default'}
          />
        </Box>

        {connectionStatus?.is_connected ? (
          <>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Connected as: <strong>{connectionStatus.google_email}</strong>
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Last sync: {connectionStatus.last_sync_at
                  ? new Date(connectionStatus.last_sync_at).toLocaleString()
                  : 'Never'}
              </Typography>
            </Box>

            {/* Service Toggle Help */}
            <QuickTip>
              Toggle services ON/OFF below. Enabled services will sync your NexPro data with the corresponding Google service.
            </QuickTip>

            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={6} sm={3}>
                <Tooltip title="Sync tasks to Google Tasks app. Access from any device." arrow>
                  <Card variant="outlined" sx={{ cursor: 'help' }}>
                    <CardContent sx={{ textAlign: 'center', py: 2 }}>
                      <TaskIcon sx={{ fontSize: 32, color: connectionStatus.tasks_enabled ? '#4285F4' : '#ccc' }} />
                      <Typography variant="body2">Tasks</Typography>
                      <Switch
                        checked={connectionStatus.tasks_enabled}
                        onChange={(e) => handleServiceToggle('tasks_enabled', e.target.checked)}
                        size="small"
                      />
                    </CardContent>
                  </Card>
                </Tooltip>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Tooltip title="Create calendar events with reminders for task deadlines." arrow>
                  <Card variant="outlined" sx={{ cursor: 'help' }}>
                    <CardContent sx={{ textAlign: 'center', py: 2 }}>
                      <CalendarIcon sx={{ fontSize: 32, color: connectionStatus.calendar_enabled ? '#34A853' : '#ccc' }} />
                      <Typography variant="body2">Calendar</Typography>
                      <Switch
                        checked={connectionStatus.calendar_enabled}
                        onChange={(e) => handleServiceToggle('calendar_enabled', e.target.checked)}
                        size="small"
                      />
                    </CardContent>
                  </Card>
                </Tooltip>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Tooltip title="Auto-organize client documents in Google Drive folders." arrow>
                  <Card variant="outlined" sx={{ cursor: 'help' }}>
                    <CardContent sx={{ textAlign: 'center', py: 2 }}>
                      <DriveIcon sx={{ fontSize: 32, color: connectionStatus.drive_enabled ? '#FBBC04' : '#ccc' }} />
                      <Typography variant="body2">Drive</Typography>
                      <Switch
                        checked={connectionStatus.drive_enabled}
                        onChange={(e) => handleServiceToggle('drive_enabled', e.target.checked)}
                        size="small"
                      />
                    </CardContent>
                  </Card>
                </Tooltip>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Tooltip title="Send task notifications through your Gmail account." arrow>
                  <Card variant="outlined" sx={{ cursor: 'help' }}>
                    <CardContent sx={{ textAlign: 'center', py: 2 }}>
                      <GmailIcon sx={{ fontSize: 32, color: connectionStatus.gmail_enabled ? '#EA4335' : '#ccc' }} />
                      <Typography variant="body2">Gmail</Typography>
                      <Switch
                        checked={connectionStatus.gmail_enabled}
                        onChange={(e) => handleServiceToggle('gmail_enabled', e.target.checked)}
                        size="small"
                      />
                    </CardContent>
                  </Card>
                </Tooltip>
              </Grid>
            </Grid>

            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
              <Tooltip title="Sync all your pending tasks to enabled Google services" arrow>
                <Button
                  variant="contained"
                  startIcon={syncing ? <CircularProgress size={20} /> : <SyncIcon />}
                  onClick={handleSyncAll}
                  disabled={syncing}
                >
                  {syncing ? 'Syncing...' : 'Sync All Tasks'}
                </Button>
              </Tooltip>
              <Tooltip title="Remove Google connection and clear all sync mappings" arrow>
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<LinkOffIcon />}
                  onClick={handleDisconnect}
                >
                  Disconnect
                </Button>
              </Tooltip>
              <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
                Hover over items for more information
              </Typography>
            </Box>
          </>
        ) : (
          <Box>
            {processingOAuth ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4 }}>
                <CircularProgress size={48} sx={{ mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Connecting to Google...
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Please wait while we complete the authorization.
                </Typography>
              </Box>
            ) : (
              <>
                <Alert severity="info" sx={{ mb: 2 }}>
                  <Typography variant="body2">
                    Connect your Google account to sync tasks with Google Tasks, Calendar, Drive, and Gmail.
                    <br />
                    <strong>All APIs are FREE</strong> with generous quotas - no additional charges!
                  </Typography>
                </Alert>
                <Button
                  variant="contained"
                  startIcon={<GoogleIcon />}
                  onClick={() => handleConnect()}
                  sx={{
                    bgcolor: '#4285F4',
                    '&:hover': { bgcolor: '#3367D6' },
                  }}
                >
                  Connect with Google
                </Button>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                  You'll be redirected to Google to grant access, then automatically returned here.
                </Typography>

                {/* Manual code fallback (hidden by default, for edge cases) */}
                {authCode && (
                  <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                    <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <HelpIcon fontSize="small" color="action" />
                      Manual code entry (fallback):
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                      <TextField
                        label="Authorization Code"
                        value={authCode}
                        onChange={(e) => setAuthCode(e.target.value)}
                        size="small"
                        sx={{ width: 350 }}
                        placeholder="4/0AeanS0a..."
                      />
                      <Button
                        variant="outlined"
                        onClick={handleAuthCodeSubmit}
                        disabled={!authCode}
                      >
                        Submit
                      </Button>
                    </Box>
                  </Box>
                )}
              </>
            )}
          </Box>
        )}
      </Paper>

      {/* Tabs for Details */}
      {connectionStatus?.is_connected && (
        <Paper sx={{ mb: 3 }}>
          <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
            <Tab label="Configuration" icon={<SettingsIcon />} iconPosition="start" />
            <Tab label="Sync History" icon={<HistoryIcon />} iconPosition="start" />
            <Tab label="Drive Folders" icon={<FolderIcon />} iconPosition="start" />
            <Tab label="Help & FAQ" icon={<HelpIcon />} iconPosition="start" />
          </Tabs>

          {/* Configuration Tab */}
          <TabPanel value={tabValue} index={0}>
            <HelpSection title="Configuration Guide" defaultExpanded={false}>
              <Typography variant="body2" paragraph>
                Configure which Google resources to use for syncing. Each service can be customized independently.
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemIcon><TaskIcon sx={{ color: '#4285F4' }} /></ListItemIcon>
                  <ListItemText
                    primary="Task List Selection"
                    secondary="Choose which Google Tasks list will receive your NexPro tasks. Create a dedicated list for better organization."
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon><CalendarIcon sx={{ color: '#34A853' }} /></ListItemIcon>
                  <ListItemText
                    primary="Calendar Selection"
                    secondary="Select the calendar where task deadlines will appear. Using a separate calendar helps distinguish work tasks."
                  />
                </ListItem>
              </List>
            </HelpSection>

            <Grid container spacing={3}>
              {/* Task List Selection */}
              {connectionStatus.tasks_enabled && (
                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <TaskIcon color="primary" />
                        Google Tasks Configuration
                      </Typography>
                      <FormControl fullWidth size="small" sx={{ mt: 2 }}>
                        <InputLabel>Select Task List</InputLabel>
                        <Select
                          value={connectionStatus.task_list_id || ''}
                          label="Select Task List"
                          onChange={(e) => handleSetTaskList(e.target.value)}
                        >
                          {taskLists.map((list) => (
                            <MenuItem key={list.id} value={list.id}>
                              {list.title}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        Tasks will be synced to this Google Tasks list
                      </Typography>
                      <Alert severity="info" sx={{ mt: 2 }} icon={<TipIcon />}>
                        <Typography variant="caption">
                          <strong>Pro Tip:</strong> Create a new task list named "NexPro Tasks" in Google Tasks
                          for better organization. It will appear here after refreshing.
                        </Typography>
                      </Alert>
                    </CardContent>
                  </Card>
                </Grid>
              )}

              {/* Calendar Selection */}
              {connectionStatus.calendar_enabled && (
                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CalendarIcon color="success" />
                        Google Calendar Configuration
                      </Typography>
                      <FormControl fullWidth size="small" sx={{ mt: 2 }}>
                        <InputLabel>Select Calendar</InputLabel>
                        <Select
                          value={connectionStatus.calendar_id || 'primary'}
                          label="Select Calendar"
                          onChange={(e) => handleSetCalendar(e.target.value)}
                        >
                          {calendars.map((cal) => (
                            <MenuItem key={cal.id} value={cal.id}>
                              {cal.summary} {cal.primary && '(Primary)'}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        Task deadlines will appear as events on this calendar
                      </Typography>
                      <Alert severity="info" sx={{ mt: 2 }} icon={<ScheduleIcon />}>
                        <Typography variant="caption">
                          <strong>Reminders:</strong> {isAdmin ? 'Configure reminder times in Sync Settings (top right).' : 'Your admin configures reminder times for calendar events.'}
                        </Typography>
                      </Alert>
                    </CardContent>
                  </Card>
                </Grid>
              )}

              {/* Gmail Info */}
              {connectionStatus.gmail_enabled && (
                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <GmailIcon color="error" />
                        Gmail Integration
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Gmail integration enables these features:
                      </Typography>
                      <List dense>
                        <ListItem>
                          <ListItemIcon><CheckIcon color="success" fontSize="small" /></ListItemIcon>
                          <ListItemText
                            primary="Send task notifications via Gmail"
                            secondary="Emails sent from your connected Gmail account"
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemIcon><CheckIcon color="success" fontSize="small" /></ListItemIcon>
                          <ListItemText
                            primary="Create tasks from starred emails"
                            secondary="Star an email in Gmail to create a NexPro task"
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemIcon><CheckIcon color="success" fontSize="small" /></ListItemIcon>
                          <ListItemText
                            primary="Professional email delivery"
                            secondary="Better deliverability than generic SMTP servers"
                          />
                        </ListItem>
                      </List>
                    </CardContent>
                  </Card>
                </Grid>
              )}

              {/* Drive Info */}
              {connectionStatus.drive_enabled && (
                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <DriveIcon sx={{ color: '#FBBC04' }} />
                        Google Drive Integration
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Drive integration provides automatic file organization:
                      </Typography>
                      <List dense>
                        <ListItem>
                          <ListItemIcon><CheckIcon color="success" fontSize="small" /></ListItemIcon>
                          <ListItemText
                            primary="Auto-create client folder structure"
                            secondary="NexPro → Client Name → Year → Task Category"
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemIcon><CheckIcon color="success" fontSize="small" /></ListItemIcon>
                          <ListItemText
                            primary="Upload task attachments to Drive"
                            secondary="Documents automatically organized by client"
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemIcon><CheckIcon color="success" fontSize="small" /></ListItemIcon>
                          <ListItemText
                            primary="Store generated reports in Drive"
                            secondary="Easy access and sharing of reports"
                          />
                        </ListItem>
                      </List>
                    </CardContent>
                  </Card>
                </Grid>
              )}
            </Grid>
          </TabPanel>

          {/* Sync History Tab */}
          <TabPanel value={tabValue} index={1}>
            <HelpSection title="Understanding Sync History">
              <Typography variant="body2" paragraph>
                The sync history shows all synchronization activities between NexPro and Google services.
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Chip size="small" label="SUCCESS" color="success" />
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    Data successfully synced with Google
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Chip size="small" label="FAILED" color="error" />
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    Sync failed - check details for reason
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Chip size="small" label="SKIPPED" color="default" />
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    Item was skipped (already in sync or filtered)
                  </Typography>
                </Grid>
              </Grid>
            </HelpSection>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="subtitle1">Recent Sync Activity</Typography>
              <Tooltip title="Refresh sync history">
                <IconButton onClick={fetchSyncLogs} size="small">
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
            </Box>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Time</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Details</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {syncLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                        <HistoryIcon sx={{ fontSize: 48, color: '#ccc', mb: 1 }} />
                        <Typography color="text.secondary">
                          No sync activity yet. Click "Sync All Tasks" to start syncing.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    syncLogs.slice(0, 20).map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>
                          {new Date(log.created_at).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={log.sync_type?.replace(/_/g, ' ')}
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={log.status}
                            color={log.status === 'SUCCESS' ? 'success' : log.status === 'FAILED' ? 'error' : 'default'}
                          />
                        </TableCell>
                        <TableCell>
                          {log.details || log.error_message || '-'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </TabPanel>

          {/* Drive Folders Tab */}
          <TabPanel value={tabValue} index={2}>
            {connectionStatus.drive_enabled ? (
              <Box>
                <HelpSection title="Google Drive Folder Structure" defaultExpanded={true}>
                  <Typography variant="body2" paragraph>
                    When Google Drive integration is enabled, NexPro automatically creates and organizes folders
                    in your Google Drive following this structure:
                  </Typography>
                  <Paper variant="outlined" sx={{ p: 2, bgcolor: '#f8f9fa', fontFamily: 'monospace', mb: 2 }}>
                    <Typography variant="body2" component="pre" sx={{ m: 0 }}>
{`📁 NexPro (Root Folder)
├── 📁 ABC Corporation
│   ├── 📁 2024
│   │   ├── 📁 GST Returns
│   │   ├── 📁 Income Tax Filing
│   │   └── 📁 Audit
│   └── 📁 2025
│       └── 📁 GST Returns
├── 📁 XYZ Industries
│   └── 📁 2025
│       ├── 📁 TDS Returns
│       └── 📁 Annual Filing
└── 📁 Reports (Generated Reports)`}
                    </Typography>
                  </Paper>
                  <List dense>
                    <ListItem>
                      <ListItemIcon><FolderIcon color="primary" /></ListItemIcon>
                      <ListItemText
                        primary="Automatic Organization"
                        secondary="Folders are created automatically when you add clients or sync tasks"
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon><SecurityIcon color="success" /></ListItemIcon>
                      <ListItemText
                        primary="Your Data, Your Control"
                        secondary="Files are stored in YOUR Google Drive account - NexPro only organizes them"
                      />
                    </ListItem>
                  </List>
                </HelpSection>

                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Client folders are automatically created when you sync tasks or upload documents.
                  You can also manually create folder structures for all existing clients.
                </Typography>
                <Button variant="outlined" startIcon={<FolderIcon />}>
                  Create All Client Folders
                </Button>
              </Box>
            ) : (
              <Alert severity="warning" icon={<DriveIcon />}>
                <Typography variant="body2">
                  <strong>Google Drive integration is disabled.</strong>
                  <br />
                  Enable it in the Connection Status section above to manage client folders automatically.
                </Typography>
              </Alert>
            )}
          </TabPanel>

          {/* Help & FAQ Tab */}
          <TabPanel value={tabValue} index={3}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <HelpIcon color="primary" />
              Frequently Asked Questions
            </Typography>

            <Accordion defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography fontWeight="medium">Is there any cost for using Google Sync?</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="body2" color="text.secondary">
                  <strong>No!</strong> All Google APIs used (Tasks, Calendar, Drive, Gmail) are completely FREE
                  with generous quotas:
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemIcon><TaskIcon fontSize="small" /></ListItemIcon>
                    <ListItemText primary="Google Tasks: 50,000 requests/day" />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><CalendarIcon fontSize="small" /></ListItemIcon>
                    <ListItemText primary="Google Calendar: 1,000,000 requests/day" />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><DriveIcon fontSize="small" /></ListItemIcon>
                    <ListItemText primary="Google Drive: 15GB free storage + 1 billion requests/day" />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><GmailIcon fontSize="small" /></ListItemIcon>
                    <ListItemText primary="Gmail: 500 emails/day (personal) or 2,000/day (Workspace)" />
                  </ListItem>
                </List>
              </AccordionDetails>
            </Accordion>

            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography fontWeight="medium">Is my data secure?</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Yes! We use industry-standard OAuth 2.0 authentication:
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemIcon><SecurityIcon color="success" fontSize="small" /></ListItemIcon>
                    <ListItemText
                      primary="We never see your Google password"
                      secondary="You authenticate directly with Google"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><SecurityIcon color="success" fontSize="small" /></ListItemIcon>
                    <ListItemText
                      primary="Limited permissions"
                      secondary="We only request access to specific services you enable"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><SecurityIcon color="success" fontSize="small" /></ListItemIcon>
                    <ListItemText
                      primary="Revoke anytime"
                      secondary="You can disconnect and revoke access at any time"
                    />
                  </ListItem>
                </List>
              </AccordionDetails>
            </Accordion>

            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography fontWeight="medium">How do calendar reminders work?</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="body2" color="text.secondary" paragraph>
                  When Calendar sync is enabled, task deadlines create calendar events with reminders:
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemIcon><ReminderIcon color="warning" fontSize="small" /></ListItemIcon>
                    <ListItemText
                      primary="Popup reminders"
                      secondary="Show on your phone/computer at configured times"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><GmailIcon color="error" fontSize="small" /></ListItemIcon>
                    <ListItemText
                      primary="Email reminders"
                      secondary="Receive email notifications before deadlines"
                    />
                  </ListItem>
                </List>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  {isAdmin
                    ? 'You can configure reminder times (e.g., 1 day before, 1 hour before) in Sync Settings.'
                    : 'Your organization admin configures reminder times for all users.'
                  }
                </Typography>
              </AccordionDetails>
            </Accordion>

            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography fontWeight="medium">What happens when I disconnect?</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="body2" color="text.secondary">
                  When you disconnect from Google:
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemIcon><CloseIcon color="error" fontSize="small" /></ListItemIcon>
                    <ListItemText primary="OAuth tokens are deleted from NexPro" />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><CloseIcon color="error" fontSize="small" /></ListItemIcon>
                    <ListItemText primary="Sync mappings are cleared (which NexPro task = which Google item)" />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><CheckIcon color="success" fontSize="small" /></ListItemIcon>
                    <ListItemText primary="Your data in Google (tasks, events, files) remains intact" />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><CheckIcon color="success" fontSize="small" /></ListItemIcon>
                    <ListItemText primary="You can reconnect anytime and resync" />
                  </ListItem>
                </List>
              </AccordionDetails>
            </Accordion>

            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography fontWeight="medium">Can multiple users connect their Google accounts?</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="body2" color="text.secondary">
                  Yes! Each user can connect their own Google account:
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemIcon><CheckIcon color="success" fontSize="small" /></ListItemIcon>
                    <ListItemText
                      primary="Personal sync"
                      secondary="Each user's tasks sync to their own Google Tasks/Calendar"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><CheckIcon color="success" fontSize="small" /></ListItemIcon>
                    <ListItemText
                      primary="Organization settings"
                      secondary="Admins control sync behavior (reminders, filters) for everyone"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><CheckIcon color="success" fontSize="small" /></ListItemIcon>
                    <ListItemText
                      primary="Independent connections"
                      secondary="One user disconnecting doesn't affect others"
                    />
                  </ListItem>
                </List>
              </AccordionDetails>
            </Accordion>

            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography fontWeight="medium">How do I troubleshoot sync issues?</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="body2" color="text.secondary" paragraph>
                  If you're experiencing sync issues:
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemText
                      primary="1. Check Sync History tab"
                      secondary="Look for FAILED entries and read the error details"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="2. Verify services are enabled"
                      secondary="Make sure the toggle is ON for the service you want to use"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="3. Reconnect if needed"
                      secondary="Sometimes tokens expire - disconnect and reconnect to refresh"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="4. Check Google quotas"
                      secondary="Very rare, but high-volume users might hit daily limits"
                    />
                  </ListItem>
                </List>
              </AccordionDetails>
            </Accordion>
          </TabPanel>
        </Paper>
      )}

      {/* Feature Info Cards */}
      <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <SpeedIcon color="primary" />
        Integration Features Overview
      </Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%', '&:hover': { boxShadow: 4 }, transition: 'box-shadow 0.3s' }}>
            <CardContent>
              <TaskIcon sx={{ fontSize: 40, color: '#4285F4', mb: 1 }} />
              <Typography variant="subtitle1" fontWeight="bold">
                Google Tasks
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Two-way sync with Google Tasks. Assigned tasks appear in your Google Tasks app automatically.
              </Typography>
              <Chip size="small" label="Two-way Sync" color="primary" variant="outlined" />
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%', '&:hover': { boxShadow: 4 }, transition: 'box-shadow 0.3s' }}>
            <CardContent>
              <CalendarIcon sx={{ fontSize: 40, color: '#34A853', mb: 1 }} />
              <Typography variant="subtitle1" fontWeight="bold">
                Google Calendar
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Task deadlines sync to calendar with customizable reminders (popup and email).
              </Typography>
              <Chip size="small" label="Auto Reminders" color="success" variant="outlined" />
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%', '&:hover': { boxShadow: 4 }, transition: 'box-shadow 0.3s' }}>
            <CardContent>
              <DriveIcon sx={{ fontSize: 40, color: '#FBBC04', mb: 1 }} />
              <Typography variant="subtitle1" fontWeight="bold">
                Google Drive
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Auto-organized client folders. Documents and reports sync automatically.
              </Typography>
              <Chip size="small" label="Auto-Organize" color="warning" variant="outlined" />
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%', '&:hover': { boxShadow: 4 }, transition: 'box-shadow 0.3s' }}>
            <CardContent>
              <GmailIcon sx={{ fontSize: 40, color: '#EA4335', mb: 1 }} />
              <Typography variant="subtitle1" fontWeight="bold">
                Gmail
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Send task notifications through Gmail. Create tasks from starred emails.
              </Typography>
              <Chip size="small" label="Email Tasks" color="error" variant="outlined" />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Admin Settings Dialog */}
      <Dialog open={settingsDialogOpen} onClose={() => setSettingsDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SettingsIcon />
            Google Sync Settings
          </Box>
        </DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2">
              These settings apply to all users in your organization. Changes take effect on the next sync.
            </Typography>
          </Alert>

          {/* Sync Options */}
          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <SyncIcon />
                Sync Options
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <FormControlLabel
                control={
                  <Switch
                    checked={localSettings.auto_sync_new_tasks || false}
                    onChange={(e) => setLocalSettings({ ...localSettings, auto_sync_new_tasks: e.target.checked })}
                  />
                }
                label={
                  <Box>
                    <Typography variant="body2">Automatically sync new tasks</Typography>
                    <Typography variant="caption" color="text.secondary">
                      When enabled, new tasks are immediately synced to Google
                    </Typography>
                  </Box>
                }
              />
              <Divider sx={{ my: 1 }} />
              <FormControlLabel
                control={
                  <Switch
                    checked={localSettings.sync_completed_tasks || false}
                    onChange={(e) => setLocalSettings({ ...localSettings, sync_completed_tasks: e.target.checked })}
                  />
                }
                label={
                  <Box>
                    <Typography variant="body2">Remove calendar events when tasks are completed</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Keeps your calendar clean by removing completed task events
                    </Typography>
                  </Box>
                }
              />
              <Divider sx={{ my: 1 }} />
              <FormControlLabel
                control={
                  <Switch
                    checked={localSettings.sync_only_assigned_tasks || false}
                    onChange={(e) => setLocalSettings({ ...localSettings, sync_only_assigned_tasks: e.target.checked })}
                  />
                }
                label={
                  <Box>
                    <Typography variant="body2">Only sync tasks assigned to users</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Unassigned tasks won't appear in Google services
                    </Typography>
                  </Box>
                }
              />
              <Divider sx={{ my: 1 }} />
              <FormControlLabel
                control={
                  <Switch
                    checked={localSettings.two_way_sync || false}
                    onChange={(e) => setLocalSettings({ ...localSettings, two_way_sync: e.target.checked })}
                  />
                }
                label={
                  <Box>
                    <Typography variant="body2">Enable two-way sync</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Changes made in Google (e.g., rescheduling) update NexPro
                    </Typography>
                  </Box>
                }
              />
            </AccordionDetails>
          </Accordion>

          {/* Calendar Reminders */}
          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <ReminderIcon />
                Calendar Reminders
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Alert severity="info" sx={{ mb: 2 }} icon={<InfoIcon />}>
                <Typography variant="body2">
                  Set up to 3 reminders before task deadlines. Common values: 1440 (1 day), 60 (1 hour), 30 (30 min), 15 (15 min)
                </Typography>
              </Alert>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="Reminder 1 (minutes)"
                    type="number"
                    value={localSettings.calendar_reminder_1 || 1440}
                    onChange={(e) => setLocalSettings({ ...localSettings, calendar_reminder_1: parseInt(e.target.value) })}
                    helperText="1440 = 1 day before"
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="Reminder 2 (minutes)"
                    type="number"
                    value={localSettings.calendar_reminder_2 || 60}
                    onChange={(e) => setLocalSettings({ ...localSettings, calendar_reminder_2: parseInt(e.target.value) })}
                    helperText="60 = 1 hour before"
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="Reminder 3 (minutes)"
                    type="number"
                    value={localSettings.calendar_reminder_3 || 0}
                    onChange={(e) => setLocalSettings({ ...localSettings, calendar_reminder_3: parseInt(e.target.value) })}
                    helperText="0 = disabled"
                    size="small"
                  />
                </Grid>
              </Grid>
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" gutterBottom>Reminder Methods</Typography>
                <FormControlLabel
                  control={
                    <Switch
                      checked={localSettings.reminder_method_popup !== false}
                      onChange={(e) => setLocalSettings({ ...localSettings, reminder_method_popup: e.target.checked })}
                    />
                  }
                  label="Popup notification (appears on phone/computer)"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={localSettings.reminder_method_email !== false}
                      onChange={(e) => setLocalSettings({ ...localSettings, reminder_method_email: e.target.checked })}
                    />
                  }
                  label="Email notification (sent by Google Calendar)"
                />
              </Box>
            </AccordionDetails>
          </Accordion>

          {/* Drive Settings */}
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <DriveIcon />
                Google Drive Settings
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <FormControlLabel
                control={
                  <Switch
                    checked={localSettings.auto_create_client_folders || false}
                    onChange={(e) => setLocalSettings({ ...localSettings, auto_create_client_folders: e.target.checked })}
                  />
                }
                label={
                  <Box>
                    <Typography variant="body2">Auto-create folders for new clients</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Creates NexPro/ClientName/Year structure automatically
                    </Typography>
                  </Box>
                }
              />
              <Divider sx={{ my: 1 }} />
              <FormControlLabel
                control={
                  <Switch
                    checked={localSettings.auto_upload_documents || false}
                    onChange={(e) => setLocalSettings({ ...localSettings, auto_upload_documents: e.target.checked })}
                  />
                }
                label={
                  <Box>
                    <Typography variant="body2">Auto-upload task documents to Drive</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Documents attached to tasks are automatically backed up
                    </Typography>
                  </Box>
                }
              />
              <Divider sx={{ my: 1 }} />
              <FormControlLabel
                control={
                  <Switch
                    checked={localSettings.upload_reports_to_drive || false}
                    onChange={(e) => setLocalSettings({ ...localSettings, upload_reports_to_drive: e.target.checked })}
                  />
                }
                label={
                  <Box>
                    <Typography variant="body2">Save generated reports to Drive</Typography>
                    <Typography variant="caption" color="text.secondary">
                      PDF reports are saved in NexPro/Reports folder
                    </Typography>
                  </Box>
                }
              />
            </AccordionDetails>
          </Accordion>

          {/* Gmail Settings */}
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <GmailIcon />
                Gmail Settings
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <FormControlLabel
                control={
                  <Switch
                    checked={localSettings.use_gmail_for_notifications || false}
                    onChange={(e) => setLocalSettings({ ...localSettings, use_gmail_for_notifications: e.target.checked })}
                  />
                }
                label={
                  <Box>
                    <Typography variant="body2">Use Gmail for task notifications</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Send emails via connected Gmail instead of SMTP server. Better deliverability.
                    </Typography>
                  </Box>
                }
              />
              <Divider sx={{ my: 1 }} />
              <FormControlLabel
                control={
                  <Switch
                    checked={localSettings.create_tasks_from_starred || false}
                    onChange={(e) => setLocalSettings({ ...localSettings, create_tasks_from_starred: e.target.checked })}
                  />
                }
                label={
                  <Box>
                    <Typography variant="body2">Allow creating tasks from starred emails</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Users can star emails in Gmail to create NexPro tasks from them
                    </Typography>
                  </Box>
                }
              />
            </AccordionDetails>
          </Accordion>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettingsDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveSettings}>
            Save Settings
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default GoogleSyncHub;
