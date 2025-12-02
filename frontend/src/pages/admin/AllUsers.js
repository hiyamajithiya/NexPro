import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Alert,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Grid,
  Avatar,
  InputAdornment,
  Paper,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
} from '@mui/material';
import {
  People,
  Search,
  Refresh,
  CheckCircle,
  Cancel,
  Business,
  Delete,
  Warning,
} from '@mui/icons-material';
import { platformAdminAPI } from '../../services/api';
import { format } from 'date-fns';

const roleColors = {
  ADMIN: '#ef4444',
  PARTNER: '#8b5cf6',
  MANAGER: '#f59e0b',
  STAFF: '#3b82f6',
};

const roleLabels = {
  ADMIN: 'Admin',
  PARTNER: 'Partner',
  MANAGER: 'Manager',
  STAFF: 'Staff',
};

export default function AllUsers() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [deleteDialog, setDeleteDialog] = useState({ open: false, user: null });
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    filterUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [users, searchTerm, roleFilter, statusFilter]);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await platformAdminAPI.getAllUsers();
      setUsers(response.data);
    } catch (err) {
      setError('Failed to load users');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = [...users];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(user =>
        user.email.toLowerCase().includes(term) ||
        user.first_name?.toLowerCase().includes(term) ||
        user.last_name?.toLowerCase().includes(term) ||
        user.organization_name?.toLowerCase().includes(term)
      );
    }

    if (roleFilter !== 'ALL') {
      filtered = filtered.filter(user => user.role === roleFilter);
    }

    if (statusFilter !== 'ALL') {
      const isActive = statusFilter === 'ACTIVE';
      filtered = filtered.filter(user => user.is_active === isActive);
    }

    setFilteredUsers(filtered);
  };

  const handleDeleteUser = async () => {
    setActionLoading(true);
    try {
      await platformAdminAPI.deleteUser(deleteDialog.user.id);
      setDeleteDialog({ open: false, user: null });
      fetchData();
    } catch (err) {
      setError(`Delete failed: ${err.response?.data?.error || err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  // Stats
  const totalUsers = users.length;
  const activeUsers = users.filter(u => u.is_active).length;
  const adminUsers = users.filter(u => u.role === 'ADMIN').length;
  const staffUsers = users.filter(u => u.role === 'STAFF').length;

  return (
    <Box>
      {/* Header */}
      <Card
        sx={{
          background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
          color: 'white',
          mb: 4,
          borderRadius: 3,
        }}
      >
        <CardContent sx={{ py: 3 }}>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Box display="flex" alignItems="center" gap={2}>
              <Avatar
                sx={{
                  width: 56,
                  height: 56,
                  bgcolor: 'rgba(255,255,255,0.2)',
                }}
              >
                <People sx={{ fontSize: 28 }} />
              </Avatar>
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 600 }}>
                  All Users
                </Typography>
                <Typography variant="body1" sx={{ opacity: 0.9, mt: 0.5 }}>
                  Platform-wide user management
                </Typography>
              </Box>
            </Box>
            <Button
              variant="contained"
              startIcon={<Refresh />}
              onClick={fetchData}
              sx={{
                bgcolor: 'rgba(255,255,255,0.2)',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
              }}
            >
              Refresh
            </Button>
          </Box>
        </CardContent>
      </Card>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 3, boxShadow: 2 }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Total Users
                  </Typography>
                  <Typography variant="h4" fontWeight={700}>
                    {totalUsers}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#f0f9ff', width: 48, height: 48 }}>
                  <People sx={{ color: '#3b82f6' }} />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 3, boxShadow: 2 }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Active Users
                  </Typography>
                  <Typography variant="h4" fontWeight={700} color="success.main">
                    {activeUsers}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#f0fdf4', width: 48, height: 48 }}>
                  <CheckCircle sx={{ color: '#10b981' }} />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 3, boxShadow: 2 }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Admin Users
                  </Typography>
                  <Typography variant="h4" fontWeight={700} sx={{ color: '#ef4444' }}>
                    {adminUsers}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#fef2f2', width: 48, height: 48 }}>
                  <People sx={{ color: '#ef4444' }} />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 3, boxShadow: 2 }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Staff Users
                  </Typography>
                  <Typography variant="h4" fontWeight={700} sx={{ color: '#3b82f6' }}>
                    {staffUsers}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#eff6ff', width: 48, height: 48 }}>
                  <People sx={{ color: '#3b82f6' }} />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
              size="small"
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Role</InputLabel>
              <Select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                label="Role"
              >
                <MenuItem value="ALL">All Roles</MenuItem>
                <MenuItem value="ADMIN">Admin</MenuItem>
                <MenuItem value="PARTNER">Partner</MenuItem>
                <MenuItem value="MANAGER">Manager</MenuItem>
                <MenuItem value="STAFF">Staff</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                label="Status"
              >
                <MenuItem value="ALL">All Status</MenuItem>
                <MenuItem value="ACTIVE">Active</MenuItem>
                <MenuItem value="INACTIVE">Inactive</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <Typography variant="body2" color="text.secondary">
              Showing {filteredUsers.length} of {users.length} users
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      {/* Users Table */}
      <Card sx={{ borderRadius: 3, boxShadow: 3 }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: '#f8fafc' }}>
                <TableCell sx={{ fontWeight: 600 }}>User</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Role</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Organization</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Org Status</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Joined</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Last Login</TableCell>
                <TableCell align="center" sx={{ fontWeight: 600 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                    <People sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                    <Typography variant="body1" color="text.secondary">
                      No users found
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
                  <TableRow key={user.id} hover>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={2}>
                        <Avatar sx={{ bgcolor: roleColors[user.role] || '#667eea', width: 36, height: 36 }}>
                          {(user.first_name?.[0] || user.email[0]).toUpperCase()}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight={600}>
                            {user.first_name && user.last_name
                              ? `${user.first_name} ${user.last_name}`
                              : user.email.split('@')[0]}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {user.email}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={roleLabels[user.role] || user.role}
                        sx={{
                          backgroundColor: `${roleColors[user.role]}22`,
                          color: roleColors[user.role],
                          fontWeight: 600,
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Business sx={{ fontSize: 16, color: 'text.secondary' }} />
                        <Typography variant="body2">
                          {user.organization_name || 'N/A'}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={user.organization_status || 'N/A'}
                        color={
                          user.organization_status === 'ACTIVE' ? 'success' :
                          user.organization_status === 'TRIAL' ? 'warning' :
                          user.organization_status === 'SUSPENDED' ? 'error' : 'default'
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Tooltip title={user.is_active ? 'Active' : 'Inactive'}>
                        {user.is_active ? (
                          <CheckCircle sx={{ color: '#10b981' }} />
                        ) : (
                          <Cancel sx={{ color: '#ef4444' }} />
                        )}
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption">
                        {user.date_joined ? format(new Date(user.date_joined), 'dd MMM yyyy') : '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption">
                        {user.last_login ? format(new Date(user.last_login), 'dd MMM yyyy HH:mm') : 'Never'}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="Delete User">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => setDeleteDialog({ open: true, user })}
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Delete User Dialog */}
      <Dialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, user: null })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{
          background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
          color: 'white',
        }}>
          Delete User
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          {actionLoading && <LinearProgress sx={{ mb: 2 }} />}

          <Alert severity="error" icon={<Warning />} sx={{ mb: 2 }}>
            <Typography variant="body2" fontWeight={600}>
              This action cannot be undone!
            </Typography>
            <Typography variant="body2">
              The user will be permanently deleted from the system.
            </Typography>
          </Alert>

          <Paper sx={{ p: 2, bgcolor: '#fef2f2', borderRadius: 2 }}>
            <Typography variant="body2" color="text.secondary">
              User to be deleted:
            </Typography>
            <Typography variant="h6" fontWeight={600} color="error.main">
              {deleteDialog.user?.email}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {deleteDialog.user?.first_name} {deleteDialog.user?.last_name} ({deleteDialog.user?.role})
            </Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              Organization: {deleteDialog.user?.organization_name || 'N/A'}
            </Typography>
          </Paper>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={() => setDeleteDialog({ open: false, user: null })}
            disabled={actionLoading}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDeleteUser}
            disabled={actionLoading}
          >
            {actionLoading ? 'Deleting...' : 'Delete Permanently'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
