import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Chip,
  Badge,
  Paper,
  CircularProgress,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  Assignment as AssignmentIcon,
  CalendarMonth as CalendarIcon,
  Assessment as ReportsIcon,
  Work as WorkIcon,
  Email as EmailIcon,
  Settings as SettingsIcon,
  AccountCircle,
  Logout,
  Badge as BadgeIcon,
  AdminPanelSettings as AdminPanelSettingsIcon,
  Help as HelpIcon,
  Security as SecurityIcon,
  Notifications as NotificationsIcon,
  NotificationsActive as NotificationsActiveIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { notificationsAPI } from '../services/api';

const drawerWidth = 240;

// Define menu items with role-based access
const allMenuItems = [
  { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard', roles: ['ADMIN', 'PARTNER', 'MANAGER', 'STAFF'] },
  { text: 'Clients', icon: <PeopleIcon />, path: '/dashboard/clients', roles: ['ADMIN', 'PARTNER', 'MANAGER'] },
  { text: 'Tasks', icon: <AssignmentIcon />, path: '/dashboard/tasks', roles: ['ADMIN', 'PARTNER', 'MANAGER', 'STAFF'] },
  { text: 'Calendar', icon: <CalendarIcon />, path: '/dashboard/calendar', roles: ['ADMIN', 'PARTNER', 'MANAGER', 'STAFF'] },
  { text: 'Reports', icon: <ReportsIcon />, path: '/dashboard/reports', roles: ['ADMIN', 'PARTNER', 'MANAGER'] },
  { text: 'Work Types', icon: <WorkIcon />, path: '/dashboard/work-types', roles: ['ADMIN', 'PARTNER'] },
  { text: 'Employees', icon: <BadgeIcon />, path: '/dashboard/employees', roles: ['ADMIN', 'PARTNER'] },
  { text: 'Templates', icon: <EmailIcon />, path: '/dashboard/templates', roles: ['ADMIN', 'PARTNER'] },
  { text: 'Credentials', icon: <SecurityIcon />, path: '/dashboard/credentials', roles: ['ADMIN', 'PARTNER'] },
  { text: 'Settings', icon: <SettingsIcon />, path: '/dashboard/settings', roles: ['ADMIN', 'PARTNER'] },
  { text: 'Help & Guide', icon: <HelpIcon />, path: '/dashboard/help', roles: ['ADMIN', 'PARTNER', 'MANAGER', 'STAFF'] },
];

const getRoleLabel = (role) => {
  const labels = {
    'ADMIN': 'Admin',
    'PARTNER': 'Partner',
    'MANAGER': 'Manager',
    'STAFF': 'Staff',
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

// Helper function to get notification icon based on type
const getNotificationIcon = (type) => {
  switch (type) {
    case 'TASK_COMPLETED':
      return <CheckCircleIcon sx={{ color: '#10b981', fontSize: 20 }} />;
    case 'TASK_OVERDUE':
      return <ErrorIcon sx={{ color: '#ef4444', fontSize: 20 }} />;
    case 'TASK_ASSIGNED':
      return <InfoIcon sx={{ color: '#3b82f6', fontSize: 20 }} />;
    case 'REMINDER':
      return <WarningIcon sx={{ color: '#f59e0b', fontSize: 20 }} />;
    default:
      return <NotificationsIcon sx={{ color: '#6366f1', fontSize: 20 }} />;
  }
};

// Helper function to format relative time
const getRelativeTime = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [notificationAnchorEl, setNotificationAnchorEl] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, isPlatformAdmin } = useAuth();

  // Filter menu items based on user role
  const menuItems = allMenuItems.filter(item => {
    return item.roles.includes(user?.role);
  });

  // Fetch notifications on mount and periodically
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await notificationsAPI.getRecent();
      setNotifications(response.data.notifications || []);
      setUnreadCount(response.data.unread_count || 0);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  };

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleProfileMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleNotificationMenuOpen = (event) => {
    setNotificationAnchorEl(event.currentTarget);
  };

  const handleNotificationMenuClose = () => {
    setNotificationAnchorEl(null);
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsAPI.markAllRead();
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const handleNotificationClick = async (notification) => {
    try {
      if (!notification.is_read) {
        await notificationsAPI.markRead(notification.id);
        setUnreadCount(prev => Math.max(0, prev - 1));
        setNotifications(prev =>
          prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n)
        );
      }
      handleNotificationMenuClose();
      // Navigate to tasks if it's a task-related notification
      if (notification.work_instance_details) {
        navigate('/dashboard/tasks');
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const drawer = (
    <Box sx={{ height: '100%', background: 'linear-gradient(180deg, #667eea 0%, #764ba2 100%)' }}>
      <Toolbar sx={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'primary.main',
              fontWeight: 700,
            }}
          >
            N
          </Box>
          <Typography variant="h6" noWrap component="div" sx={{ color: 'white', fontWeight: 700 }}>
            NexPro
          </Typography>
        </Box>
      </Toolbar>
      <Divider sx={{ borderColor: 'rgba(255,255,255,0.2)' }} />

      <List sx={{ px: 1, pt: 2 }}>
        {menuItems.map((item) => {
          const isSelected = location.pathname === item.path;
          return (
            <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                selected={isSelected}
                onClick={() => {
                  navigate(item.path);
                  setMobileOpen(false);
                }}
                sx={{
                  borderRadius: 2,
                  color: 'white',
                  '&:hover': {
                    background: 'rgba(255,255,255,0.15)',
                  },
                  '&.Mui-selected': {
                    background: 'rgba(255,255,255,0.25)',
                    '&:hover': {
                      background: 'rgba(255,255,255,0.3)',
                    },
                  },
                }}
              >
                <ListItemIcon sx={{ color: 'white', minWidth: 40 }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.text}
                  primaryTypographyProps={{
                    fontWeight: isSelected ? 600 : 400,
                  }}
                />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>

      {/* Platform Admin Link */}
      {isPlatformAdmin && isPlatformAdmin() && (
        <Box sx={{ px: 1, mt: 2 }}>
          <Divider sx={{ borderColor: 'rgba(255,255,255,0.2)', mb: 2 }} />
          <ListItem disablePadding>
            <ListItemButton
              onClick={() => {
                navigate('/admin');
                setMobileOpen(false);
              }}
              sx={{
                borderRadius: 2,
                color: 'white',
                background: 'linear-gradient(135deg, rgba(26, 26, 46, 0.6) 0%, rgba(22, 33, 62, 0.6) 100%)',
                border: '1px solid rgba(255,255,255,0.2)',
                '&:hover': {
                  background: 'linear-gradient(135deg, rgba(26, 26, 46, 0.8) 0%, rgba(22, 33, 62, 0.8) 100%)',
                },
              }}
            >
              <ListItemIcon sx={{ color: '#667eea', minWidth: 40 }}>
                <AdminPanelSettingsIcon />
              </ListItemIcon>
              <ListItemText
                primary="Platform Admin"
                primaryTypographyProps={{
                  fontWeight: 600,
                  fontSize: '0.9rem',
                }}
              />
            </ListItemButton>
          </ListItem>
        </Box>
      )}
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          boxShadow: '0 4px 16px rgba(102, 126, 234, 0.3)',
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1, fontWeight: 600 }}>
            {user?.role === 'STAFF' ? 'My Tasks Dashboard' : 'Professional Office Management System'}
          </Typography>

          {/* User Info Section */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mr: 2 }}>
            <Box sx={{ textAlign: 'right', display: { xs: 'none', md: 'block' } }}>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.7rem', lineHeight: 1.2 }}>
                Logged in as
              </Typography>
              <Typography variant="body2" sx={{ color: 'white', fontWeight: 600, fontSize: '0.85rem', lineHeight: 1.2 }}>
                {user?.first_name && user?.last_name
                  ? `${user.first_name} ${user.last_name}`
                  : user?.email || user?.username}
              </Typography>
            </Box>
            <Chip
              label={getRoleLabel(user?.role)}
              color={getRoleColor(user?.role)}
              size="small"
              sx={{
                height: 24,
                '& .MuiChip-label': { px: 1, fontSize: '0.75rem' }
              }}
            />
          </Box>

          {/* Notifications Bell */}
          <IconButton
            color="inherit"
            onClick={handleNotificationMenuOpen}
            sx={{ mr: 1 }}
          >
            <Badge badgeContent={unreadCount} color="error">
              {unreadCount > 0 ? <NotificationsActiveIcon /> : <NotificationsIcon />}
            </Badge>
          </IconButton>

          {/* Notifications Dropdown */}
          <Menu
            anchorEl={notificationAnchorEl}
            open={Boolean(notificationAnchorEl)}
            onClose={handleNotificationMenuClose}
            PaperProps={{
              sx: {
                width: 380,
                maxHeight: 480,
                borderRadius: 2,
                mt: 1,
              }
            }}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          >
            <Box sx={{ p: 2, borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Notifications
              </Typography>
              {unreadCount > 0 && (
                <Chip
                  label="Mark all read"
                  size="small"
                  onClick={handleMarkAllRead}
                  sx={{ cursor: 'pointer', '&:hover': { bgcolor: '#e5e7eb' } }}
                />
              )}
            </Box>

            {notifications.length === 0 ? (
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <NotificationsIcon sx={{ fontSize: 48, color: '#d1d5db', mb: 1 }} />
                <Typography color="text.secondary">
                  No notifications yet
                </Typography>
              </Box>
            ) : (
              notifications.map((notification) => (
                <MenuItem
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  sx={{
                    py: 1.5,
                    px: 2,
                    borderBottom: '1px solid #f3f4f6',
                    bgcolor: notification.is_read ? 'transparent' : 'rgba(99, 102, 241, 0.05)',
                    '&:hover': {
                      bgcolor: notification.is_read ? '#f9fafb' : 'rgba(99, 102, 241, 0.1)',
                    },
                  }}
                >
                  <Box sx={{ display: 'flex', gap: 1.5, width: '100%' }}>
                    <Box sx={{ pt: 0.5 }}>
                      {getNotificationIcon(notification.notification_type)}
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: notification.is_read ? 400 : 600,
                          whiteSpace: 'normal',
                          wordBreak: 'break-word',
                        }}
                      >
                        {notification.title}
                      </Typography>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{
                          display: 'block',
                          whiteSpace: 'normal',
                          wordBreak: 'break-word',
                        }}
                      >
                        {notification.message}
                      </Typography>
                      {notification.work_instance_details && (
                        <Chip
                          label={notification.work_instance_details.work_type}
                          size="small"
                          sx={{ mt: 0.5, height: 20, fontSize: '0.7rem' }}
                        />
                      )}
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                        {getRelativeTime(notification.created_at)}
                      </Typography>
                    </Box>
                    {!notification.is_read && (
                      <Box
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          bgcolor: '#6366f1',
                          flexShrink: 0,
                          mt: 0.5,
                        }}
                      />
                    )}
                  </Box>
                </MenuItem>
              ))
            )}
          </Menu>

          <IconButton
            size="large"
            edge="end"
            color="inherit"
            onClick={handleProfileMenuOpen}
          >
            <AccountCircle />
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
          >
            <MenuItem disabled>
              <Typography variant="body2" color="text.secondary">
                {user?.email}
              </Typography>
            </MenuItem>
            <Divider />
            <MenuItem onClick={() => { handleMenuClose(); navigate('/dashboard/profile'); }}>
              <ListItemIcon>
                <AccountCircle fontSize="small" />
              </ListItemIcon>
              <ListItemText>My Profile</ListItemText>
            </MenuItem>
            <MenuItem onClick={handleLogout}>
              <ListItemIcon>
                <Logout fontSize="small" />
              </ListItemIcon>
              <ListItemText>Logout</ListItemText>
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
              border: 'none',
            },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
              border: 'none',
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          mt: 8,
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
}
