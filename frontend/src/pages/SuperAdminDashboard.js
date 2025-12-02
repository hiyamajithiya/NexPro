import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Alert,
  Chip,
  Avatar,
  LinearProgress,
  Paper,
} from '@mui/material';
import {
  Business,
  People,
  TrendingUp,
  Warning,
  CheckCircle,
  Block,
  Groups,
  Assignment,
  AccessTime,
  AdminPanelSettings,
} from '@mui/icons-material';
import { platformAdminAPI } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const StatCard = ({ title, value, icon, gradient, onClick, subtitle }) => (
  <Card
    onClick={onClick}
    sx={{
      background: gradient,
      color: 'white',
      borderRadius: 3,
      boxShadow: 3,
      cursor: onClick ? 'pointer' : 'default',
      transition: 'transform 0.2s, box-shadow 0.2s',
      height: '100%',
      '&:hover': {
        transform: onClick ? 'translateY(-4px)' : 'none',
        boxShadow: onClick ? 6 : 3,
      },
    }}
  >
    <CardContent>
      <Box display="flex" alignItems="center" justifyContent="space-between">
        <Box>
          <Typography sx={{ opacity: 0.9, fontSize: '0.85rem' }} gutterBottom>
            {title}
          </Typography>
          <Typography variant="h3" sx={{ fontWeight: 700 }}>
            {value}
          </Typography>
          {subtitle && (
            <Typography sx={{ opacity: 0.8, fontSize: '0.75rem', mt: 0.5 }}>
              {subtitle}
            </Typography>
          )}
        </Box>
        <Box sx={{ opacity: 0.9, display: 'flex', alignItems: 'center' }}>
          {icon}
        </Box>
      </Box>
    </CardContent>
  </Card>
);

const planColors = {
  FREE: '#6B7280',
  STARTER: '#3B82F6',
  PROFESSIONAL: '#8B5CF6',
  ENTERPRISE: '#10B981',
};

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState(null);
  const [expiringTrials, setExpiringTrials] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [statsRes, trialsRes] = await Promise.all([
        platformAdminAPI.getStats(),
        platformAdminAPI.getExpiringTrials(),
      ]);
      setStats(statsRes.data);
      setExpiringTrials(trialsRes.data);
    } catch (err) {
      setError('Failed to load platform data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  // Calculate metrics
  const totalOrgs = stats?.organizations?.total || 0;
  const activeOrgs = stats?.organizations?.active || 0;
  const conversionRate = totalOrgs > 0 ? Math.round((activeOrgs / totalOrgs) * 100) : 0;

  return (
    <Box>
      {/* Welcome Header */}
      <Card
        sx={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          mb: 4,
          borderRadius: 3,
        }}
      >
        <CardContent sx={{ py: 3 }}>
          <Box display="flex" alignItems="center" gap={2}>
            <Avatar
              sx={{
                width: 64,
                height: 64,
                bgcolor: 'rgba(255,255,255,0.2)',
                fontSize: '1.5rem',
                fontWeight: 700,
              }}
            >
              <AdminPanelSettings sx={{ fontSize: 32 }} />
            </Avatar>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 600 }}>
                Platform Administration
              </Typography>
              <Typography variant="body1" sx={{ opacity: 0.9, mt: 0.5 }}>
                Welcome, {user?.email?.split('@')[0]} • Platform-wide Overview
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Stats Overview - Row 1 */}
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            title="Total Organizations"
            value={stats?.organizations?.total || 0}
            icon={<Business sx={{ fontSize: 48 }} />}
            gradient="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
            onClick={() => navigate('/admin/organizations')}
            subtitle={`${stats?.organizations?.new_this_month || 0} new this month`}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            title="Active Organizations"
            value={stats?.organizations?.active || 0}
            icon={<CheckCircle sx={{ fontSize: 48 }} />}
            gradient="linear-gradient(135deg, #11998e 0%, #38ef7d 100%)"
            onClick={() => navigate('/admin/organizations')}
            subtitle="Paid subscriptions"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            title="Trial Organizations"
            value={stats?.organizations?.trial || 0}
            icon={<AccessTime sx={{ fontSize: 48 }} />}
            gradient="linear-gradient(135deg, #f093fb 0%, #f5576c 100%)"
            onClick={() => navigate('/admin/trials')}
            subtitle={`${stats?.trials?.expiring_soon || 0} expiring soon`}
          />
        </Grid>
      </Grid>

      {/* Stats Overview - Row 2 */}
      <Grid container spacing={3} sx={{ mt: 0.5 }}>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            title="Total Users"
            value={stats?.users?.total || 0}
            icon={<People sx={{ fontSize: 48 }} />}
            gradient="linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)"
            onClick={() => navigate('/admin/users')}
            subtitle={`${stats?.users?.active || 0} active`}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            title="Total Clients"
            value={stats?.platform?.total_clients || 0}
            icon={<Groups sx={{ fontSize: 48 }} />}
            gradient="linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)"
            subtitle="Across all organizations"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            title="Total Tasks"
            value={stats?.platform?.total_tasks || 0}
            icon={<Assignment sx={{ fontSize: 48 }} />}
            gradient="linear-gradient(135deg, #30cfd0 0%, #330867 100%)"
            subtitle={`${stats?.platform?.pending_tasks || 0} pending`}
          />
        </Grid>
      </Grid>

      {/* Stats Overview - Row 3 */}
      <Grid container spacing={3} sx={{ mt: 0.5 }}>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            title="Suspended"
            value={stats?.organizations?.suspended || 0}
            icon={<Block sx={{ fontSize: 48 }} />}
            gradient="linear-gradient(135deg, #fa709a 0%, #fee140 100%)"
            onClick={() => navigate('/admin/organizations')}
            subtitle="Inactive accounts"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            title="Expired Trials"
            value={stats?.trials?.expired || 0}
            icon={<Warning sx={{ fontSize: 48 }} />}
            gradient="linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%)"
            onClick={() => navigate('/admin/trials')}
            subtitle="Need follow-up"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            title="Revenue Growth"
            value={`${conversionRate}%`}
            icon={<TrendingUp sx={{ fontSize: 48 }} />}
            gradient="linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)"
            onClick={() => navigate('/admin/subscriptions')}
            subtitle="Trial to paid conversion"
          />
        </Grid>
      </Grid>

      {/* Quick Stats Row */}
      <Grid container spacing={3} sx={{ mt: 3 }}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, borderRadius: 3, boxShadow: 2, height: '100%' }}>
            <Box display="flex" alignItems="center" gap={2} mb={2}>
              <TrendingUp color="primary" />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Platform Performance
              </Typography>
            </Box>
            <Box>
              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography variant="body2" color="text.secondary">Trial Conversion Rate</Typography>
                <Typography variant="body2" fontWeight={600}>{conversionRate}%</Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={conversionRate}
                sx={{
                  height: 8,
                  borderRadius: 4,
                  mb: 2,
                  bgcolor: 'grey.200',
                  '& .MuiLinearProgress-bar': {
                    borderRadius: 4,
                    background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
                  }
                }}
              />
              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography variant="body2" color="text.secondary">Active Organizations</Typography>
                <Typography variant="body2" fontWeight={600}>{stats?.organizations?.active || 0}</Typography>
              </Box>
              <Box display="flex" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">Total Users</Typography>
                <Typography variant="body2" fontWeight={600}>{stats?.users?.total || 0}</Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, borderRadius: 3, boxShadow: 2, height: '100%' }}>
            <Box display="flex" alignItems="center" gap={2} mb={2}>
              <AccessTime color="primary" />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Plan Distribution
              </Typography>
            </Box>
            <Box>
              {stats?.plan_distribution && Object.entries(stats.plan_distribution).map(([plan, count]) => (
                <Box key={plan} display="flex" justifyContent="space-between" alignItems="center" py={1} borderBottom="1px solid #eee">
                  <Box display="flex" alignItems="center" gap={1}>
                    <Box
                      sx={{
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        bgcolor: planColors[plan] || '#6B7280',
                      }}
                    />
                    <Typography variant="body2">{plan}</Typography>
                  </Box>
                  <Chip
                    label={count}
                    size="small"
                    sx={{
                      bgcolor: `${planColors[plan]}22`,
                      color: planColors[plan],
                      fontWeight: 600,
                    }}
                  />
                </Box>
              ))}
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Expiring Trials Card */}
      <Card sx={{ mt: 4, borderRadius: 3, boxShadow: 3 }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h5" sx={{ fontWeight: 600 }}>
              Trials Expiring Soon
            </Typography>
            <Chip
              label={`${expiringTrials.length} organizations`}
              color="warning"
              size="small"
            />
          </Box>
          {expiringTrials.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <CheckCircle sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                No trials expiring soon
              </Typography>
              <Typography variant="body2" color="text.secondary">
                All trial organizations are in good standing
              </Typography>
            </Box>
          ) : (
            <Grid container spacing={2}>
              {expiringTrials.slice(0, 6).map((org) => (
                <Grid item xs={12} sm={6} md={4} key={org.id}>
                  <Paper
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      border: org.is_expired ? '2px solid #ef4444' : '1px solid #e5e7eb',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      '&:hover': {
                        boxShadow: 3,
                        transform: 'translateY(-2px)',
                      },
                    }}
                    onClick={() => navigate('/admin/trials')}
                  >
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                      <Box>
                        <Typography variant="subtitle1" fontWeight={600}>
                          {org.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {org.email}
                        </Typography>
                      </Box>
                      <Chip
                        size="small"
                        label={org.is_expired ? 'Expired' : `${org.days_remaining} days`}
                        color={org.is_expired ? 'error' : 'warning'}
                      />
                    </Box>
                    <Box display="flex" gap={1} mt={1}>
                      <Chip
                        size="small"
                        label={`${org.user_count || 0} users`}
                        variant="outlined"
                        sx={{ fontSize: '0.7rem' }}
                      />
                      <Chip
                        size="small"
                        label={`${org.client_count || 0} clients`}
                        variant="outlined"
                        sx={{ fontSize: '0.7rem' }}
                      />
                    </Box>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
