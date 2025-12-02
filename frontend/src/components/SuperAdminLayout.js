import React, { useState } from 'react';
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
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Business as BusinessIcon,
  People as PeopleIcon,
  Settings as SettingsIcon,
  AccountCircle,
  Logout,
  AdminPanelSettings,
  TrendingUp,
  AccessTime,
  LocalOffer,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';

const drawerWidth = 260;

const menuItems = [
  { text: 'Dashboard', icon: <DashboardIcon />, path: '/admin' },
  { text: 'Organizations', icon: <BusinessIcon />, path: '/admin/organizations' },
  { text: 'Trial Management', icon: <AccessTime />, path: '/admin/trials' },
  { text: 'All Users', icon: <PeopleIcon />, path: '/admin/users' },
  { text: 'Subscriptions', icon: <TrendingUp />, path: '/admin/subscriptions' },
  { text: 'Manage Plans', icon: <LocalOffer />, path: '/admin/plans' },
  { text: 'Platform Settings', icon: <SettingsIcon />, path: '/admin/settings' },
];

export default function SuperAdminLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleProfileMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    navigate('/home');
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
              color: '#667eea',
            }}
          >
            <AdminPanelSettings />
          </Box>
          <Box>
            <Typography variant="subtitle1" noWrap sx={{ color: 'white', fontWeight: 700, lineHeight: 1.2 }}>
              NexPro
            </Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
              Platform Admin
            </Typography>
          </Box>
        </Box>
      </Toolbar>
      <Divider sx={{ borderColor: 'rgba(255,255,255,0.2)' }} />

      {/* Admin Info */}
      <Box sx={{ px: 2, py: 2, borderBottom: '1px solid rgba(255,255,255,0.15)' }}>
        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: 1 }}>
          Super Admin
        </Typography>
        <Typography variant="body1" sx={{ color: 'white', fontWeight: 600, mt: 0.5 }}>
          {user?.email}
        </Typography>
        <Chip
          label="Platform Admin"
          size="small"
          sx={{
            mt: 1,
            height: 22,
            background: 'rgba(255,255,255,0.2)',
            color: 'white',
            fontWeight: 600,
            fontSize: '0.7rem',
          }}
        />
      </Box>

      <List sx={{ px: 1, pt: 2 }}>
        {menuItems.map((item) => {
          const isSelected = location.pathname === item.path ||
            (item.path === '/admin' && location.pathname === '/admin');
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
                  color: 'rgba(255,255,255,0.8)',
                  '&:hover': {
                    background: 'rgba(255,255,255,0.15)',
                    color: 'white',
                  },
                  '&.Mui-selected': {
                    background: 'rgba(255,255,255,0.25)',
                    color: 'white',
                    '&:hover': {
                      background: 'rgba(255,255,255,0.3)',
                    },
                  },
                }}
              >
                <ListItemIcon sx={{ color: 'inherit', minWidth: 40 }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.text}
                  primaryTypographyProps={{
                    fontWeight: isSelected ? 600 : 400,
                    fontSize: '0.9rem',
                  }}
                />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>

      {/* Back to Tenant View */}
      <Box sx={{ position: 'absolute', bottom: 16, left: 0, right: 0, px: 2 }}>
        <Divider sx={{ borderColor: 'rgba(255,255,255,0.2)', mb: 2 }} />
        <ListItemButton
          onClick={() => navigate('/')}
          sx={{
            borderRadius: 2,
            color: 'rgba(255,255,255,0.7)',
            border: '1px solid rgba(255,255,255,0.2)',
            '&:hover': {
              background: 'rgba(255,255,255,0.1)',
              color: 'white',
            },
          }}
        >
          <ListItemIcon sx={{ color: 'inherit', minWidth: 40 }}>
            <BusinessIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary="Back to Tenant View"
            primaryTypographyProps={{ fontSize: '0.85rem' }}
          />
        </ListItemButton>
      </Box>
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
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexGrow: 1 }}>
            <AdminPanelSettings />
            <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 600 }}>
              Platform Administration
            </Typography>
          </Box>
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
          minHeight: '100vh',
          background: '#f8fafc',
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
}
