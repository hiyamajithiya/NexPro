import React, { useState } from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Grid,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Button,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Tab,
  Tabs,
  Alert,
  Avatar,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  Assignment as AssignmentIcon,
  CalendarMonth as CalendarIcon,
  Assessment as ReportsIcon,
  Work as WorkIcon,
  Email as EmailIcon,
  Settings as SettingsIcon,
  Badge as BadgeIcon,
  Help as HelpIcon,
  PlayArrow as PlayIcon,
  CheckCircle as CheckIcon,
  Info as InfoIcon,
  Lightbulb as TipIcon,
  ArrowForward as ArrowIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Download as DownloadIcon,
  Notifications as NotificationIcon,
  Security as SecurityIcon,
  AdminPanelSettings as AdminIcon,
  Group as GroupIcon,
  Timeline as TimelineIcon,
  Speed as SpeedIcon,
  Star as StarIcon,
} from '@mui/icons-material';

// Tab Panel Component
function TabPanel({ children, value, index, ...other }) {
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

// Feature Card Component
function FeatureCard({ icon, title, description, tips, color = 'primary' }) {
  return (
    <Card sx={{ height: '100%', borderRadius: 3, boxShadow: 2, '&:hover': { boxShadow: 4, transform: 'translateY(-2px)' }, transition: 'all 0.3s' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Avatar sx={{ bgcolor: `${color}.light`, color: `${color}.main`, width: 48, height: 48 }}>
            {icon}
          </Avatar>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>{title}</Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {description}
        </Typography>
        {tips && tips.length > 0 && (
          <Box sx={{ mt: 2, p: 1.5, bgcolor: 'grey.50', borderRadius: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
              <TipIcon fontSize="small" color="warning" />
              <Typography variant="caption" sx={{ fontWeight: 600, color: 'warning.main' }}>Quick Tips</Typography>
            </Box>
            {tips.map((tip, idx) => (
              <Typography key={idx} variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                • {tip}
              </Typography>
            ))}
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

// Step Guide Component
function StepGuide({ title, steps }) {
  const [activeStep, setActiveStep] = useState(0);

  return (
    <Card sx={{ borderRadius: 3, boxShadow: 2 }}>
      <CardContent>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>{title}</Typography>
        <Stepper activeStep={activeStep} orientation="vertical">
          {steps.map((step, index) => (
            <Step key={index}>
              <StepLabel>
                <Typography sx={{ fontWeight: 500 }}>{step.label}</Typography>
              </StepLabel>
              <StepContent>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {step.description}
                </Typography>
                {step.note && (
                  <Alert severity="info" sx={{ mb: 2 }}>
                    {step.note}
                  </Alert>
                )}
                <Box sx={{ mb: 2 }}>
                  <Button
                    variant="contained"
                    size="small"
                    onClick={() => setActiveStep(index + 1)}
                    sx={{ mr: 1 }}
                    disabled={index === steps.length - 1}
                  >
                    {index === steps.length - 1 ? 'Complete' : 'Next'}
                  </Button>
                  {index > 0 && (
                    <Button size="small" onClick={() => setActiveStep(index - 1)}>
                      Back
                    </Button>
                  )}
                </Box>
              </StepContent>
            </Step>
          ))}
        </Stepper>
        {activeStep === steps.length && (
          <Box sx={{ p: 2, bgcolor: 'success.light', borderRadius: 2, mt: 2 }}>
            <Typography variant="body2" sx={{ color: 'success.dark', fontWeight: 500 }}>
              <CheckIcon fontSize="small" sx={{ mr: 1, verticalAlign: 'middle' }} />
              All steps completed! You're ready to use this feature.
            </Typography>
            <Button size="small" onClick={() => setActiveStep(0)} sx={{ mt: 1 }}>
              Review Steps
            </Button>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

export default function HelpGuide() {
  const [tabValue, setTabValue] = useState(0);
  const [expandedFaq, setExpandedFaq] = useState(false);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  // Getting Started Steps
  const gettingStartedSteps = [
    {
      label: 'Set Up Your Organization',
      description: 'Go to Settings > Organization tab to configure your firm details including name, address, contact information, GST/PAN numbers, and tax compliance settings.',
      note: 'This information will appear on client communications and reports.',
    },
    {
      label: 'Configure Email Accounts',
      description: 'Navigate to Settings > Email Accounts tab to add email addresses for sending reminders. You can configure multiple emails for different work types (e.g., GST, Income Tax).',
      note: 'For Gmail, enable "App Passwords" in your Google account settings.',
    },
    {
      label: 'Add Work Types',
      description: 'Go to Work Types to define the services your firm offers (e.g., GST Return, TDS Filing, Audit). Set frequencies, deadlines, and link email accounts.',
    },
    {
      label: 'Add Your Team',
      description: 'Use Employees section to add staff members. Assign roles (Admin, Partner, Manager, Staff) which control their access levels.',
    },
    {
      label: 'Add Clients',
      description: 'Start adding clients with their details. You can assign work types to each client which will automatically generate tasks.',
    },
    {
      label: 'Create Email Templates',
      description: 'Set up email templates for reminders with placeholders like {{client_name}}, {{due_date}}, etc.',
    },
  ];

  // Client Management Steps
  const clientManagementSteps = [
    {
      label: 'Add a New Client',
      description: 'Click "Add Client" button. Fill in client name, PAN, GSTIN, email, phone, and address. Select the primary contact person.',
    },
    {
      label: 'Assign Work Types',
      description: 'After creating a client, assign relevant work types. Each work type will generate recurring tasks based on its frequency.',
      note: 'Tasks are automatically generated based on work type frequency (Monthly, Quarterly, Yearly).',
    },
    {
      label: 'Manage Client Documents',
      description: 'Upload and organize client documents. Use the document management section to keep track of received files.',
    },
    {
      label: 'Track Client Communication',
      description: 'View all emails sent to the client, including reminders and their status (sent, delivered, opened).',
    },
  ];

  // Task Management Steps
  const taskManagementSteps = [
    {
      label: 'View Your Tasks',
      description: 'The Tasks page shows all work instances. Use filters to view by status (Pending, In Progress, Completed), work type, or assigned employee.',
    },
    {
      label: 'Update Task Status',
      description: 'Click on a task to update its status. Add notes, mark completion percentage, and record actual completion date.',
      note: 'Tasks approaching due date will be highlighted in yellow/red.',
    },
    {
      label: 'Assign Tasks',
      description: 'Managers can assign or reassign tasks to team members. Select the employee from the dropdown in the task details.',
    },
    {
      label: 'Send Manual Reminders',
      description: 'Click "Send Reminder" to manually send an email reminder to the client about a pending task.',
    },
  ];

  // FAQs
  const faqs = [
    {
      question: 'How do automatic reminders work?',
      answer: 'Automatic reminders are sent based on reminder rules defined in Work Types. You can set reminders for X days before due date, on due date, and after due date. The system runs a scheduled job to send these emails automatically.',
    },
    {
      question: 'What are the different user roles?',
      answer: 'Admin: Full access to all features and settings. Partner: Same as Admin, typically for firm partners. Manager: Can manage clients, tasks, and view reports but cannot change organization settings. Staff: Can only view and update assigned tasks.',
    },
    {
      question: 'How do I configure email for sending reminders?',
      answer: 'Go to Settings > Email Accounts tab. Add a new email account with SMTP settings. For Gmail, use smtp.gmail.com, port 587, and an App Password (not your regular password). Enable TLS.',
    },
    {
      question: 'Can I customize email templates?',
      answer: 'Yes! Go to Templates section to create custom email templates. Use placeholders like {{client_name}}, {{PAN}}, {{GSTIN}}, {{due_date}}, {{work_name}}, {{period_label}}, {{firm_name}} which will be replaced with actual values.',
    },
    {
      question: 'How are tasks generated automatically?',
      answer: 'When you assign a work type to a client, the system automatically generates tasks based on the work type\'s frequency (Monthly/Quarterly/Yearly). Tasks are created for the current and upcoming periods.',
    },
    {
      question: 'What reports are available?',
      answer: 'Reports include: Task Summary by status, Client-wise pending work, Employee workload analysis, Overdue tasks report, Monthly/Quarterly compliance status, and Email reminder logs.',
    },
    {
      question: 'How do I upgrade my subscription plan?',
      answer: 'Go to Settings > Organization tab. You\'ll see your current plan and usage. Click "Request Upgrade" to send an upgrade request to the platform administrator who will process your request.',
    },
    {
      question: 'Can I export data to Excel?',
      answer: 'Yes, most tables have an Export button that downloads the data in Excel format. You can export clients, tasks, and reports.',
    },
    {
      question: 'How do I reset a user\'s password?',
      answer: 'Admins can reset passwords from the Employees section. Click on the employee and use the "Reset Password" option.',
    },
    {
      question: 'What happens when my trial expires?',
      answer: 'After the 30-day trial, your account will be suspended. You\'ll need to upgrade to a paid plan to continue using the service. Your data will be preserved.',
    },
  ];

  // Role Permissions
  const rolePermissions = [
    { feature: 'View Dashboard', admin: true, partner: true, manager: true, staff: true },
    { feature: 'Manage Clients', admin: true, partner: true, manager: true, staff: false },
    { feature: 'View All Tasks', admin: true, partner: true, manager: true, staff: false },
    { feature: 'View Assigned Tasks', admin: true, partner: true, manager: true, staff: true },
    { feature: 'Update Task Status', admin: true, partner: true, manager: true, staff: true },
    { feature: 'View Reports', admin: true, partner: true, manager: true, staff: false },
    { feature: 'Manage Employees', admin: true, partner: true, manager: false, staff: false },
    { feature: 'Manage Work Types', admin: true, partner: true, manager: false, staff: false },
    { feature: 'Manage Templates', admin: true, partner: true, manager: false, staff: false },
    { feature: 'Settings (Organization, Email, Security)', admin: true, partner: true, manager: false, staff: false },
  ];

  return (
    <Container maxWidth="xl">
      <Box sx={{ mb: 4 }}>
        {/* Header */}
        <Card
          sx={{
            mb: 4,
            borderRadius: 4,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
          }}
        >
          <CardContent sx={{ py: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 56, height: 56 }}>
                <HelpIcon sx={{ fontSize: 32 }} />
              </Avatar>
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 700 }}>
                  Help & Guide
                </Typography>
                <Typography variant="body1" sx={{ opacity: 0.9 }}>
                  Learn how to use NexPro effectively to manage your CA practice
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>

        {/* Quick Overview Cards */}
        <Box sx={{ display: 'flex', gap: 3, mb: 4, flexWrap: { xs: 'wrap', md: 'nowrap' }, alignItems: 'stretch' }}>
          <Card sx={{ borderRadius: 3, boxShadow: 2, bgcolor: 'primary.light', color: 'primary.dark', flex: 1, minWidth: { xs: '100%', md: 0 }, display: 'flex' }}>
            <CardContent sx={{ textAlign: 'center', py: 4, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', width: '100%' }}>
              <SpeedIcon sx={{ fontSize: 48, mb: 1 }} />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>Quick Start</Typography>
              <Typography variant="body2">Get up and running in minutes</Typography>
            </CardContent>
          </Card>
          <Card sx={{ borderRadius: 3, boxShadow: 2, bgcolor: 'success.light', color: 'success.dark', flex: 1, minWidth: { xs: '100%', md: 0 }, display: 'flex' }}>
            <CardContent sx={{ textAlign: 'center', py: 4, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', width: '100%' }}>
              <TimelineIcon sx={{ fontSize: 48, mb: 1 }} />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>Step-by-Step Guides</Typography>
              <Typography variant="body2">Detailed walkthroughs for each feature</Typography>
            </CardContent>
          </Card>
          <Card sx={{ borderRadius: 3, boxShadow: 2, bgcolor: 'warning.light', color: 'warning.dark', flex: 1, minWidth: { xs: '100%', md: 0 }, display: 'flex' }}>
            <CardContent sx={{ textAlign: 'center', py: 4, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', width: '100%' }}>
              <StarIcon sx={{ fontSize: 48, mb: 1 }} />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>Pro Tips</Typography>
              <Typography variant="body2">Get the most out of NexPro</Typography>
            </CardContent>
          </Card>
        </Box>

        {/* Tabs Navigation */}
        <Paper sx={{ borderRadius: 3, mb: 3 }}>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ borderBottom: 1, borderColor: 'divider' }}
          >
            <Tab icon={<PlayIcon />} label="Getting Started" iconPosition="start" />
            <Tab icon={<DashboardIcon />} label="Features Overview" iconPosition="start" />
            <Tab icon={<AssignmentIcon />} label="How-To Guides" iconPosition="start" />
            <Tab icon={<GroupIcon />} label="User Roles" iconPosition="start" />
            <Tab icon={<HelpIcon />} label="FAQs" iconPosition="start" />
          </Tabs>
        </Paper>

        {/* Tab Content */}
        <TabPanel value={tabValue} index={0}>
          {/* Getting Started */}
          <Grid container spacing={3}>
            <Grid item xs={12} lg={8}>
              <StepGuide title="Initial Setup Guide" steps={gettingStartedSteps} />
            </Grid>
            <Grid item xs={12} lg={4}>
              <Card sx={{ borderRadius: 3, boxShadow: 2, bgcolor: 'info.light' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <InfoIcon color="info" />
                    <Typography variant="h6" sx={{ fontWeight: 600, color: 'info.dark' }}>
                      Before You Begin
                    </Typography>
                  </Box>
                  <List dense>
                    <ListItem>
                      <ListItemIcon><CheckIcon color="success" fontSize="small" /></ListItemIcon>
                      <ListItemText primary="Have your firm's GST/PAN details ready" />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon><CheckIcon color="success" fontSize="small" /></ListItemIcon>
                      <ListItemText primary="Prepare a list of services you offer" />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon><CheckIcon color="success" fontSize="small" /></ListItemIcon>
                      <ListItemText primary="Gather client information" />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon><CheckIcon color="success" fontSize="small" /></ListItemIcon>
                      <ListItemText primary="Set up email for reminders (Gmail App Password recommended)" />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>

              <Card sx={{ borderRadius: 3, boxShadow: 2, mt: 3 }}>
                <CardContent>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                    Recommended Order
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {[
                      { num: 1, text: 'Settings > Organization', icon: <SettingsIcon /> },
                      { num: 2, text: 'Settings > Email Accounts', icon: <EmailIcon /> },
                      { num: 3, text: 'Work Types', icon: <WorkIcon /> },
                      { num: 4, text: 'Email Templates', icon: <EmailIcon /> },
                      { num: 5, text: 'Add Employees', icon: <BadgeIcon /> },
                      { num: 6, text: 'Add Clients', icon: <PeopleIcon /> },
                    ].map((item) => (
                      <Box key={item.num} sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 1, borderRadius: 2, bgcolor: 'grey.50' }}>
                        <Avatar sx={{ width: 28, height: 28, bgcolor: 'primary.main', fontSize: '0.875rem' }}>
                          {item.num}
                        </Avatar>
                        {item.icon}
                        <Typography variant="body2">{item.text}</Typography>
                      </Box>
                    ))}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          {/* Features Overview */}
          <Grid container spacing={3}>
            <Grid item xs={12} md={6} lg={4}>
              <FeatureCard
                icon={<DashboardIcon />}
                title="Dashboard"
                description="Get a quick overview of your practice with key metrics, pending tasks, overdue items, and recent activities at a glance."
                tips={[
                  'Click on metrics to drill down',
                  'Dashboard refreshes automatically',
                  'Staff see only their assigned tasks',
                ]}
                color="primary"
              />
            </Grid>
            <Grid item xs={12} md={6} lg={4}>
              <FeatureCard
                icon={<PeopleIcon />}
                title="Client Management"
                description="Manage all your clients in one place. Store contact details, PAN, GSTIN, assign work types, and track communication history."
                tips={[
                  'Use search to find clients quickly',
                  'Export client list to Excel',
                  'Bulk upload clients via CSV',
                ]}
                color="success"
              />
            </Grid>
            <Grid item xs={12} md={6} lg={4}>
              <FeatureCard
                icon={<AssignmentIcon />}
                title="Task Management"
                description="Track all compliance tasks with status, due dates, and assignments. Filter by work type, status, or employee."
                tips={[
                  'Color-coded by urgency',
                  'Set reminders for critical tasks',
                  'Assign tasks to team members',
                ]}
                color="warning"
              />
            </Grid>
            <Grid item xs={12} md={6} lg={4}>
              <FeatureCard
                icon={<CalendarIcon />}
                title="Calendar View"
                description="Visualize all tasks and deadlines in a calendar format. Plan your work and never miss a due date."
                tips={[
                  'Click dates to see tasks',
                  'Drag-drop to reschedule',
                  'Monthly/Weekly views available',
                ]}
                color="info"
              />
            </Grid>
            <Grid item xs={12} md={6} lg={4}>
              <FeatureCard
                icon={<WorkIcon />}
                title="Work Types"
                description="Define the services your firm offers. Set frequency (Monthly/Quarterly/Yearly), deadlines, and link email accounts."
                tips={[
                  'Link specific email per work type',
                  'Set automatic reminder rules',
                  'Configure due date calculations',
                ]}
                color="secondary"
              />
            </Grid>
            <Grid item xs={12} md={6} lg={4}>
              <FeatureCard
                icon={<EmailIcon />}
                title="Email Templates"
                description="Create customizable email templates for reminders with placeholders that auto-fill with client data."
                tips={[
                  'Use {{client_name}} for personalization',
                  'Create multiple templates per work type',
                  'Preview before saving',
                ]}
                color="error"
              />
            </Grid>
            <Grid item xs={12} md={6} lg={4}>
              <FeatureCard
                icon={<ReportsIcon />}
                title="Reports & Analytics"
                description="Generate insightful reports on task completion, employee performance, client status, and email delivery."
                tips={[
                  'Export reports to Excel',
                  'Schedule automatic reports',
                  'Filter by date range',
                ]}
                color="primary"
              />
            </Grid>
            <Grid item xs={12} md={6} lg={4}>
              <FeatureCard
                icon={<BadgeIcon />}
                title="Employee Management"
                description="Add team members, assign roles, manage permissions, and track individual workloads and performance."
                tips={[
                  'Assign work types to employees',
                  'Set notification preferences',
                  'Track employee task completion',
                ]}
                color="success"
              />
            </Grid>
            <Grid item xs={12} md={6} lg={4}>
              <FeatureCard
                icon={<SettingsIcon />}
                title="Settings"
                description="All-in-one settings hub with tabs for Organization details, Email Accounts, Notifications, and Security. Manage your firm info, plan & usage, and more."
                tips={[
                  'Organization tab: Firm details & subscription',
                  'Email Accounts: Configure multiple SMTP accounts',
                  'Security: Update password regularly',
                ]}
                color="warning"
              />
            </Grid>
          </Grid>
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          {/* How-To Guides */}
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <StepGuide title="Client Management" steps={clientManagementSteps} />
            </Grid>
            <Grid item xs={12} md={6}>
              <StepGuide title="Task Management" steps={taskManagementSteps} />
            </Grid>
            <Grid item xs={12}>
              <Card sx={{ borderRadius: 3, boxShadow: 2, mt: 2 }}>
                <CardContent>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                    Common Actions Quick Reference
                  </Typography>
                  <Grid container spacing={2}>
                    {[
                      { action: 'Add New Client', path: 'Clients → Add Client button', icon: <AddIcon /> },
                      { action: 'Create Task', path: 'Assign work type to client (auto-creates)', icon: <AssignmentIcon /> },
                      { action: 'Send Reminder', path: 'Tasks → Select task → Send Reminder', icon: <EmailIcon /> },
                      { action: 'View Reports', path: 'Reports → Select report type', icon: <ReportsIcon /> },
                      { action: 'Add Employee', path: 'Employees → Add Employee', icon: <BadgeIcon /> },
                      { action: 'Configure Email', path: 'Settings → Email Accounts tab → Add', icon: <SettingsIcon /> },
                      { action: 'Create Template', path: 'Templates → Add Template', icon: <EmailIcon /> },
                      { action: 'Update Task Status', path: 'Tasks → Click task → Update status', icon: <EditIcon /> },
                      { action: 'Export Data', path: 'Any list → Export button', icon: <DownloadIcon /> },
                      { action: 'Search/Filter', path: 'Use search bar or filter dropdowns', icon: <SearchIcon /> },
                    ].map((item, idx) => (
                      <Grid item xs={12} sm={6} md={4} key={idx}>
                        <Paper sx={{ p: 2, borderRadius: 2, bgcolor: 'grey.50' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            {item.icon}
                            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                              {item.action}
                            </Typography>
                          </Box>
                          <Typography variant="caption" color="text.secondary">
                            {item.path}
                          </Typography>
                        </Paper>
                      </Grid>
                    ))}
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        <TabPanel value={tabValue} index={3}>
          {/* User Roles */}
          <Card sx={{ borderRadius: 3, boxShadow: 2 }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                Role-Based Access Control
              </Typography>
              <Alert severity="info" sx={{ mb: 3 }}>
                NexPro uses role-based permissions to control what each user can see and do. Assign appropriate roles to ensure data security.
              </Alert>

              <Grid container spacing={3} sx={{ mb: 4 }}>
                {[
                  { role: 'Admin', color: 'error', desc: 'Full system access. Can manage all settings, users, and data.' },
                  { role: 'Partner', color: 'primary', desc: 'Same as Admin. Typically for firm partners.' },
                  { role: 'Manager', color: 'warning', desc: 'Can manage clients and tasks. Cannot change system settings.' },
                  { role: 'Staff', color: 'info', desc: 'Can only view and update their assigned tasks.' },
                ].map((item) => (
                  <Grid item xs={12} sm={6} md={3} key={item.role}>
                    <Paper sx={{ p: 2, borderRadius: 2, borderLeft: 4, borderColor: `${item.color}.main` }}>
                      <Chip label={item.role} color={item.color} size="small" sx={{ mb: 1 }} />
                      <Typography variant="body2" color="text.secondary">
                        {item.desc}
                      </Typography>
                    </Paper>
                  </Grid>
                ))}
              </Grid>

              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                Permission Matrix
              </Typography>
              <Paper variant="outlined" sx={{ overflow: 'auto' }}>
                <Box sx={{ minWidth: 600, p: 2 }}>
                  <Grid container sx={{ bgcolor: 'grey.100', p: 1, borderRadius: 1, fontWeight: 600 }}>
                    <Grid item xs={4}>Feature</Grid>
                    <Grid item xs={2} sx={{ textAlign: 'center' }}>Admin</Grid>
                    <Grid item xs={2} sx={{ textAlign: 'center' }}>Partner</Grid>
                    <Grid item xs={2} sx={{ textAlign: 'center' }}>Manager</Grid>
                    <Grid item xs={2} sx={{ textAlign: 'center' }}>Staff</Grid>
                  </Grid>
                  {rolePermissions.map((perm, idx) => (
                    <Grid container key={idx} sx={{ p: 1, borderBottom: '1px solid', borderColor: 'grey.200' }}>
                      <Grid item xs={4}>
                        <Typography variant="body2">{perm.feature}</Typography>
                      </Grid>
                      <Grid item xs={2} sx={{ textAlign: 'center' }}>
                        {perm.admin ? <CheckIcon color="success" fontSize="small" /> : '—'}
                      </Grid>
                      <Grid item xs={2} sx={{ textAlign: 'center' }}>
                        {perm.partner ? <CheckIcon color="success" fontSize="small" /> : '—'}
                      </Grid>
                      <Grid item xs={2} sx={{ textAlign: 'center' }}>
                        {perm.manager ? <CheckIcon color="success" fontSize="small" /> : '—'}
                      </Grid>
                      <Grid item xs={2} sx={{ textAlign: 'center' }}>
                        {perm.staff ? <CheckIcon color="success" fontSize="small" /> : '—'}
                      </Grid>
                    </Grid>
                  ))}
                </Box>
              </Paper>
            </CardContent>
          </Card>
        </TabPanel>

        <TabPanel value={tabValue} index={4}>
          {/* FAQs */}
          <Card sx={{ borderRadius: 3, boxShadow: 2 }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                Frequently Asked Questions
              </Typography>
              {faqs.map((faq, index) => (
                <Accordion
                  key={index}
                  expanded={expandedFaq === index}
                  onChange={() => setExpandedFaq(expandedFaq === index ? false : index)}
                  sx={{ mb: 1, '&:before': { display: 'none' }, borderRadius: '8px !important', overflow: 'hidden' }}
                >
                  <AccordionSummary
                    expandIcon={<ExpandMoreIcon />}
                    sx={{ bgcolor: expandedFaq === index ? 'primary.light' : 'grey.50' }}
                  >
                    <Typography sx={{ fontWeight: 500 }}>{faq.question}</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Typography variant="body2" color="text.secondary">
                      {faq.answer}
                    </Typography>
                  </AccordionDetails>
                </Accordion>
              ))}
            </CardContent>
          </Card>

          {/* Contact Support */}
          <Card sx={{ borderRadius: 3, boxShadow: 2, mt: 3, bgcolor: 'primary.light' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: 'primary.dark' }}>
                    Still have questions?
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Contact our support team for assistance
                  </Typography>
                </Box>
                <Button variant="contained" startIcon={<EmailIcon />}>
                  Contact Support
                </Button>
              </Box>
            </CardContent>
          </Card>
        </TabPanel>

        {/* Keyboard Shortcuts */}
        <Card sx={{ borderRadius: 3, boxShadow: 2, mt: 3 }}>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
              Helpful Tips
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <Paper sx={{ p: 2, borderRadius: 2, bgcolor: 'success.light' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'success.dark', mb: 1 }}>
                    <TipIcon fontSize="small" sx={{ mr: 0.5, verticalAlign: 'middle' }} />
                    Productivity Tip
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Use the Calendar view to get a visual overview of all upcoming deadlines and plan your week efficiently.
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} md={4}>
                <Paper sx={{ p: 2, borderRadius: 2, bgcolor: 'info.light' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'info.dark', mb: 1 }}>
                    <TipIcon fontSize="small" sx={{ mr: 0.5, verticalAlign: 'middle' }} />
                    Email Tip
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Set up different email accounts for different work types (e.g., GST, TDS) to organize client communications better.
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} md={4}>
                <Paper sx={{ p: 2, borderRadius: 2, bgcolor: 'warning.light' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'warning.dark', mb: 1 }}>
                    <TipIcon fontSize="small" sx={{ mr: 0.5, verticalAlign: 'middle' }} />
                    Security Tip
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Change your password regularly and use strong passwords. For Gmail SMTP, always use App Passwords instead of your main password.
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
}
