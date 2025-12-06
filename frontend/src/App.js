import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { CircularProgress, Box } from '@mui/material';
import { HelmetProvider } from 'react-helmet-async';

import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import CookiePolicy from './pages/CookiePolicy';
import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import Tasks from './pages/Tasks';
import Reports from './pages/Reports';
import WorkTypes from './pages/WorkTypes';
import Templates from './pages/Templates';
import Settings from './pages/Settings';
import Employees from './pages/Employees';
import Profile from './pages/Profile';
import HelpGuide from './pages/HelpGuide';
import CredentialVault from './pages/CredentialVault';
import GoogleSyncHub from './pages/GoogleSyncHub';
import Layout from './components/Layout';
import SuperAdminLayout from './components/SuperAdminLayout';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import Organizations from './pages/admin/Organizations';
import TrialManagement from './pages/admin/TrialManagement';
import AllUsers from './pages/admin/AllUsers';
import Subscriptions from './pages/admin/Subscriptions';
import PlatformSettings from './pages/admin/PlatformSettings';
import GoogleQuotaMonitor from './pages/admin/GoogleQuotaMonitor';
import LandingPage from './pages/LandingPage';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#6366f1',
      light: '#818cf8',
      dark: '#4f46e5',
    },
    secondary: {
      main: '#ec4899',
      light: '#f472b6',
      dark: '#db2777',
    },
    success: {
      main: '#10b981',
    },
    warning: {
      main: '#f59e0b',
    },
    error: {
      main: '#ef4444',
    },
    info: {
      main: '#3b82f6',
    },
    background: {
      default: '#f8fafc',
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 600,
    },
    h5: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: 8,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
        },
      },
    },
  },
});

// Protected Route component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  return isAuthenticated ? children : <Navigate to="/home" />;
};

// Platform Admin Route component
const PlatformAdminRoute = ({ children }) => {
  const { isAuthenticated, loading, isPlatformAdmin } = useAuth();

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/home" />;
  }

  if (!isPlatformAdmin()) {
    return <Navigate to="/" />;
  }

  return children;
};

// Public Route component (for login/signup - redirects authenticated users to dashboard)
const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  return isAuthenticated ? <Navigate to="/dashboard" /> : children;
};

// Landing Route component (for home page - redirects authenticated users to dashboard)
const LandingRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  return isAuthenticated ? <Navigate to="/dashboard" /> : children;
};

function AppRoutes() {
  return (
    <Router>
      <Routes>
        {/* Landing Page - Home for unauthenticated users */}
        <Route path="/home" element={
          <LandingRoute>
            <LandingPage />
          </LandingRoute>
        } />

        {/* Auth Routes */}
        <Route path="/login" element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        } />
        <Route path="/signup" element={
          <PublicRoute>
            <Signup />
          </PublicRoute>
        } />
        <Route path="/forgot-password" element={
          <PublicRoute>
            <ForgotPassword />
          </PublicRoute>
        } />

        {/* Public Legal Pages - No auth required */}
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/terms-of-service" element={<TermsOfService />} />
        <Route path="/cookie-policy" element={<CookiePolicy />} />

        {/* Dashboard Routes - Protected */}
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }>
          <Route index element={<Dashboard />} />
          <Route path="clients" element={<Clients />} />
          <Route path="tasks" element={<Tasks />} />
          <Route path="reports" element={<Reports />} />
          <Route path="work-types" element={<WorkTypes />} />
          <Route path="employees" element={<Employees />} />
          <Route path="templates" element={<Templates />} />
          <Route path="credentials" element={<CredentialVault />} />
          <Route path="google-sync" element={<GoogleSyncHub />} />
          <Route path="settings" element={<Settings />} />
          <Route path="profile" element={<Profile />} />
          <Route path="help" element={<HelpGuide />} />
        </Route>

        {/* Legacy route support - redirect / to appropriate page */}
        <Route path="/" element={<Navigate to="/home" replace />} />

        {/* Legacy routes redirect to new dashboard paths */}
        <Route path="/clients" element={<Navigate to="/dashboard/clients" replace />} />
        <Route path="/tasks" element={<Navigate to="/dashboard/tasks" replace />} />
        <Route path="/reports" element={<Navigate to="/dashboard/reports" replace />} />
        <Route path="/work-types" element={<Navigate to="/dashboard/work-types" replace />} />
        <Route path="/employees" element={<Navigate to="/dashboard/employees" replace />} />
        <Route path="/templates" element={<Navigate to="/dashboard/templates" replace />} />
        <Route path="/settings" element={<Navigate to="/dashboard/settings" replace />} />
        <Route path="/profile" element={<Navigate to="/dashboard/profile" replace />} />
        <Route path="/help" element={<Navigate to="/dashboard/help" replace />} />

        {/* Platform Admin Routes */}
        <Route path="/admin" element={
          <PlatformAdminRoute>
            <SuperAdminLayout />
          </PlatformAdminRoute>
        }>
          <Route index element={<SuperAdminDashboard />} />
          <Route path="organizations" element={<Organizations />} />
          <Route path="trials" element={<TrialManagement />} />
          <Route path="users" element={<AllUsers />} />
          <Route path="subscriptions" element={<Subscriptions />} />
          <Route path="plans" element={<Navigate to="/admin/subscriptions" replace />} />
          <Route path="settings" element={<PlatformSettings />} />
          <Route path="google-quota" element={<GoogleQuotaMonitor />} />
        </Route>
      </Routes>
    </Router>
  );
}

function App() {
  return (
    <HelmetProvider>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </ThemeProvider>
    </HelmetProvider>
  );
}

export default App;
