import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing auth on mount
    const token = localStorage.getItem('access_token');
    const userData = localStorage.getItem('user_data');
    const orgData = localStorage.getItem('organization');

    if (token && userData) {
      try {
        setUser(JSON.parse(userData));
        setIsAuthenticated(true);

        // Load organization data
        if (orgData) {
          setOrganization(JSON.parse(orgData));
        }
      } catch (e) {
        // Invalid user data, clear storage
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user_data');
        localStorage.removeItem('organization');
      }
    }
    setLoading(false);
  }, []);

  const login = (userData, tokens, orgData = null) => {
    localStorage.setItem('access_token', tokens.access);
    localStorage.setItem('refresh_token', tokens.refresh);
    localStorage.setItem('user_data', JSON.stringify(userData));

    // Store organization data
    if (orgData) {
      localStorage.setItem('organization', JSON.stringify(orgData));
      setOrganization(orgData);
    }

    setUser(userData);
    setIsAuthenticated(true);
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_data');
    localStorage.removeItem('organization');
    setUser(null);
    setOrganization(null);
    setIsAuthenticated(false);
  };

  const updateOrganization = (orgData) => {
    localStorage.setItem('organization', JSON.stringify(orgData));
    setOrganization(orgData);
  };

  const updateUser = (userData) => {
    const updatedUser = { ...user, ...userData };
    localStorage.setItem('user_data', JSON.stringify(updatedUser));
    setUser(updatedUser);
  };

  const isAdmin = () => user?.role === 'ADMIN';
  const isPartner = () => user?.role === 'PARTNER';
  const isManager = () => user?.role === 'MANAGER';
  const isStaff = () => user?.role === 'STAFF';
  const isPlatformAdmin = () => user?.is_platform_admin === true;

  // Check if user has admin-level access (Admin or Partner)
  const hasAdminAccess = () => ['ADMIN', 'PARTNER'].includes(user?.role);

  // Check if user has management access (Admin, Partner, or Manager)
  const hasManagementAccess = () => ['ADMIN', 'PARTNER', 'MANAGER'].includes(user?.role);

  // Check if organization is in trial
  const isTrialOrg = () => organization?.status === 'TRIAL';

  // Check if organization is active
  const isOrgActive = () => ['ACTIVE', 'TRIAL'].includes(organization?.status);

  const value = {
    user,
    organization,
    isAuthenticated,
    loading,
    login,
    logout,
    updateUser,
    updateOrganization,
    isAdmin,
    isPartner,
    isManager,
    isStaff,
    isPlatformAdmin,
    hasAdminAccess,
    hasManagementAccess,
    isTrialOrg,
    isOrgActive,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
