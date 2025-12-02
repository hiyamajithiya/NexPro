import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Typography,
  Box,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Avatar,
  LinearProgress,
  Paper,
} from '@mui/material';
import {
  People as PeopleIcon,
  Assignment as AssignmentIcon,
  Warning as WarningIcon,
  Today as TodayIcon,
  DateRange as DateRangeIcon,
  CheckCircle as CheckCircleIcon,
  PlayArrow as PlayArrowIcon,
  TrendingUp as TrendingUpIcon,
  AccessTime as AccessTimeIcon,
  Business as BusinessIcon,
} from '@mui/icons-material';
import { dashboardAPI } from '../services/api';
import { format } from 'date-fns';
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

const getStatusChip = (status) => {
  const statusColors = {
    'NOT_STARTED': 'default',
    'STARTED': 'info',
    'IN_PROGRESS': 'warning',
    'COMPLETED': 'success',
    'OVERDUE': 'error',
  };

  const statusLabels = {
    'NOT_STARTED': 'Not Started',
    'STARTED': 'Started',
    'IN_PROGRESS': 'In Progress',
    'COMPLETED': 'Completed',
    'OVERDUE': 'Overdue',
  };

  return (
    <Chip
      label={statusLabels[status] || status}
      color={statusColors[status] || 'default'}
      size="small"
    />
  );
};

const getRoleLabel = (role) => {
  const labels = {
    'ADMIN': 'Administrator',
    'PARTNER': 'Partner',
    'MANAGER': 'Manager',
    'STAFF': 'Staff Member',
  };
  return labels[role] || role;
};

const getRoleGradient = (role) => {
  const gradients = {
    'ADMIN': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    'PARTNER': 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
    'MANAGER': 'linear-gradient(135deg, #fc4a1a 0%, #f7b733 100%)',
    'STAFF': 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  };
  return gradients[role] || gradients['STAFF'];
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [upcomingTasks, setUpcomingTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const isStaff = user?.role === 'STAFF';
  const isManager = user?.role === 'MANAGER';
  const isPartner = user?.role === 'PARTNER';
  const isAdmin = user?.role === 'ADMIN';

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [summaryRes, tasksRes] = await Promise.all([
          dashboardAPI.getSummary(),
          dashboardAPI.getUpcomingTasks(10),
        ]);

        setSummary(summaryRes.data);
        setUpcomingTasks(tasksRes.data);
      } catch (err) {
        setError('Failed to load dashboard data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Navigation handlers for stat cards
  const handleNavigateToClients = () => navigate('/clients');
  const handleNavigateToTasks = (status = null) => {
    navigate('/tasks', { state: { filterStatus: status } });
  };
  const handleNavigateToCalendar = () => navigate('/calendar');

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  // Calculate progress percentage for visual indicators
  const totalTasks = (summary?.pending_tasks || 0) + (summary?.completed_this_month || 0);
  const completionRate = totalTasks > 0 ? Math.round((summary?.completed_this_month / totalTasks) * 100) : 0;

  // Staff Dashboard View
  if (isStaff) {
    return (
      <Container maxWidth="xl">
        {/* Welcome Header */}
        <Card
          sx={{
            background: getRoleGradient(user?.role),
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
                {(user?.first_name?.[0] || user?.email?.[0] || 'U').toUpperCase()}
              </Avatar>
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 600 }}>
                  Welcome back, {user?.first_name || user?.email?.split('@')[0]}!
                </Typography>
                <Typography variant="body1" sx={{ opacity: 0.9, mt: 0.5 }}>
                  {getRoleLabel(user?.role)} • Here's your task overview for today
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>

        {/* Stats Grid - Fixed alignment with 3 cards per row */}
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6} md={4}>
            <StatCard
              title="My Active Tasks"
              value={summary?.my_tasks || summary?.pending_tasks || 0}
              icon={<AssignmentIcon sx={{ fontSize: 48 }} />}
              gradient="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
              onClick={() => handleNavigateToTasks()}
              subtitle="Tasks assigned to you"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <StatCard
              title="In Progress"
              value={summary?.pending_tasks || 0}
              icon={<PlayArrowIcon sx={{ fontSize: 48 }} />}
              gradient="linear-gradient(135deg, #f093fb 0%, #f5576c 100%)"
              onClick={() => handleNavigateToTasks('IN_PROGRESS')}
              subtitle="Currently working on"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <StatCard
              title="Overdue Tasks"
              value={summary?.overdue_tasks || 0}
              icon={<WarningIcon sx={{ fontSize: 48 }} />}
              gradient="linear-gradient(135deg, #fa709a 0%, #fee140 100%)"
              onClick={() => handleNavigateToTasks('OVERDUE')}
              subtitle="Needs immediate attention"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <StatCard
              title="Due Today"
              value={summary?.today_due || 0}
              icon={<TodayIcon sx={{ fontSize: 48 }} />}
              gradient="linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)"
              onClick={handleNavigateToCalendar}
              subtitle="Complete by end of day"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <StatCard
              title="Due This Week"
              value={summary?.week_due || 0}
              icon={<DateRangeIcon sx={{ fontSize: 48 }} />}
              gradient="linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)"
              onClick={handleNavigateToCalendar}
              subtitle="Plan your week ahead"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <StatCard
              title="Completed This Month"
              value={summary?.completed_this_month || 0}
              icon={<CheckCircleIcon sx={{ fontSize: 48 }} />}
              gradient="linear-gradient(135deg, #30cfd0 0%, #330867 100%)"
              onClick={() => handleNavigateToTasks('COMPLETED')}
              subtitle="Great progress!"
            />
          </Grid>
        </Grid>

        {/* Progress Card */}
        <Card sx={{ mt: 4, borderRadius: 3, boxShadow: 3 }}>
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Your Monthly Progress
              </Typography>
              <Chip
                label={`${completionRate}% Complete`}
                color={completionRate >= 70 ? 'success' : completionRate >= 40 ? 'warning' : 'default'}
              />
            </Box>
            <LinearProgress
              variant="determinate"
              value={completionRate}
              sx={{
                height: 10,
                borderRadius: 5,
                bgcolor: 'grey.200',
                '& .MuiLinearProgress-bar': {
                  borderRadius: 5,
                  background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
                }
              }}
            />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {summary?.completed_this_month || 0} tasks completed out of {totalTasks} total this month
            </Typography>
          </CardContent>
        </Card>

        {/* Upcoming Tasks Table */}
        <Card sx={{ mt: 4, borderRadius: 3, boxShadow: 3 }}>
          <CardContent>
            <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
              My Upcoming Tasks
            </Typography>
            {upcomingTasks.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <CheckCircleIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
                <Typography variant="h6" color="text.secondary">
                  No pending tasks assigned to you
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  You're all caught up!
                </Typography>
              </Box>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Client</TableCell>
                      <TableCell>Work Type</TableCell>
                      <TableCell>Period</TableCell>
                      <TableCell>Due Date</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {upcomingTasks.map((task) => (
                      <TableRow
                        key={task.id}
                        sx={{
                          cursor: 'pointer',
                          '&:hover': { bgcolor: 'action.hover' }
                        }}
                        onClick={() => navigate('/tasks')}
                      >
                        <TableCell>{task.client_name}</TableCell>
                        <TableCell>{task.work_type_name}</TableCell>
                        <TableCell>{task.period_label}</TableCell>
                        <TableCell>
                          {format(new Date(task.due_date), 'dd-MMM-yyyy')}
                        </TableCell>
                        <TableCell>{getStatusChip(task.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      </Container>
    );
  }

  // Manager Dashboard View
  if (isManager) {
    return (
      <Container maxWidth="xl">
        <Card
          sx={{
            background: getRoleGradient(user?.role),
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
                {(user?.first_name?.[0] || user?.email?.[0] || 'M').toUpperCase()}
              </Avatar>
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 600 }}>
                  Manager Dashboard
                </Typography>
                <Typography variant="body1" sx={{ opacity: 0.9, mt: 0.5 }}>
                  Welcome, {user?.first_name || user?.email?.split('@')[0]} • Team Performance Overview
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>

        <Grid container spacing={3}>
          <Grid item xs={12} sm={6} md={4}>
            <StatCard
              title="Total Clients"
              value={summary?.total_clients || 0}
              icon={<PeopleIcon sx={{ fontSize: 48 }} />}
              gradient="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
              onClick={handleNavigateToClients}
              subtitle="Active client accounts"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <StatCard
              title="In Progress Tasks"
              value={summary?.pending_tasks || 0}
              icon={<AssignmentIcon sx={{ fontSize: 48 }} />}
              gradient="linear-gradient(135deg, #f093fb 0%, #f5576c 100%)"
              onClick={() => handleNavigateToTasks('IN_PROGRESS')}
              subtitle="Team workload"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <StatCard
              title="Overdue Tasks"
              value={summary?.overdue_tasks || 0}
              icon={<WarningIcon sx={{ fontSize: 48 }} />}
              gradient="linear-gradient(135deg, #fa709a 0%, #fee140 100%)"
              onClick={() => handleNavigateToTasks('OVERDUE')}
              subtitle="Requires attention"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <StatCard
              title="Due Today"
              value={summary?.today_due || 0}
              icon={<TodayIcon sx={{ fontSize: 48 }} />}
              gradient="linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)"
              onClick={handleNavigateToCalendar}
              subtitle="Today's deadlines"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <StatCard
              title="Due This Week"
              value={summary?.week_due || 0}
              icon={<DateRangeIcon sx={{ fontSize: 48 }} />}
              gradient="linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)"
              onClick={handleNavigateToCalendar}
              subtitle="Weekly planning"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <StatCard
              title="Completed This Month"
              value={summary?.completed_this_month || 0}
              icon={<CheckCircleIcon sx={{ fontSize: 48 }} />}
              gradient="linear-gradient(135deg, #30cfd0 0%, #330867 100%)"
              onClick={() => handleNavigateToTasks('COMPLETED')}
              subtitle="Team achievement"
            />
          </Grid>
        </Grid>

        <Card sx={{ mt: 4, borderRadius: 3, boxShadow: 3 }}>
          <CardContent>
            <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
              Upcoming Tasks
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Client</TableCell>
                    <TableCell>Work Type</TableCell>
                    <TableCell>Period</TableCell>
                    <TableCell>Due Date</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Assigned To</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {upcomingTasks.map((task) => (
                    <TableRow
                      key={task.id}
                      sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                      onClick={() => navigate('/tasks')}
                    >
                      <TableCell>{task.client_name}</TableCell>
                      <TableCell>{task.work_type_name}</TableCell>
                      <TableCell>{task.period_label}</TableCell>
                      <TableCell>
                        {format(new Date(task.due_date), 'dd-MMM-yyyy')}
                      </TableCell>
                      <TableCell>{getStatusChip(task.status)}</TableCell>
                      <TableCell>{task.assigned_to_name || 'Unassigned'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </Container>
    );
  }

  // Admin/Partner Dashboard View (Full Access)
  return (
    <Container maxWidth="xl">
      <Card
        sx={{
          background: getRoleGradient(user?.role),
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
              {(user?.first_name?.[0] || user?.email?.[0] || 'A').toUpperCase()}
            </Avatar>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 600 }}>
                {isAdmin ? 'Admin Dashboard' : 'Partner Dashboard'}
              </Typography>
              <Typography variant="body1" sx={{ opacity: 0.9, mt: 0.5 }}>
                Welcome, {user?.first_name || user?.email?.split('@')[0]} • Complete Practice Overview
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            title="Total Active Clients"
            value={summary?.total_clients || 0}
            icon={<BusinessIcon sx={{ fontSize: 48 }} />}
            gradient="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
            onClick={handleNavigateToClients}
            subtitle="Manage client portfolio"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            title="In Progress Tasks"
            value={summary?.pending_tasks || 0}
            icon={<AssignmentIcon sx={{ fontSize: 48 }} />}
            gradient="linear-gradient(135deg, #f093fb 0%, #f5576c 100%)"
            onClick={() => handleNavigateToTasks('IN_PROGRESS')}
            subtitle="Active work items"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            title="Overdue Tasks"
            value={summary?.overdue_tasks || 0}
            icon={<WarningIcon sx={{ fontSize: 48 }} />}
            gradient="linear-gradient(135deg, #fa709a 0%, #fee140 100%)"
            onClick={() => handleNavigateToTasks('OVERDUE')}
            subtitle="Immediate attention needed"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            title="Due Today"
            value={summary?.today_due || 0}
            icon={<TodayIcon sx={{ fontSize: 48 }} />}
            gradient="linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)"
            onClick={handleNavigateToCalendar}
            subtitle="Today's deadlines"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            title="Due This Week"
            value={summary?.week_due || 0}
            icon={<DateRangeIcon sx={{ fontSize: 48 }} />}
            gradient="linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)"
            onClick={handleNavigateToCalendar}
            subtitle="Weekly overview"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            title="Completed This Month"
            value={summary?.completed_this_month || 0}
            icon={<CheckCircleIcon sx={{ fontSize: 48 }} />}
            gradient="linear-gradient(135deg, #30cfd0 0%, #330867 100%)"
            onClick={() => handleNavigateToTasks('COMPLETED')}
            subtitle="Monthly achievements"
          />
        </Grid>
      </Grid>

      {/* Quick Stats Row */}
      <Grid container spacing={3} sx={{ mt: 1 }}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, borderRadius: 3, boxShadow: 2, height: '100%' }}>
            <Box display="flex" alignItems="center" gap={2} mb={2}>
              <TrendingUpIcon color="primary" />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Performance Summary
              </Typography>
            </Box>
            <Box>
              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography variant="body2" color="text.secondary">Task Completion Rate</Typography>
                <Typography variant="body2" fontWeight={600}>{completionRate}%</Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={completionRate}
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
                <Typography variant="body2" color="text.secondary">Active Tasks</Typography>
                <Typography variant="body2" fontWeight={600}>{summary?.pending_tasks || 0}</Typography>
              </Box>
              <Box display="flex" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">Overdue Rate</Typography>
                <Typography variant="body2" fontWeight={600} color={summary?.overdue_tasks > 0 ? 'error.main' : 'success.main'}>
                  {summary?.overdue_tasks || 0} tasks
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, borderRadius: 3, boxShadow: 2, height: '100%' }}>
            <Box display="flex" alignItems="center" gap={2} mb={2}>
              <AccessTimeIcon color="primary" />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Upcoming Deadlines
              </Typography>
            </Box>
            <Box>
              <Box display="flex" justifyContent="space-between" alignItems="center" py={1} borderBottom="1px solid #eee">
                <Typography variant="body2">Today</Typography>
                <Chip label={summary?.today_due || 0} size="small" color={summary?.today_due > 0 ? 'warning' : 'default'} />
              </Box>
              <Box display="flex" justifyContent="space-between" alignItems="center" py={1} borderBottom="1px solid #eee">
                <Typography variant="body2">This Week</Typography>
                <Chip label={summary?.week_due || 0} size="small" color="info" />
              </Box>
              <Box display="flex" justifyContent="space-between" alignItems="center" py={1}>
                <Typography variant="body2">Completed This Month</Typography>
                <Chip label={summary?.completed_this_month || 0} size="small" color="success" />
              </Box>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      <Card sx={{ mt: 4, borderRadius: 3, boxShadow: 3 }}>
        <CardContent>
          <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
            Upcoming Tasks
          </Typography>
          {upcomingTasks.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <CheckCircleIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                No upcoming tasks
              </Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Client</TableCell>
                    <TableCell>Work Type</TableCell>
                    <TableCell>Period</TableCell>
                    <TableCell>Due Date</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Assigned To</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {upcomingTasks.map((task) => (
                    <TableRow
                      key={task.id}
                      sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                      onClick={() => navigate('/tasks')}
                    >
                      <TableCell>{task.client_name}</TableCell>
                      <TableCell>{task.work_type_name}</TableCell>
                      <TableCell>{task.period_label}</TableCell>
                      <TableCell>
                        {format(new Date(task.due_date), 'dd-MMM-yyyy')}
                      </TableCell>
                      <TableCell>{getStatusChip(task.status)}</TableCell>
                      <TableCell>{task.assigned_to_name || 'Unassigned'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>
    </Container>
  );
}
