import React, { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  Alert,
  IconButton,
  InputAdornment,
  LinearProgress,
  Fade,
  Slide,
  Link,
} from '@mui/material';
import {
  ArrowForward as ArrowForwardIcon,
  ArrowBack as ArrowBackIcon,
  Visibility,
  VisibilityOff,
  AccountCircle,
  Lock,
} from '@mui/icons-material';
import { authAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const [step, setStep] = useState(1); // 1 for username, 2 for password
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleUsernameSubmit = (e) => {
    e.preventDefault();
    if (username.trim()) {
      setError('');
      setStep(2);
    } else {
      setError('Please enter your username');
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authAPI.login({ username, password });
      // Extract user data from response
      const userData = {
        id: response.data.user_id,
        username: response.data.username,
        email: response.data.email,
        role: response.data.role,
        first_name: response.data.first_name,
        last_name: response.data.last_name,
        is_platform_admin: response.data.is_platform_admin,
      };
      // Extract organization data
      const orgData = response.data.organization || null;
      login(userData, { access: response.data.access, refresh: response.data.refresh }, orgData);
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setStep(1);
    setError('');
    setPassword('');
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.1) 0%, transparent 50%)',
        },
        '&::after': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'radial-gradient(circle at 80% 80%, rgba(255,255,255,0.1) 0%, transparent 50%)',
        },
      }}
    >
      {loading && <LinearProgress sx={{ position: 'absolute', top: 0, left: 0, right: 0 }} />}

      <Slide direction="up" in={true} timeout={600}>
        <Paper
          elevation={24}
          sx={{
            p: 5,
            width: '100%',
            maxWidth: 450,
            zIndex: 1,
            borderRadius: 4,
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
          }}
        >
          {/* Logo and Title */}
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Box
              sx={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                boxShadow: '0 8px 24px rgba(102, 126, 234, 0.4)',
              }}
            >
              <Typography variant="h3" sx={{ color: 'white', fontWeight: 700 }}>
                N
              </Typography>
            </Box>
            <Typography
              variant="h4"
              sx={{
                fontWeight: 700,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                mb: 1,
              }}
            >
              NexPro
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Professional Office Management
            </Typography>
          </Box>

          {error && (
            <Fade in={true}>
              <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
                {error}
              </Alert>
            </Fade>
          )}

          {/* Step 1: Username */}
          {step === 1 && (
            <Fade in={true}>
              <Box component="form" onSubmit={handleUsernameSubmit}>
                <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
                  Welcome back!
                </Typography>
                <TextField
                  fullWidth
                  id="username"
                  label="Username"
                  name="username"
                  autoComplete="username"
                  autoFocus
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <AccountCircle color="primary" />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ mb: 3 }}
                />
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  size="large"
                  endIcon={<ArrowForwardIcon />}
                  sx={{
                    py: 1.5,
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    boxShadow: '0 4px 16px rgba(102, 126, 234, 0.4)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
                      boxShadow: '0 6px 24px rgba(102, 126, 234, 0.6)',
                    },
                  }}
                >
                  Continue
                </Button>
              </Box>
            </Fade>
          )}

          {/* Step 2: Password */}
          {step === 2 && (
            <Fade in={true}>
              <Box component="form" onSubmit={handlePasswordSubmit}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                  <IconButton onClick={handleBack} size="small" sx={{ mr: 1 }}>
                    <ArrowBackIcon />
                  </IconButton>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Logging in as
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      {username}
                    </Typography>
                  </Box>
                </Box>

                <TextField
                  fullWidth
                  id="password"
                  label="Password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  autoFocus
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Lock color="primary" />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                  sx={{ mb: 3 }}
                />

                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  size="large"
                  disabled={loading}
                  sx={{
                    py: 1.5,
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    boxShadow: '0 4px 16px rgba(102, 126, 234, 0.4)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
                      boxShadow: '0 6px 24px rgba(102, 126, 234, 0.6)',
                    },
                  }}
                >
                  {loading ? 'Logging in...' : 'Login'}
                </Button>
              </Box>
            </Fade>
          )}

          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Link
              component={RouterLink}
              to="/forgot-password"
              color="primary"
              variant="body2"
              sx={{ fontWeight: 500 }}
            >
              Forgot your password?
            </Link>
          </Box>

          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Don't have an account?{' '}
              <Link component={RouterLink} to="/signup" color="primary" fontWeight={600}>
                Sign up for free
              </Link>
            </Typography>
            <Typography variant="body2" color="text.secondary">
              © 2025 NexPro. All rights reserved.
            </Typography>
          </Box>
        </Paper>
      </Slide>
    </Box>
  );
}
