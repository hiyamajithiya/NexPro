import React, { useState, useEffect, useCallback } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
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
  Grid,
  Stepper,
  Step,
  StepLabel,
  CircularProgress,
} from '@mui/material';
import {
  ArrowForward as ArrowForwardIcon,
  ArrowBack as ArrowBackIcon,
  Visibility,
  VisibilityOff,
  Business,
  Person,
  Email,
  Phone,
  Lock,
  CheckCircle,
  MarkEmailRead,
} from '@mui/icons-material';
import { authAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const steps = ['Enter Email', 'Verify OTP', 'Complete Registration', 'Welcome'];

export default function Signup() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // Step 1: Email only
  const [email, setEmail] = useState('');

  // Step 2: OTP verification
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [resendTimer, setResendTimer] = useState(0);
  const [verificationToken, setVerificationToken] = useState('');

  // Step 3: Complete registration
  const [orgName, setOrgName] = useState('');
  const [orgPhone, setOrgPhone] = useState('');
  const [adminFirstName, setAdminFirstName] = useState('');
  const [adminLastName, setAdminLastName] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Timer for resend OTP
  useEffect(() => {
    let interval;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  // Step 1: Validate and send OTP
  const handleSendOTP = async () => {
    setError('');
    setSuccess('');

    if (!email.trim()) {
      setError('Email is required');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);

    try {
      await authAPI.sendSignupOTP(email);
      setResendTimer(60);
      setActiveStep(1);
      setSuccess(`Verification code sent to ${email}`);
    } catch (err) {
      const errorData = err.response?.data;
      if (errorData?.error) {
        setError(errorData.error);
      } else {
        setError('Failed to send verification code. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const resendOTP = async () => {
    setLoading(true);
    setError('');

    try {
      await authAPI.resendSignupOTP(email);
      setResendTimer(60);
      setSuccess('Verification code resent successfully');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to resend code');
    } finally {
      setLoading(false);
    }
  };

  // OTP input handlers
  const handleOtpChange = useCallback((index, value) => {
    if (value.length > 1) return;
    if (value && !/^\d$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  }, [otp]);

  const handleOtpKeyDown = useCallback((index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      if (prevInput) prevInput.focus();
    }
  }, [otp]);

  const handleOtpPaste = useCallback((e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6);
    if (/^\d+$/.test(pastedData)) {
      const newOtp = [...otp];
      pastedData.split('').forEach((char, i) => {
        if (i < 6) newOtp[i] = char;
      });
      setOtp(newOtp);
    }
  }, [otp]);

  // Step 2: Verify OTP
  const handleVerifyOTP = async () => {
    const otpCode = otp.join('');
    if (otpCode.length !== 6) {
      setError('Please enter the complete 6-digit code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await authAPI.verifySignupOTP({
        email: email,
        otp: otpCode,
      });

      // Store the verification token
      setVerificationToken(response.data.verification_token);
      setSuccess('Email verified! Please complete your registration.');
      setActiveStep(2);
    } catch (err) {
      const errorData = err.response?.data;
      if (errorData?.error) {
        setError(errorData.error);
      } else {
        setError('Invalid verification code. Please try again.');
      }
      // Clear OTP on error
      setOtp(['', '', '', '', '', '']);
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Complete registration
  const handleCompleteSignup = async () => {
    setError('');

    // Validate fields
    if (!orgName.trim()) {
      setError('Organization name is required');
      return;
    }
    if (!orgPhone.trim()) {
      setError('Mobile number is required');
      return;
    }
    if (!adminFirstName.trim()) {
      setError('First name is required');
      return;
    }
    if (!adminPassword) {
      setError('Password is required');
      return;
    }
    if (adminPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (adminPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const response = await authAPI.completeSignup({
        email: email,
        verification_token: verificationToken,
        organization_name: orgName,
        organization_email: email, // Use same email for org
        organization_phone: orgPhone,
        admin_first_name: adminFirstName,
        admin_last_name: adminLastName,
        admin_password: adminPassword,
      });

      // Extract user data
      const userData = {
        id: response.data.user.id,
        email: response.data.user.email,
        role: response.data.user.role,
        first_name: response.data.user.first_name,
        last_name: response.data.user.last_name,
        is_platform_admin: false,
      };

      // Extract organization data
      const orgData = response.data.organization;

      // Login the user
      login(userData, response.data.tokens, orgData);

      // Move to success step
      setActiveStep(3);

      // Redirect after a short delay
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);

    } catch (err) {
      const errorData = err.response?.data;
      if (errorData?.error) {
        setError(errorData.error);
      } else if (errorData) {
        const errorMessages = [];
        Object.keys(errorData).forEach((key) => {
          if (Array.isArray(errorData[key])) {
            errorMessages.push(...errorData[key]);
          } else if (typeof errorData[key] === 'string') {
            errorMessages.push(errorData[key]);
          }
        });
        setError(errorMessages.join(' ') || 'Registration failed');
      } else {
        setError('Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setError('');
    setSuccess('');
    if (activeStep === 1) {
      setActiveStep(0);
      setOtp(['', '', '', '', '', '']);
    } else if (activeStep === 2) {
      // Cannot go back from registration step - need to verify again
      setError('Please complete your registration or start over');
    }
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
        py: 4,
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
            maxWidth: 550,
            zIndex: 1,
            borderRadius: 4,
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
          }}
        >
          {/* Logo and Title */}
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Box
              sx={{
                width: 70,
                height: 70,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                boxShadow: '0 8px 24px rgba(102, 126, 234, 0.4)',
              }}
            >
              <Typography variant="h4" sx={{ color: 'white', fontWeight: 700 }}>
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
                mb: 0.5,
              }}
            >
              NexPro
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Start your 30-day free trial
            </Typography>
          </Box>

          {/* Stepper */}
          <Stepper activeStep={activeStep} sx={{ mb: 4 }} alternativeLabel>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {error && (
            <Fade in={true}>
              <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
                {error}
              </Alert>
            </Fade>
          )}

          {success && (
            <Fade in={true}>
              <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }}>
                {success}
              </Alert>
            </Fade>
          )}

          {/* Step 1: Enter Email */}
          {activeStep === 0 && (
            <Fade in={true}>
              <Box>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, textAlign: 'center' }}>
                  Enter your email to get started
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3, textAlign: 'center' }}>
                  We'll send you a verification code to confirm your email
                </Typography>
                <TextField
                  fullWidth
                  label="Email Address"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  onKeyPress={(e) => e.key === 'Enter' && handleSendOTP()}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Email color="primary" />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ mb: 3 }}
                />
                <Button
                  fullWidth
                  variant="contained"
                  size="large"
                  endIcon={<ArrowForwardIcon />}
                  onClick={handleSendOTP}
                  disabled={loading}
                  sx={{
                    py: 1.5,
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    boxShadow: '0 4px 16px rgba(102, 126, 234, 0.4)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
                    },
                  }}
                >
                  {loading ? (
                    <>
                      <CircularProgress size={20} sx={{ mr: 1, color: 'white' }} />
                      Sending...
                    </>
                  ) : (
                    'Send Verification Code'
                  )}
                </Button>
              </Box>
            </Fade>
          )}

          {/* Step 2: OTP Verification */}
          {activeStep === 1 && (
            <Fade in={true}>
              <Box sx={{ textAlign: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                  <IconButton onClick={handleBack} size="small" sx={{ mr: 1 }}>
                    <ArrowBackIcon />
                  </IconButton>
                  <Typography variant="h6" sx={{ fontWeight: 600, flex: 1, textAlign: 'center', mr: 4 }}>
                    Verify Your Email
                  </Typography>
                </Box>

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
                  }}
                >
                  <MarkEmailRead sx={{ fontSize: 40, color: 'white' }} />
                </Box>

                <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
                  We've sent a 6-digit code to
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 600, mb: 3 }}>
                  {email}
                </Typography>

                {/* OTP Input */}
                <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mb: 3 }}>
                  {otp.map((digit, index) => (
                    <TextField
                      key={index}
                      id={`otp-${index}`}
                      value={digit}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                      onPaste={index === 0 ? handleOtpPaste : undefined}
                      inputProps={{
                        maxLength: 1,
                        style: {
                          textAlign: 'center',
                          fontSize: '1.5rem',
                          fontWeight: 600,
                          padding: '12px',
                        },
                      }}
                      sx={{
                        width: 50,
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 2,
                        },
                      }}
                    />
                  ))}
                </Box>

                <Button
                  fullWidth
                  variant="contained"
                  size="large"
                  onClick={handleVerifyOTP}
                  disabled={loading || otp.join('').length !== 6}
                  sx={{
                    py: 1.5,
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    boxShadow: '0 4px 16px rgba(102, 126, 234, 0.4)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
                    },
                  }}
                >
                  {loading ? (
                    <>
                      <CircularProgress size={20} sx={{ mr: 1, color: 'white' }} />
                      Verifying...
                    </>
                  ) : (
                    'Verify Email'
                  )}
                </Button>

                <Box sx={{ mt: 3 }}>
                  <Typography variant="body2" color="text.secondary">
                    Didn't receive the code?{' '}
                    {resendTimer > 0 ? (
                      <Typography component="span" color="primary" sx={{ fontWeight: 600 }}>
                        Resend in {resendTimer}s
                      </Typography>
                    ) : (
                      <Link
                        component="button"
                        variant="body2"
                        onClick={resendOTP}
                        disabled={loading}
                        sx={{ fontWeight: 600 }}
                      >
                        Resend Code
                      </Link>
                    )}
                  </Typography>
                </Box>
              </Box>
            </Fade>
          )}

          {/* Step 3: Complete Registration */}
          {activeStep === 2 && (
            <Fade in={true}>
              <Box>
                <Typography variant="h6" sx={{ mb: 1, fontWeight: 600, textAlign: 'center' }}>
                  Complete Your Registration
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3, textAlign: 'center' }}>
                  Email verified: <strong>{email}</strong>
                </Typography>

                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Organization Name"
                      value={orgName}
                      onChange={(e) => setOrgName(e.target.value)}
                      placeholder="Your Firm Name"
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Business color="primary" />
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      required
                      label="Mobile Number"
                      value={orgPhone}
                      onChange={(e) => setOrgPhone(e.target.value)}
                      placeholder="+91 9876543210"
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Phone color="primary" />
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="First Name"
                      value={adminFirstName}
                      onChange={(e) => setAdminFirstName(e.target.value)}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Person color="primary" />
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Last Name (Optional)"
                      value={adminLastName}
                      onChange={(e) => setAdminLastName(e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Password"
                      type={showPassword ? 'text' : 'password'}
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      helperText="At least 8 characters"
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
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Confirm Password"
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Lock color="primary" />
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>
                </Grid>

                <Button
                  fullWidth
                  variant="contained"
                  size="large"
                  onClick={handleCompleteSignup}
                  disabled={loading}
                  sx={{
                    mt: 3,
                    py: 1.5,
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    boxShadow: '0 4px 16px rgba(102, 126, 234, 0.4)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
                    },
                  }}
                >
                  {loading ? (
                    <>
                      <CircularProgress size={20} sx={{ mr: 1, color: 'white' }} />
                      Creating Account...
                    </>
                  ) : (
                    'Create Account'
                  )}
                </Button>
              </Box>
            </Fade>
          )}

          {/* Step 4: Success */}
          {activeStep === 3 && (
            <Fade in={true}>
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <CheckCircle sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
                <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
                  Welcome to NexPro!
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                  Your account has been created successfully.
                  <br />
                  Redirecting to dashboard...
                </Typography>
                <LinearProgress sx={{ mx: 'auto', maxWidth: 200, borderRadius: 1 }} />
              </Box>
            </Fade>
          )}

          {activeStep < 3 && (
            <Box sx={{ mt: 3, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Already have an account?{' '}
                <Link component={RouterLink} to="/login" color="primary" fontWeight={600}>
                  Sign in
                </Link>
              </Typography>
            </Box>
          )}

          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              By signing up, you agree to our{' '}
              <Link component={RouterLink} to="/terms-of-service" color="primary">
                Terms of Service
              </Link>
              {' '}and{' '}
              <Link component={RouterLink} to="/privacy-policy" color="primary">
                Privacy Policy
              </Link>
            </Typography>
          </Box>
        </Paper>
      </Slide>
    </Box>
  );
}
