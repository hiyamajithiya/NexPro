import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  Box,
  Container,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  Avatar,
  AppBar,
  Toolbar,
  Chip,
  Divider,
  IconButton,
  useTheme,
  useMediaQuery,
  CircularProgress,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import {
  Dashboard,
  People,
  Assignment,
  CalendarMonth,
  Assessment,
  Email,
  Security,
  Speed,
  Cloud,
  SupportAgent,
  CheckCircle,
  ArrowForward,
  Business,
  WorkOutline,
  Notifications,
  Timer,
  Description,
  Groups,
  Language,
  LinkedIn,
  Twitter,
  Star,
} from '@mui/icons-material';
import { subscriptionPlansAPI } from '../services/api';

const features = [
  {
    icon: <Dashboard sx={{ fontSize: 40 }} />,
    title: 'Intuitive Dashboard',
    description: 'Get a bird\'s eye view of your practice with real-time analytics, task summaries, and performance metrics.',
    color: '#6366f1',
  },
  {
    icon: <People sx={{ fontSize: 40 }} />,
    title: 'Client Management',
    description: 'Manage unlimited clients with detailed profiles, PAN/GSTIN tracking, and complete work history.',
    color: '#10b981',
  },
  {
    icon: <Assignment sx={{ fontSize: 40 }} />,
    title: 'Task Automation',
    description: 'Auto-generate recurring tasks based on work types, periods, and due dates. Never miss a deadline.',
    color: '#f59e0b',
  },
  {
    icon: <CalendarMonth sx={{ fontSize: 40 }} />,
    title: 'Smart Calendar',
    description: 'Visual calendar view of all tasks, deadlines, and reminders. Drag-and-drop scheduling.',
    color: '#ec4899',
  },
  {
    icon: <Email sx={{ fontSize: 40 }} />,
    title: 'Email Reminders',
    description: 'Automated email notifications to clients and staff. Customizable templates for every occasion.',
    color: '#3b82f6',
  },
  {
    icon: <Assessment sx={{ fontSize: 40 }} />,
    title: 'Detailed Reports',
    description: 'Generate comprehensive reports on tasks, clients, and team performance. Export to PDF/Excel.',
    color: '#8b5cf6',
  },
];

const additionalFeatures = [
  { icon: <WorkOutline />, text: 'Work Type Templates' },
  { icon: <Timer />, text: 'Time Tracking' },
  { icon: <Groups />, text: 'Team Management' },
  { icon: <Notifications />, text: 'Smart Notifications' },
  { icon: <Description />, text: 'Document Storage' },
  { icon: <Security />, text: 'Role-Based Access' },
];

const stats = [
  { value: '10K+', label: 'Tasks Managed' },
  { value: '500+', label: 'Happy Clients' },
  { value: '99.9%', label: 'Uptime' },
  { value: '24/7', label: 'Support' },
];


export default function LandingPage() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [plans, setPlans] = useState([]);
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [loadingPlans, setLoadingPlans] = useState(true);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const response = await subscriptionPlansAPI.getPublic();
        if (response.data && response.data.length > 0) {
          setPlans(response.data);
        }
      } catch (error) {
        console.error('Failed to fetch plans:', error);
      } finally {
        setLoadingPlans(false);
      }
    };
    fetchPlans();
  }, []);

  const formatPrice = (price) => {
    if (price === 0) return 'Free';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(price);
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f8fafc' }}>
      {/* SEO Meta Tags */}
      <Helmet>
        <title>NexPro - Professional Practice Management Software | Chinmay Technosoft</title>
        <meta name="description" content="NexPro is a comprehensive practice management solution for professionals. Manage clients, automate tasks, track deadlines, and grow your practice effortlessly." />
        <meta name="keywords" content="practice management software, professional software, client management, task automation, deadline tracking, workflow management, Chinmay Technosoft, NexPro" />
        <meta property="og:title" content="NexPro - Professional Practice Management Software" />
        <meta property="og:description" content="Streamline your practice with NexPro. Manage clients, automate tasks, and grow your practice effortlessly." />
        <meta property="og:type" content="website" />
        <link rel="canonical" href="https://nexpro.in/" />
      </Helmet>

      {/* Navigation Bar */}
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          bgcolor: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid rgba(0,0,0,0.08)',
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between', py: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Avatar
              sx={{
                bgcolor: '#6366f1',
                width: 40,
                height: 40,
              }}
            >
              <Business />
            </Avatar>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 700,
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              NexPro
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {!isMobile && (
              <>
                <Button
                  color="inherit"
                  sx={{ color: 'text.secondary' }}
                  onClick={() => document.getElementById('features-section')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  Features
                </Button>
                <Button
                  color="inherit"
                  sx={{ color: 'text.secondary' }}
                  onClick={() => document.getElementById('pricing-section')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  Pricing
                </Button>
                <Button
                  color="inherit"
                  sx={{ color: 'text.secondary' }}
                  onClick={() => document.getElementById('contact-section')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  Contact
                </Button>
              </>
            )}
            <Button
              variant="outlined"
              onClick={() => navigate('/login')}
              sx={{
                borderColor: '#6366f1',
                color: '#6366f1',
                '&:hover': {
                  borderColor: '#4f46e5',
                  bgcolor: 'rgba(99, 102, 241, 0.04)',
                },
              }}
            >
              Log In
            </Button>
            <Button
              variant="contained"
              onClick={() => navigate('/signup')}
              sx={{
                bgcolor: '#6366f1',
                '&:hover': { bgcolor: '#4f46e5' },
              }}
            >
              Get Started
            </Button>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Hero Section */}
      <Box
        sx={{
          pt: { xs: 12, md: 16 },
          pb: { xs: 8, md: 12 },
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Background decorations */}
        <Box
          sx={{
            position: 'absolute',
            top: -100,
            right: -100,
            width: 400,
            height: 400,
            borderRadius: '50%',
            bgcolor: 'rgba(255,255,255,0.1)',
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            bottom: -150,
            left: -150,
            width: 500,
            height: 500,
            borderRadius: '50%',
            bgcolor: 'rgba(255,255,255,0.05)',
          }}
        />

        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={6}>
              <Chip
                label="Professional Practice Management"
                sx={{
                  bgcolor: 'rgba(255,255,255,0.2)',
                  color: 'white',
                  mb: 3,
                  fontWeight: 600,
                }}
              />
              <Typography
                variant="h2"
                sx={{
                  color: 'white',
                  fontWeight: 800,
                  fontSize: { xs: '2.5rem', md: '3.5rem' },
                  lineHeight: 1.2,
                  mb: 3,
                }}
              >
                Streamline Your
                <br />
                <span style={{ color: '#fef08a' }}>Practice</span>
                <br />
                Like Never Before
              </Typography>
              <Typography
                variant="h6"
                sx={{
                  color: 'rgba(255,255,255,0.9)',
                  mb: 4,
                  fontWeight: 400,
                  lineHeight: 1.6,
                }}
              >
                The all-in-one practice management solution for Chartered Accountants,
                Tax Professionals, and Consulting Firms. Manage clients, automate tasks,
                and grow your practice effortlessly.
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Button
                  variant="contained"
                  size="large"
                  endIcon={<ArrowForward />}
                  onClick={() => navigate('/signup')}
                  sx={{
                    bgcolor: 'white',
                    color: '#6366f1',
                    px: 4,
                    py: 1.5,
                    fontSize: '1.1rem',
                    fontWeight: 600,
                    '&:hover': {
                      bgcolor: '#f8fafc',
                    },
                  }}
                >
                  Start Free Trial
                </Button>
                <Button
                  variant="outlined"
                  size="large"
                  sx={{
                    borderColor: 'rgba(255,255,255,0.5)',
                    color: 'white',
                    px: 4,
                    py: 1.5,
                    fontSize: '1.1rem',
                    '&:hover': {
                      borderColor: 'white',
                      bgcolor: 'rgba(255,255,255,0.1)',
                    },
                  }}
                >
                  Watch Demo
                </Button>
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box
                sx={{
                  position: 'relative',
                  display: { xs: 'none', md: 'block' },
                }}
              >
                {/* Dashboard Preview Card */}
                <Card
                  sx={{
                    borderRadius: 4,
                    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
                    overflow: 'hidden',
                    transform: 'perspective(1000px) rotateY(-5deg) rotateX(5deg)',
                  }}
                >
                  <Box
                    sx={{
                      bgcolor: '#1e1e2e',
                      p: 1,
                      display: 'flex',
                      gap: 0.5,
                    }}
                  >
                    <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#ff5f56' }} />
                    <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#ffbd2e' }} />
                    <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#27ca3f' }} />
                  </Box>
                  <Box sx={{ bgcolor: '#f8fafc', p: 3 }}>
                    <Grid container spacing={2}>
                      {[
                        { label: 'Total Clients', value: '156', color: '#6366f1' },
                        { label: 'Pending Tasks', value: '24', color: '#f59e0b' },
                        { label: 'Completed', value: '89%', color: '#10b981' },
                        { label: 'Revenue', value: '12.5L', color: '#ec4899' },
                      ].map((stat, i) => (
                        <Grid item xs={6} key={i}>
                          <Box
                            sx={{
                              bgcolor: 'white',
                              p: 2,
                              borderRadius: 2,
                              boxShadow: 1,
                            }}
                          >
                            <Typography variant="caption" color="text.secondary">
                              {stat.label}
                            </Typography>
                            <Typography
                              variant="h5"
                              sx={{ fontWeight: 700, color: stat.color }}
                            >
                              {stat.value}
                            </Typography>
                          </Box>
                        </Grid>
                      ))}
                    </Grid>
                  </Box>
                </Card>
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Stats Section */}
      <Box sx={{ bgcolor: 'white', py: 4, borderBottom: '1px solid #e2e8f0' }}>
        <Container maxWidth="lg">
          <Grid container spacing={4} justifyContent="center">
            {stats.map((stat, index) => (
              <Grid item xs={6} md={3} key={index}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography
                    variant="h3"
                    sx={{
                      fontWeight: 800,
                      background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                      backgroundClip: 'text',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                    }}
                  >
                    {stat.value}
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    {stat.label}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Features Section */}
      <Box id="features-section" sx={{ py: { xs: 8, md: 12 } }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', mb: 8 }}>
            <Chip
              label="Features"
              sx={{
                bgcolor: '#ede9fe',
                color: '#6366f1',
                mb: 2,
                fontWeight: 600,
              }}
            />
            <Typography
              variant="h3"
              sx={{ fontWeight: 700, mb: 2, color: '#1e293b' }}
            >
              Everything You Need to
              <br />
              <span style={{ color: '#6366f1' }}>Manage Your Practice</span>
            </Typography>
            <Typography
              variant="h6"
              color="text.secondary"
              sx={{ maxWidth: 600, mx: 'auto' }}
            >
              Powerful features designed specifically for professional practices
            </Typography>
          </Box>

          <Grid container spacing={4}>
            {features.map((feature, index) => (
              <Grid item xs={12} md={4} key={index}>
                <Card
                  sx={{
                    height: '100%',
                    borderRadius: 4,
                    border: '1px solid #e2e8f0',
                    boxShadow: 'none',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      boxShadow: '0 20px 40px -12px rgba(0,0,0,0.15)',
                      transform: 'translateY(-8px)',
                      borderColor: feature.color,
                    },
                  }}
                >
                  <CardContent sx={{ p: 4 }}>
                    <Avatar
                      sx={{
                        width: 64,
                        height: 64,
                        bgcolor: `${feature.color}15`,
                        color: feature.color,
                        mb: 3,
                      }}
                    >
                      {feature.icon}
                    </Avatar>
                    <Typography
                      variant="h5"
                      sx={{ fontWeight: 700, mb: 2, color: '#1e293b' }}
                    >
                      {feature.title}
                    </Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                      {feature.description}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Additional Features */}
      <Box sx={{ bgcolor: '#f1f5f9', py: { xs: 6, md: 8 } }}>
        <Container maxWidth="lg">
          <Typography
            variant="h5"
            sx={{ textAlign: 'center', fontWeight: 600, mb: 4, color: '#475569' }}
          >
            And much more...
          </Typography>
          <Grid container spacing={2} justifyContent="center">
            {additionalFeatures.map((feature, index) => (
              <Grid item key={index}>
                <Chip
                  icon={feature.icon}
                  label={feature.text}
                  sx={{
                    bgcolor: 'white',
                    border: '1px solid #e2e8f0',
                    py: 2.5,
                    px: 1,
                    fontSize: '0.95rem',
                    '& .MuiChip-icon': { color: '#6366f1' },
                  }}
                />
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Why Choose Us */}
      <Box sx={{ py: { xs: 8, md: 12 }, bgcolor: 'white' }}>
        <Container maxWidth="lg">
          <Grid container spacing={6} alignItems="center">
            <Grid item xs={12} md={6}>
              <Chip
                label="Why NexPro?"
                sx={{
                  bgcolor: '#dcfce7',
                  color: '#16a34a',
                  mb: 2,
                  fontWeight: 600,
                }}
              />
              <Typography variant="h3" sx={{ fontWeight: 700, mb: 3, color: '#1e293b' }}>
                Built for
                <span style={{ color: '#6366f1' }}> Professionals</span>,
                by Professionals
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 4, lineHeight: 1.8 }}>
                We understand the unique challenges faced by professional practices.
                That's why we've built NexPro with features that matter most to you.
              </Typography>

              {[
                'Compliant with IT Act 2000 & DPDP Act 2023',
                'Bank-grade security with end-to-end encryption',
                'Multi-tenant architecture for data isolation',
                'Automatic backups and 99.9% uptime guarantee',
                'Dedicated support team available 24/7',
              ].map((item, index) => (
                <Box
                  key={index}
                  sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}
                >
                  <CheckCircle sx={{ color: '#10b981' }} />
                  <Typography variant="body1" color="text.secondary">
                    {item}
                  </Typography>
                </Box>
              ))}
            </Grid>
            <Grid item xs={12} md={6}>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: 3,
                }}
              >
                {[
                  { icon: <Security sx={{ fontSize: 40 }} />, title: 'Secure', desc: 'Enterprise-grade security', color: '#6366f1' },
                  { icon: <Speed sx={{ fontSize: 40 }} />, title: 'Fast', desc: 'Lightning fast performance', color: '#10b981' },
                  { icon: <Cloud sx={{ fontSize: 40 }} />, title: 'Cloud', desc: 'Access from anywhere', color: '#f59e0b' },
                  { icon: <SupportAgent sx={{ fontSize: 40 }} />, title: 'Support', desc: '24/7 expert assistance', color: '#ec4899' },
                ].map((item, index) => (
                  <Card
                    key={index}
                    sx={{
                      p: 3,
                      borderRadius: 3,
                      textAlign: 'center',
                      border: '1px solid #e2e8f0',
                      boxShadow: 'none',
                    }}
                  >
                    <Avatar
                      sx={{
                        width: 64,
                        height: 64,
                        bgcolor: `${item.color}15`,
                        color: item.color,
                        mx: 'auto',
                        mb: 2,
                      }}
                    >
                      {item.icon}
                    </Avatar>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b' }}>
                      {item.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {item.desc}
                    </Typography>
                  </Card>
                ))}
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Pricing Section */}
      <Box
        id="pricing-section"
        sx={{
          py: { xs: 8, md: 12 },
          bgcolor: '#f8fafc',
        }}
      >
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', mb: 6 }}>
            <Chip
              label="Pricing"
              sx={{
                bgcolor: '#dcfce7',
                color: '#16a34a',
                mb: 2,
                fontWeight: 600,
              }}
            />
            <Typography
              variant="h3"
              sx={{ fontWeight: 700, mb: 2, color: '#1e293b' }}
            >
              Simple, Transparent
              <br />
              <span style={{ color: '#6366f1' }}>Pricing</span>
            </Typography>
            <Typography
              variant="h6"
              color="text.secondary"
              sx={{ maxWidth: 600, mx: 'auto', mb: 4 }}
            >
              Choose the plan that fits your practice. All plans include a 30-day free trial.
            </Typography>

            {/* Billing Toggle */}
            <ToggleButtonGroup
              value={billingCycle}
              exclusive
              onChange={(e, newValue) => newValue && setBillingCycle(newValue)}
              sx={{
                bgcolor: 'white',
                border: '1px solid #e2e8f0',
                borderRadius: 3,
                '& .MuiToggleButton-root': {
                  border: 'none',
                  px: 3,
                  py: 1,
                  textTransform: 'none',
                  fontWeight: 600,
                  '&.Mui-selected': {
                    bgcolor: '#6366f1',
                    color: 'white',
                    '&:hover': { bgcolor: '#4f46e5' },
                  },
                },
              }}
            >
              <ToggleButton value="monthly">Monthly</ToggleButton>
              <ToggleButton value="yearly">
                Yearly
                <Chip
                  label="Save 20%"
                  size="small"
                  sx={{
                    ml: 1,
                    height: 20,
                    fontSize: '0.65rem',
                    bgcolor: billingCycle === 'yearly' ? 'rgba(255,255,255,0.2)' : '#dcfce7',
                    color: billingCycle === 'yearly' ? 'white' : '#16a34a',
                  }}
                />
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>

          {loadingPlans ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress />
            </Box>
          ) : plans.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
                Contact us for pricing information
              </Typography>
              <Button
                variant="contained"
                onClick={() => navigate('/signup')}
                sx={{ bgcolor: '#6366f1', '&:hover': { bgcolor: '#4f46e5' } }}
              >
                Get Started
              </Button>
            </Box>
          ) : (
            <Grid container spacing={3} justifyContent="center">
              {plans.map((plan, index) => {
                const price = billingCycle === 'monthly' ? plan.price_monthly : plan.price_yearly;
                const isPopular = plan.code === 'PROFESSIONAL' || plan.code === 'STARTER';
                const isFree = price === 0;

                return (
                  <Grid item xs={12} sm={6} md={3} key={plan.id || index}>
                    <Card
                      sx={{
                        height: '100%',
                        borderRadius: 4,
                        border: isPopular ? '2px solid #6366f1' : '1px solid #e2e8f0',
                        boxShadow: isPopular ? '0 20px 40px -12px rgba(99, 102, 241, 0.25)' : 'none',
                        position: 'relative',
                        overflow: 'visible',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          transform: 'translateY(-8px)',
                          boxShadow: '0 20px 40px -12px rgba(0,0,0,0.15)',
                        },
                      }}
                    >
                      {isPopular && (
                        <Chip
                          icon={<Star sx={{ fontSize: 16 }} />}
                          label="Popular"
                          sx={{
                            position: 'absolute',
                            top: -12,
                            left: '50%',
                            transform: 'translateX(-50%)',
                            bgcolor: '#6366f1',
                            color: 'white',
                            fontWeight: 600,
                            '& .MuiChip-icon': { color: '#fef08a' },
                          }}
                        />
                      )}
                      <CardContent sx={{ p: 4 }}>
                        <Typography
                          variant="h6"
                          sx={{ fontWeight: 700, color: '#1e293b', mb: 1 }}
                        >
                          {plan.name}
                        </Typography>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ mb: 3, minHeight: 40 }}
                        >
                          {plan.description}
                        </Typography>

                        <Box sx={{ mb: 3 }}>
                          <Typography
                            variant="h3"
                            sx={{
                              fontWeight: 800,
                              color: isFree ? '#10b981' : '#1e293b',
                              display: 'inline',
                            }}
                          >
                            {formatPrice(price)}
                          </Typography>
                          {!isFree && (
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              component="span"
                              sx={{ ml: 1 }}
                            >
                              /{billingCycle === 'monthly' ? 'month' : 'year'}
                            </Typography>
                          )}
                        </Box>

                        <Button
                          variant={isPopular ? 'contained' : 'outlined'}
                          fullWidth
                          onClick={() => navigate('/signup')}
                          sx={{
                            mb: 3,
                            py: 1.5,
                            borderRadius: 2,
                            fontWeight: 600,
                            ...(isPopular
                              ? {
                                  bgcolor: '#6366f1',
                                  '&:hover': { bgcolor: '#4f46e5' },
                                }
                              : {
                                  borderColor: '#6366f1',
                                  color: '#6366f1',
                                  '&:hover': {
                                    borderColor: '#4f46e5',
                                    bgcolor: 'rgba(99, 102, 241, 0.04)',
                                  },
                                }),
                          }}
                        >
                          {isFree ? 'Get Started Free' : 'Start Free Trial'}
                        </Button>

                        <Divider sx={{ mb: 2 }} />

                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                          {(plan.features || []).map((feature, idx) => (
                            <Box
                              key={idx}
                              sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                            >
                              <CheckCircle sx={{ color: '#10b981', fontSize: 18 }} />
                              <Typography variant="body2" color="text.secondary">
                                {feature}
                              </Typography>
                            </Box>
                          ))}
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          )}

          {/* CTA Below Pricing */}
          <Box
            sx={{
              mt: 8,
              py: 6,
              px: 4,
              borderRadius: 4,
              background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
              textAlign: 'center',
            }}
          >
            <Typography
              variant="h4"
              sx={{ color: 'white', fontWeight: 700, mb: 2 }}
            >
              Ready to Transform Your Practice?
            </Typography>
            <Typography
              variant="body1"
              sx={{ color: 'rgba(255,255,255,0.8)', mb: 4, maxWidth: 600, mx: 'auto' }}
            >
              Join thousands of professionals who trust NexPro. Start your 30-day free trial today - no credit card required.
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                size="large"
                endIcon={<ArrowForward />}
                onClick={() => navigate('/signup')}
                sx={{
                  bgcolor: 'white',
                  color: '#6366f1',
                  px: 4,
                  py: 1.5,
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  '&:hover': { bgcolor: '#f8fafc' },
                }}
              >
                Start Free 30-Day Trial
              </Button>
              <Button
                variant="outlined"
                size="large"
                onClick={() => navigate('/login')}
                sx={{
                  borderColor: 'rgba(255,255,255,0.5)',
                  color: 'white',
                  px: 4,
                  py: 1.5,
                  fontSize: '1.1rem',
                  '&:hover': {
                    borderColor: 'white',
                    bgcolor: 'rgba(255,255,255,0.1)',
                  },
                }}
              >
                Sign In
              </Button>
            </Box>
          </Box>
        </Container>
      </Box>

      {/* Footer */}
      <Box id="contact-section" sx={{ bgcolor: '#0f172a', color: 'white', py: 6 }}>
        <Container maxWidth="lg">
          <Grid container spacing={4}>
            <Grid item xs={12} md={4}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Avatar sx={{ bgcolor: '#6366f1', width: 36, height: 36 }}>
                  <Business sx={{ fontSize: 20 }} />
                </Avatar>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  NexPro
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)', mb: 2 }}>
                The complete practice management solution for modern professionals.
                Streamline your workflow, delight your clients.
              </Typography>
              {/* Chinmay Technosoft Branding */}
              <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', display: 'block', mb: 1 }}>
                  A Product By
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600, color: '#818cf8', mb: 1 }}>
                  Chinmay Technosoft Private Limited
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                  <IconButton
                    size="small"
                    component="a"
                    href="https://chinmaytechnosoft.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{ color: 'rgba(255,255,255,0.6)', '&:hover': { color: '#6366f1' } }}
                  >
                    <Language fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    component="a"
                    href="https://linkedin.com/company/chinmaytechnosoft"
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{ color: 'rgba(255,255,255,0.6)', '&:hover': { color: '#0077b5' } }}
                  >
                    <LinkedIn fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    component="a"
                    href="https://twitter.com/chinmaytechno"
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{ color: 'rgba(255,255,255,0.6)', '&:hover': { color: '#1da1f2' } }}
                  >
                    <Twitter fontSize="small" />
                  </IconButton>
                </Box>
              </Box>
            </Grid>
            <Grid item xs={6} md={2}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
                Product
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {[
                  { label: 'Features', action: () => document.getElementById('features-section')?.scrollIntoView({ behavior: 'smooth' }) },
                  { label: 'Pricing', action: () => document.getElementById('pricing-section')?.scrollIntoView({ behavior: 'smooth' }) },
                ].map((item) => (
                  <Typography
                    key={item.label}
                    variant="body2"
                    onClick={item.action}
                    sx={{
                      color: 'rgba(255,255,255,0.6)',
                      cursor: 'pointer',
                      '&:hover': { color: 'white' },
                    }}
                  >
                    {item.label}
                  </Typography>
                ))}
              </Box>
            </Grid>
            <Grid item xs={6} md={2}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
                Company
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {['About', 'Blog', 'Careers', 'Contact'].map((item) => (
                  <Typography
                    key={item}
                    variant="body2"
                    sx={{
                      color: 'rgba(255,255,255,0.6)',
                      cursor: 'pointer',
                      '&:hover': { color: 'white' },
                    }}
                  >
                    {item}
                  </Typography>
                ))}
              </Box>
            </Grid>
            <Grid item xs={6} md={2}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
                Legal
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Typography
                  variant="body2"
                  onClick={() => navigate('/privacy-policy')}
                  sx={{
                    color: 'rgba(255,255,255,0.6)',
                    cursor: 'pointer',
                    '&:hover': { color: 'white' },
                  }}
                >
                  Privacy Policy
                </Typography>
                <Typography
                  variant="body2"
                  onClick={() => navigate('/terms-of-service')}
                  sx={{
                    color: 'rgba(255,255,255,0.6)',
                    cursor: 'pointer',
                    '&:hover': { color: 'white' },
                  }}
                >
                  Terms of Service
                </Typography>
                <Typography
                  variant="body2"
                  onClick={() => navigate('/cookie-policy')}
                  sx={{
                    color: 'rgba(255,255,255,0.6)',
                    cursor: 'pointer',
                    '&:hover': { color: 'white' },
                  }}
                >
                  Cookie Policy
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={6} md={2}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
                Support
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Typography
                  variant="body2"
                  onClick={() => navigate('/login')}
                  sx={{
                    color: 'rgba(255,255,255,0.6)',
                    cursor: 'pointer',
                    '&:hover': { color: 'white' },
                  }}
                >
                  Help Center
                </Typography>
              </Box>
            </Grid>
          </Grid>
          <Divider sx={{ my: 4, borderColor: 'rgba(255,255,255,0.1)' }} />
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 2,
            }}
          >
            <Box>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                © 2025 Chinmay Technosoft Private Limited. All rights reserved.
              </Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)' }}>
                NexPro is a registered trademark of Chinmay Technosoft Private Limited. Made with love in India.
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip
                size="small"
                label="IT Act 2000 Compliant"
                sx={{
                  bgcolor: 'rgba(16, 185, 129, 0.2)',
                  color: '#10b981',
                  fontSize: '0.7rem',
                }}
              />
              <Chip
                size="small"
                label="DPDP Act 2023 Compliant"
                sx={{
                  bgcolor: 'rgba(99, 102, 241, 0.2)',
                  color: '#818cf8',
                  fontSize: '0.7rem',
                }}
              />
            </Box>
          </Box>
        </Container>
      </Box>
    </Box>
  );
}
