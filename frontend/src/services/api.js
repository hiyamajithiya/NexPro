import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token and organization header
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Add organization header for multi-tenant support
    const orgData = localStorage.getItem('organization');
    if (orgData) {
      try {
        const org = JSON.parse(orgData);
        if (org?.id) {
          config.headers['X-Organization-ID'] = org.id;
        }
      } catch (e) {
        // Invalid org data
      }
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refresh_token');
        const response = await axios.post(`${API_BASE_URL}/auth/refresh/`, {
          refresh: refreshToken,
        });

        const { access } = response.data;
        localStorage.setItem('access_token', access);

        originalRequest.headers.Authorization = `Bearer ${access}`;
        return api(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user_data');
        localStorage.removeItem('organization');
        window.location.href = '/home';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (credentials) => api.post('/auth/login/', credentials),
  register: (data) => api.post('/auth/register/', data),
  refresh: (refreshToken) => api.post('/auth/refresh/', { refresh: refreshToken }),
  // OTP-based signup
  sendSignupOTP: (data) => api.post('/auth/signup/send-otp/', data),
  verifySignupOTP: (data) => api.post('/auth/signup/verify-otp/', data),
  resendSignupOTP: (email) => api.post('/auth/signup/resend-otp/', { email }),
  // Password reset
  forgotPassword: (email) => api.post('/auth/forgot-password/', { email }),
  verifyResetOTP: (data) => api.post('/auth/verify-reset-otp/', data),
  resetPassword: (data) => api.post('/auth/reset-password/', data),
};

// Organization API
export const organizationAPI = {
  getCurrent: () => api.get('/organizations/current/'),
  updateCurrent: (data) => api.patch('/organizations/current/', data),
  getUsage: () => api.get('/organizations/usage/'),
  getPlans: () => api.get('/organizations/plans/'),
  requestUpgrade: (data) => api.post('/organizations/request_upgrade/', data),
  getUpgradeRequests: () => api.get('/organizations/upgrade_requests/'),
};

// Dashboard API
export const dashboardAPI = {
  getSummary: () => api.get('/dashboard/summary/'),
  getUpcomingTasks: (limit = 10) => api.get(`/dashboard/upcoming_tasks/?limit=${limit}`),
  getAnalytics: () => api.get('/dashboard/analytics/'),
  getEmailConfig: () => api.get('/dashboard/email_config/'),
  sendTestEmail: (email) => api.post('/dashboard/test_email/', { recipient_email: email }),
};

// Clients API
export const clientsAPI = {
  getAll: (params) => api.get('/clients/', { params }),
  getById: (id) => api.get(`/clients/${id}/`),
  create: (data) => api.post('/clients/', data),
  update: (id, data) => api.put(`/clients/${id}/`, data),
  delete: (id) => api.delete(`/clients/${id}/`),
  getWorks: (id) => api.get(`/clients/${id}/works/`),
  getTasks: (id) => api.get(`/clients/${id}/tasks/`),
  assignWorkTypes: (id, data) => api.post(`/clients/${id}/assign_work_types/`, data),
  downloadTemplate: () => {
    const token = localStorage.getItem('access_token');
    const orgData = localStorage.getItem('organization');
    const headers = { 'Authorization': `Bearer ${token}` };
    if (orgData) {
      try {
        const org = JSON.parse(orgData);
        if (org?.id) headers['X-Organization-ID'] = org.id;
      } catch (e) {}
    }
    return axios({
      url: `${API_BASE_URL}/clients/download_template/`,
      method: 'GET',
      responseType: 'blob',
      headers,
    });
  },
  bulkUpload: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const token = localStorage.getItem('access_token');
    const orgData = localStorage.getItem('organization');
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'multipart/form-data',
    };
    if (orgData) {
      try {
        const org = JSON.parse(orgData);
        if (org?.id) headers['X-Organization-ID'] = org.id;
      } catch (e) {}
    }
    return axios.post(`${API_BASE_URL}/clients/bulk_upload/`, formData, { headers });
  },
};

// Work Types API
export const workTypesAPI = {
  getAll: (params) => api.get('/work-types/', { params }),
  getById: (id) => api.get(`/work-types/${id}/`),
  create: (data) => api.post('/work-types/', data),
  update: (id, data) => api.put(`/work-types/${id}/`, data),
  delete: (id) => api.delete(`/work-types/${id}/`),
  // Get period options and due date for a work type
  getPeriodOptions: (id) => api.get(`/work-types/${id}/period_options/`),
};

// Client Works API
export const clientWorksAPI = {
  getAll: (params) => api.get('/client-works/', { params }),
  create: (data) => api.post('/client-works/', data),
  update: (id, data) => api.put(`/client-works/${id}/`, data),
  delete: (id) => api.delete(`/client-works/${id}/`),
};

// Tasks API
export const tasksAPI = {
  getAll: (params) => api.get('/tasks/', { params }),
  getById: (id) => api.get(`/tasks/${id}/`),
  create: (data) => api.post('/tasks/', data),
  update: (id, data) => api.put(`/tasks/${id}/`, data),
  delete: (id) => api.delete(`/tasks/${id}/`),
  complete: (id) => api.post(`/tasks/${id}/complete/`),
  updateDueDate: (id, dueDate) => api.post(`/tasks/${id}/update_due_date/`, { due_date: dueDate }),
  getReminders: (id) => api.get(`/tasks/${id}/reminders/`),
  transfer: (id, assignedTo, notes) => api.post(`/tasks/${id}/transfer/`, { assigned_to: assignedTo, notes }),
  // Timer control APIs
  startTimer: (id) => api.post(`/tasks/${id}/start_timer/`),
  pauseTimer: (id) => api.post(`/tasks/${id}/pause_timer/`),
  getTimerStatus: (id) => api.get(`/tasks/${id}/timer_status/`),
};

// Work Type Assignments API
export const workTypeAssignmentsAPI = {
  getAll: (params) => api.get('/work-type-assignments/', { params }),
  getById: (id) => api.get(`/work-type-assignments/${id}/`),
  create: (data) => api.post('/work-type-assignments/', data),
  update: (id, data) => api.put(`/work-type-assignments/${id}/`, data),
  delete: (id) => api.delete(`/work-type-assignments/${id}/`),
  byEmployee: (employeeId) => api.get('/work-type-assignments/by_employee/', { params: { employee_id: employeeId } }),
  byWorkType: (workTypeId) => api.get('/work-type-assignments/by_work_type/', { params: { work_type_id: workTypeId } }),
  bulkAssign: (employeeId, workTypeIds) => api.post('/work-type-assignments/bulk_assign/', { employee_id: employeeId, work_type_ids: workTypeIds }),
};

// Task Documents API
export const taskDocumentsAPI = {
  getAll: (params) => api.get('/task-documents/', { params }),
  getByTask: (taskId) => api.get(`/tasks/${taskId}/documents/`),
  upload: (taskId, file, description = '') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('work_instance', taskId);
    if (description) formData.append('description', description);

    const token = localStorage.getItem('access_token');
    const orgData = localStorage.getItem('organization');
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'multipart/form-data',
    };
    if (orgData) {
      try {
        const org = JSON.parse(orgData);
        if (org?.id) headers['X-Organization-ID'] = org.id;
      } catch (e) {}
    }
    return axios.post(`${API_BASE_URL}/tasks/${taskId}/documents/`, formData, { headers });
  },
  delete: (id) => api.delete(`/task-documents/${id}/`),
  download: (id) => {
    const token = localStorage.getItem('access_token');
    const orgData = localStorage.getItem('organization');
    const headers = { 'Authorization': `Bearer ${token}` };
    if (orgData) {
      try {
        const org = JSON.parse(orgData);
        if (org?.id) headers['X-Organization-ID'] = org.id;
      } catch (e) {}
    }
    return axios({
      url: `${API_BASE_URL}/task-documents/${id}/download/`,
      method: 'GET',
      responseType: 'blob',
      headers,
    });
  },
};

// Email Templates API
export const emailTemplatesAPI = {
  getAll: (params) => api.get('/email-templates/', { params }),
  getById: (id) => api.get(`/email-templates/${id}/`),
  create: (data) => api.post('/email-templates/', data),
  update: (id, data) => api.put(`/email-templates/${id}/`, data),
  delete: (id) => api.delete(`/email-templates/${id}/`),
};

// Reminder Rules API
export const reminderRulesAPI = {
  getAll: (params) => api.get('/reminder-rules/', { params }),
  getById: (id) => api.get(`/reminder-rules/${id}/`),
  create: (data) => api.post('/reminder-rules/', data),
  update: (id, data) => api.put(`/reminder-rules/${id}/`, data),
  delete: (id) => api.delete(`/reminder-rules/${id}/`),
};

// Users API
export const usersAPI = {
  getAll: (params) => api.get('/users/', { params }),
  getById: (id) => api.get(`/users/${id}/`),
  create: (data) => api.post('/users/', data),
  update: (id, data) => api.put(`/users/${id}/`, data),
  delete: (id) => api.delete(`/users/${id}/`),
  // Profile APIs
  getProfile: () => api.get('/users/profile/'),
  updateProfile: (data) => api.put('/users/profile/', data),
  changePassword: (data) => api.post('/users/change_password/', data),
  // Notification Preferences APIs
  getNotificationPreferences: () => api.get('/users/notification_preferences/'),
  updateNotificationPreferences: (data) => api.put('/users/notification_preferences/', data),
  // DPDP Act Compliance APIs
  exportMyData: () => {
    const token = localStorage.getItem('access_token');
    const orgData = localStorage.getItem('organization');
    const headers = { 'Authorization': `Bearer ${token}` };
    if (orgData) {
      try {
        const org = JSON.parse(orgData);
        if (org?.id) headers['X-Organization-ID'] = org.id;
      } catch (e) {}
    }
    return axios({
      url: `${API_BASE_URL}/users/export_my_data/`,
      method: 'GET',
      responseType: 'blob',
      headers,
    });
  },
  requestDataDeletion: (reason) => api.post('/users/request_data_deletion/', { reason }),
};

// Platform Admin API (SuperAdmin)
export const platformAdminAPI = {
  getStats: () => api.get('/platform-admin/stats/'),
  getOrganizations: () => api.get('/platform-admin/organizations/'),
  getAllUsers: () => api.get('/platform-admin/all_users/'),
  getRecentSignups: (limit = 10) => api.get(`/platform-admin/recent_signups/?limit=${limit}`),
  getExpiringTrials: () => api.get('/platform-admin/expiring_trials/'),
  getOrgDetails: (id) => api.get(`/platform-admin/${id}/org_details/`),
  suspendOrg: (id) => api.post(`/platform-admin/${id}/suspend/`),
  activateOrg: (id) => api.post(`/platform-admin/${id}/activate/`),
  extendTrial: (id, days) => api.post(`/platform-admin/${id}/extend_trial/`, { days }),
  upgradePlan: (id, plan) => api.post(`/platform-admin/${id}/upgrade_plan/`, { plan }),
  changePlan: (id, plan) => api.post(`/platform-admin/${id}/change_plan/`, { plan }),
  // Delete operations
  deleteOrg: (id) => api.delete(`/platform-admin/${id}/delete_org/`),
  deleteUser: (id) => api.delete(`/platform-admin/${id}/delete_user/`),
  // Platform Settings
  getSettings: () => api.get('/platform-admin/settings/'),
  updateSettings: (data) => api.patch('/platform-admin/settings/', data),
  testSmtp: (data) => api.post('/platform-admin/test_smtp/', data),
};

// Subscription Plans API (SuperAdmin)
export const subscriptionPlansAPI = {
  getAll: (params) => api.get('/subscription-plans/', { params }),
  getById: (id) => api.get(`/subscription-plans/${id}/`),
  create: (data) => api.post('/subscription-plans/', data),
  update: (id, data) => api.put(`/subscription-plans/${id}/`, data),
  delete: (id) => api.delete(`/subscription-plans/${id}/`),
  setDefault: (id) => api.post(`/subscription-plans/${id}/set_default/`),
  initializeDefaults: () => api.post('/subscription-plans/initialize_defaults/'),
  // Public endpoint - uses plain axios without auth interceptors
  getPublic: () => axios.get(`${API_BASE_URL}/subscription-plans/public/`),
};

// Organization Emails API
export const organizationEmailsAPI = {
  getAll: (params) => api.get('/organization-emails/', { params }),
  getById: (id) => api.get(`/organization-emails/${id}/`),
  create: (data) => api.post('/organization-emails/', data),
  update: (id, data) => api.put(`/organization-emails/${id}/`, data),
  delete: (id) => api.delete(`/organization-emails/${id}/`),
  setDefault: (id) => api.post(`/organization-emails/${id}/set_default/`),
  testEmail: (id, recipient) => api.post(`/organization-emails/${id}/test/`, { recipient }),
};

// Credential Vault API
export const credentialsAPI = {
  getAll: (params) => api.get('/credentials/', { params }),
  getById: (id) => api.get(`/credentials/${id}/`),
  create: (data) => api.post('/credentials/', data),
  update: (id, data) => api.put(`/credentials/${id}/`, data),
  delete: (id) => api.delete(`/credentials/${id}/`),
  byClient: (clientId) => api.get('/credentials/by_client/', { params: { client_id: clientId } }),
  reveal: (id) => api.get(`/credentials/${id}/reveal/`),
  getPortalTypes: () => api.get('/credentials/portal_types/'),
};

// Notifications API
export const notificationsAPI = {
  getAll: (params) => api.get('/notifications/', { params }),
  getRecent: () => api.get('/notifications/recent/'),
  markRead: (id) => api.post(`/notifications/${id}/mark_read/`),
  markAllRead: () => api.post('/notifications/mark_all_read/'),
  getUnreadCount: () => api.get('/notifications/unread_count/'),
};

// Report Configurations API
export const reportConfigurationsAPI = {
  getAll: (params) => api.get('/report-configurations/', { params }),
  getById: (id) => api.get(`/report-configurations/${id}/`),
  create: (data) => api.post('/report-configurations/', data),
  update: (id, data) => api.put(`/report-configurations/${id}/`, data),
  delete: (id) => api.delete(`/report-configurations/${id}/`),
  sendNow: (id) => api.post(`/report-configurations/${id}/send_now/`),
  preview: (id) => api.get(`/report-configurations/${id}/preview/`),
  downloadPdf: (id) => {
    const token = localStorage.getItem('access_token');
    const orgData = localStorage.getItem('organization');
    const headers = { 'Authorization': `Bearer ${token}` };
    if (orgData) {
      try {
        const org = JSON.parse(orgData);
        if (org?.id) headers['X-Organization-ID'] = org.id;
      } catch (e) {}
    }
    return axios({
      url: `${API_BASE_URL}/report-configurations/${id}/download_pdf/`,
      method: 'GET',
      responseType: 'blob',
      headers,
    });
  },
  // Ad-hoc report PDF generation
  generateAdHocPdf: (params) => {
    const token = localStorage.getItem('access_token');
    const orgData = localStorage.getItem('organization');
    const headers = { 'Authorization': `Bearer ${token}` };
    if (orgData) {
      try {
        const org = JSON.parse(orgData);
        if (org?.id) headers['X-Organization-ID'] = org.id;
      } catch (e) {}
    }
    return axios({
      url: `${API_BASE_URL}/report-configurations/generate_adhoc_pdf/`,
      method: 'POST',
      data: params,
      responseType: 'blob',
      headers,
    });
  },
};

export default api;
