import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Avatar,
  Grid,
  Divider,
  Alert,
  Snackbar,
  Chip,
  IconButton,
  InputAdornment,
} from '@mui/material';
import {
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Badge as BadgeIcon,
  Visibility,
  VisibilityOff,
  Save as SaveIcon,
  Lock as LockIcon,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { usersAPI } from '../services/api';
import { getErrorMessage } from '../utils/errorUtils';

const getRoleLabel = (role) => {
  const labels = {
    'ADMIN': 'Administrator',
    'PARTNER': 'Partner',
    'MANAGER': 'Manager',
    'STAFF': 'Staff Member',
  };
  return labels[role] || role;
};

const getRoleColor = (role) => {
  const colors = {
    'ADMIN': 'error',
    'PARTNER': 'primary',
    'MANAGER': 'warning',
    'STAFF': 'info',
  };
  return colors[role] || 'default';
};

const getRoleGradient = (role) => {
  const gradients = {
    'ADMIN': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    'PARTNER': 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
    'MANAGER': 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    'STAFF': 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  };
  return gradients[role] || gradients['STAFF'];
};

export default function Profile() {
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState({
    first_name: '',
    last_name: '',
    mobile: '',
  });
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    if (user) {
      setProfileData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        mobile: user.mobile || '',
      });
    }
  }, [user]);

  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  const handleProfileUpdate = async () => {
    setLoading(true);
    try {
      const response = await usersAPI.updateProfile(profileData);
      // Update user in AuthContext (this also updates localStorage)
      updateUser(response.data);
      showSnackbar('Profile updated successfully', 'success');
    } catch (error) {
      showSnackbar(getErrorMessage(error, 'Failed to update profile'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    if (passwordData.new_password !== passwordData.confirm_password) {
      showSnackbar('New passwords do not match', 'error');
      return;
    }

    if (passwordData.new_password.length < 8) {
      showSnackbar('New password must be at least 8 characters', 'error');
      return;
    }

    setLoading(true);
    try {
      await usersAPI.changePassword({
        current_password: passwordData.current_password,
        new_password: passwordData.new_password,
      });
      showSnackbar('Password changed successfully', 'success');
      setPasswordData({
        current_password: '',
        new_password: '',
        confirm_password: '',
      });
    } catch (error) {
      showSnackbar(getErrorMessage(error, 'Failed to change password'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const getInitials = () => {
    const first = user?.first_name?.charAt(0) || '';
    const last = user?.last_name?.charAt(0) || '';
    if (first || last) return (first + last).toUpperCase();
    return user?.email?.charAt(0).toUpperCase() || 'U';
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 4 }}>
        {/* Profile Header Card */}
        <Card
          sx={{
            background: getRoleGradient(user?.role),
            color: 'white',
            mb: 3,
            overflow: 'visible',
          }}
        >
          <CardContent sx={{ py: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <Avatar
                sx={{
                  width: 100,
                  height: 100,
                  bgcolor: 'white',
                  color: 'primary.main',
                  fontSize: '2.5rem',
                  fontWeight: 700,
                  boxShadow: '0 4px 14px rgba(0,0,0,0.2)',
                }}
              >
                {getInitials()}
              </Avatar>
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 700 }}>
                  {user?.first_name && user?.last_name
                    ? `${user.first_name} ${user.last_name}`
                    : user?.email || 'User'}
                </Typography>
                <Typography variant="body1" sx={{ opacity: 0.9, mt: 0.5 }}>
                  {user?.email}
                </Typography>
                <Chip
                  icon={<BadgeIcon sx={{ color: 'inherit !important' }} />}
                  label={getRoleLabel(user?.role)}
                  color={getRoleColor(user?.role)}
                  sx={{ mt: 1, fontWeight: 600 }}
                />
              </Box>
            </Box>
          </CardContent>
        </Card>

        <Grid container spacing={3}>
          {/* Profile Information Card */}
          <Grid item xs={12} md={6}>
            <Card sx={{ borderRadius: 3, boxShadow: 3, height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                  <PersonIcon color="primary" />
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Profile Information
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <EmailIcon color="action" />
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Email Address (Login ID)
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>
                        {user?.email}
                      </Typography>
                    </Box>
                  </Box>

                  <Divider />

                  <TextField
                    label="First Name"
                    fullWidth
                    value={profileData.first_name}
                    onChange={(e) => setProfileData({ ...profileData, first_name: e.target.value })}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <PersonIcon color="action" />
                        </InputAdornment>
                      ),
                    }}
                  />

                  <TextField
                    label="Last Name"
                    fullWidth
                    value={profileData.last_name}
                    onChange={(e) => setProfileData({ ...profileData, last_name: e.target.value })}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <PersonIcon color="action" />
                        </InputAdornment>
                      ),
                    }}
                  />

                  <TextField
                    label="Mobile Number"
                    fullWidth
                    value={profileData.mobile}
                    onChange={(e) => setProfileData({ ...profileData, mobile: e.target.value })}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <PhoneIcon color="action" />
                        </InputAdornment>
                      ),
                    }}
                  />

                  <Button
                    variant="contained"
                    startIcon={<SaveIcon />}
                    onClick={handleProfileUpdate}
                    disabled={loading}
                    sx={{ mt: 1 }}
                  >
                    Save Changes
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Change Password Card */}
          <Grid item xs={12} md={6}>
            <Card sx={{ borderRadius: 3, boxShadow: 3, height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                  <LockIcon color="primary" />
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Change Password
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                  <Alert severity="info" sx={{ mb: 1 }}>
                    Password must be at least 8 characters long.
                  </Alert>

                  <TextField
                    label="Current Password"
                    type={showPasswords.current ? 'text' : 'password'}
                    fullWidth
                    value={passwordData.current_password}
                    onChange={(e) =>
                      setPasswordData({ ...passwordData, current_password: e.target.value })
                    }
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => togglePasswordVisibility('current')}
                            edge="end"
                          >
                            {showPasswords.current ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />

                  <TextField
                    label="New Password"
                    type={showPasswords.new ? 'text' : 'password'}
                    fullWidth
                    value={passwordData.new_password}
                    onChange={(e) =>
                      setPasswordData({ ...passwordData, new_password: e.target.value })
                    }
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton onClick={() => togglePasswordVisibility('new')} edge="end">
                            {showPasswords.new ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />

                  <TextField
                    label="Confirm New Password"
                    type={showPasswords.confirm ? 'text' : 'password'}
                    fullWidth
                    value={passwordData.confirm_password}
                    onChange={(e) =>
                      setPasswordData({ ...passwordData, confirm_password: e.target.value })
                    }
                    error={
                      passwordData.confirm_password !== '' &&
                      passwordData.new_password !== passwordData.confirm_password
                    }
                    helperText={
                      passwordData.confirm_password !== '' &&
                      passwordData.new_password !== passwordData.confirm_password
                        ? 'Passwords do not match'
                        : ''
                    }
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => togglePasswordVisibility('confirm')}
                            edge="end"
                          >
                            {showPasswords.confirm ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />

                  <Button
                    variant="contained"
                    color="secondary"
                    startIcon={<LockIcon />}
                    onClick={handlePasswordChange}
                    disabled={
                      loading ||
                      !passwordData.current_password ||
                      !passwordData.new_password ||
                      !passwordData.confirm_password ||
                      passwordData.new_password !== passwordData.confirm_password
                    }
                    sx={{ mt: 1 }}
                  >
                    Change Password
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Account Details Card */}
          <Grid item xs={12}>
            <Card sx={{ borderRadius: 3, boxShadow: 3 }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                  Account Details
                </Typography>

                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6} md={3}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        User ID
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>
                        #{user?.id}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Username
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>
                        {user?.username || user?.email}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Role
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>
                        {getRoleLabel(user?.role)}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Account Status
                      </Typography>
                      <Box>
                        <Chip
                          label={user?.is_active ? 'Active' : 'Inactive'}
                          color={user?.is_active ? 'success' : 'default'}
                          size="small"
                        />
                      </Box>
                    </Box>
                  </Grid>

                  {user?.role === 'STAFF' && user?.can_access_credentials && (
                    <Grid item xs={12}>
                      <Divider sx={{ my: 2 }} />
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Credential Vault Access
                        </Typography>
                        <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                          {user?.allowed_credential_types?.map((type) => (
                            <Chip key={type} label={type} size="small" color="info" />
                          ))}
                        </Box>
                      </Box>
                    </Grid>
                  )}
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
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
