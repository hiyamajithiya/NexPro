import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Paper,
  Divider,
  Button,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  CheckCircle as CheckCircleIcon,
  ExpandMore as ExpandMoreIcon,
  Security as SecurityIcon,
  Storage as StorageIcon,
  Share as ShareIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Visibility as VisibilityIcon,
  Email as EmailIcon,
} from '@mui/icons-material';

export default function PrivacyPolicy() {
  const lastUpdated = 'December 2, 2025';
  const effectiveDate = 'December 2, 2025';

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
        py: 4,
      }}
    >
      <Container maxWidth="lg">
        <Button
          component={RouterLink}
          to="/login"
          startIcon={<ArrowBackIcon />}
          sx={{ mb: 3 }}
        >
          Back to Login
        </Button>

        <Paper sx={{ p: 4, borderRadius: 3 }}>
          {/* Header */}
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Typography
              variant="h3"
              sx={{
                fontWeight: 700,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                mb: 2,
              }}
            >
              Privacy Policy
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Last Updated: {lastUpdated} | Effective Date: {effectiveDate}
            </Typography>
          </Box>

          <Divider sx={{ mb: 4 }} />

          {/* Introduction */}
          <Typography variant="body1" paragraph>
            NexPro ("we," "our," or "us") is committed to protecting your privacy and ensuring the security of your personal data. This Privacy Policy explains how we collect, use, store, and protect your information in compliance with the <strong>Information Technology Act, 2000</strong> and the <strong>Digital Personal Data Protection Act, 2023 (DPDP Act)</strong> of India.
          </Typography>

          <Typography variant="body1" paragraph>
            By using NexPro, you consent to the data practices described in this policy. Please read this policy carefully to understand our practices regarding your personal data.
          </Typography>

          {/* Table of Contents */}
          <Paper variant="outlined" sx={{ p: 2, mb: 4, bgcolor: 'grey.50' }}>
            <Typography variant="h6" gutterBottom>
              Table of Contents
            </Typography>
            <List dense>
              {[
                'Information We Collect',
                'How We Use Your Information',
                'Data Storage and Security',
                'Data Sharing and Disclosure',
                'Your Rights Under DPDP Act',
                'Data Retention',
                'Cookies and Tracking',
                'Children\'s Privacy',
                'Changes to This Policy',
                'Grievance Redressal',
                'Contact Us',
              ].map((item, index) => (
                <ListItem key={index} sx={{ py: 0.5 }}>
                  <ListItemText primary={`${index + 1}. ${item}`} />
                </ListItem>
              ))}
            </List>
          </Paper>

          {/* Section 1 */}
          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <StorageIcon color="primary" />
                <Typography variant="h6">1. Information We Collect</Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="subtitle1" gutterBottom fontWeight={600}>
                1.1 Information You Provide Directly
              </Typography>
              <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'grey.100' }}>
                      <TableCell><strong>Category</strong></TableCell>
                      <TableCell><strong>Data Collected</strong></TableCell>
                      <TableCell><strong>Purpose</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell>Account Information</TableCell>
                      <TableCell>Name, Email, Phone, Password</TableCell>
                      <TableCell>User authentication and account management</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Organization Data</TableCell>
                      <TableCell>Firm name, Address, GSTIN, PAN</TableCell>
                      <TableCell>Multi-tenant setup and business operations</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Client Information</TableCell>
                      <TableCell>Client name, Contact details, PAN, GSTIN</TableCell>
                      <TableCell>Client management and statutory compliance</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Task Data</TableCell>
                      <TableCell>Work assignments, Due dates, Status</TableCell>
                      <TableCell>Task tracking and workflow management</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>

              <Typography variant="subtitle1" gutterBottom fontWeight={600}>
                1.2 Information Collected Automatically
              </Typography>
              <List>
                <ListItem>
                  <ListItemIcon><CheckCircleIcon color="primary" /></ListItemIcon>
                  <ListItemText
                    primary="Log Data"
                    secondary="IP address, browser type, device information, access timestamps"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon><CheckCircleIcon color="primary" /></ListItemIcon>
                  <ListItemText
                    primary="Usage Analytics"
                    secondary="Pages visited, features used, interaction patterns"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon><CheckCircleIcon color="primary" /></ListItemIcon>
                  <ListItemText
                    primary="Security Logs"
                    secondary="Login attempts, security events, audit trails"
                  />
                </ListItem>
              </List>
            </AccordionDetails>
          </Accordion>

          {/* Section 2 */}
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <EditIcon color="primary" />
                <Typography variant="h6">2. How We Use Your Information</Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Typography paragraph>
                We process your personal data only for lawful purposes as required under Section 4 of the DPDP Act:
              </Typography>
              <List>
                {[
                  { primary: 'Service Delivery', secondary: 'To provide and maintain the NexPro platform' },
                  { primary: 'Account Management', secondary: 'To create and manage your user account' },
                  { primary: 'Communication', secondary: 'To send important notifications, reminders, and updates' },
                  { primary: 'Security', secondary: 'To protect against unauthorized access and maintain platform security' },
                  { primary: 'Legal Compliance', secondary: 'To comply with applicable laws and regulations' },
                  { primary: 'Improvement', secondary: 'To analyze usage patterns and improve our services' },
                ].map((item, index) => (
                  <ListItem key={index}>
                    <ListItemIcon><CheckCircleIcon color="success" /></ListItemIcon>
                    <ListItemText primary={item.primary} secondary={item.secondary} />
                  </ListItem>
                ))}
              </List>
            </AccordionDetails>
          </Accordion>

          {/* Section 3 */}
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <SecurityIcon color="primary" />
                <Typography variant="h6">3. Data Storage and Security</Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="subtitle1" gutterBottom fontWeight={600}>
                Security Measures (Section 43A, IT Act 2000)
              </Typography>
              <Typography paragraph>
                We implement reasonable security practices and procedures as mandated by Section 43A of the IT Act:
              </Typography>
              <List>
                {[
                  'End-to-end encryption (TLS/HTTPS) for data in transit',
                  'Fernet encryption for sensitive credentials stored at rest',
                  'Password hashing using PBKDF2 algorithm',
                  'Role-based access control (RBAC)',
                  'Multi-factor authentication via OTP',
                  'Regular security audits and vulnerability assessments',
                  'Secure session management with JWT tokens',
                  'Rate limiting to prevent brute-force attacks',
                ].map((item, index) => (
                  <ListItem key={index}>
                    <ListItemIcon><CheckCircleIcon color="success" /></ListItemIcon>
                    <ListItemText primary={item} />
                  </ListItem>
                ))}
              </List>

              <Typography variant="subtitle1" gutterBottom fontWeight={600} sx={{ mt: 2 }}>
                Data Location
              </Typography>
              <Typography paragraph>
                Your data is stored on secure servers. For self-hosted deployments, data resides on your own infrastructure. We do not transfer personal data outside India without appropriate safeguards as per Section 16 of the DPDP Act.
              </Typography>
            </AccordionDetails>
          </Accordion>

          {/* Section 4 */}
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <ShareIcon color="primary" />
                <Typography variant="h6">4. Data Sharing and Disclosure</Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Typography paragraph>
                We do not sell your personal data. We may share your information only in the following circumstances:
              </Typography>
              <List>
                <ListItem>
                  <ListItemIcon><CheckCircleIcon color="warning" /></ListItemIcon>
                  <ListItemText
                    primary="Legal Requirements"
                    secondary="When required by law, court order, or government authority"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon><CheckCircleIcon color="warning" /></ListItemIcon>
                  <ListItemText
                    primary="Service Providers"
                    secondary="With trusted third-party services (email providers) under strict contractual obligations"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon><CheckCircleIcon color="warning" /></ListItemIcon>
                  <ListItemText
                    primary="With Your Consent"
                    secondary="When you explicitly authorize sharing"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon><CheckCircleIcon color="warning" /></ListItemIcon>
                  <ListItemText
                    primary="Business Transfer"
                    secondary="In case of merger, acquisition, or sale of assets (with prior notice)"
                  />
                </ListItem>
              </List>
            </AccordionDetails>
          </Accordion>

          {/* Section 5 - DPDP Rights */}
          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <VisibilityIcon color="primary" />
                <Typography variant="h6">5. Your Rights Under DPDP Act 2023</Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Typography paragraph>
                As a Data Principal under the DPDP Act, you have the following rights:
              </Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'primary.light' }}>
                      <TableCell sx={{ color: 'white' }}><strong>Right</strong></TableCell>
                      <TableCell sx={{ color: 'white' }}><strong>Section</strong></TableCell>
                      <TableCell sx={{ color: 'white' }}><strong>Description</strong></TableCell>
                      <TableCell sx={{ color: 'white' }}><strong>How to Exercise</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell><strong>Right to Access</strong></TableCell>
                      <TableCell>Section 11</TableCell>
                      <TableCell>Access all personal data we hold about you</TableCell>
                      <TableCell>Profile page or data export feature</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell><strong>Right to Correction</strong></TableCell>
                      <TableCell>Section 12</TableCell>
                      <TableCell>Request correction of inaccurate data</TableCell>
                      <TableCell>Edit profile or contact support</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell><strong>Right to Erasure</strong></TableCell>
                      <TableCell>Section 13</TableCell>
                      <TableCell>Request deletion of your personal data</TableCell>
                      <TableCell>Account deletion in settings</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell><strong>Right to Grievance Redressal</strong></TableCell>
                      <TableCell>Section 13</TableCell>
                      <TableCell>File complaints about data handling</TableCell>
                      <TableCell>Contact Grievance Officer</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell><strong>Right to Data Portability</strong></TableCell>
                      <TableCell>Section 11</TableCell>
                      <TableCell>Export your data in machine-readable format</TableCell>
                      <TableCell>Data export feature in settings</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </AccordionDetails>
          </Accordion>

          {/* Section 6 */}
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <DeleteIcon color="primary" />
                <Typography variant="h6">6. Data Retention</Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Typography paragraph>
                We retain your data only as long as necessary for the purposes outlined in this policy:
              </Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'grey.100' }}>
                      <TableCell><strong>Data Type</strong></TableCell>
                      <TableCell><strong>Retention Period</strong></TableCell>
                      <TableCell><strong>Basis</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell>Account Data</TableCell>
                      <TableCell>Until account deletion + 30 days</TableCell>
                      <TableCell>Service provision</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Audit Logs</TableCell>
                      <TableCell>8 years</TableCell>
                      <TableCell>IT Act Section 7A compliance</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Transaction Records</TableCell>
                      <TableCell>8 years</TableCell>
                      <TableCell>Tax and statutory compliance</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Security Logs</TableCell>
                      <TableCell>3 years</TableCell>
                      <TableCell>Security monitoring</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>OTP Data</TableCell>
                      <TableCell>24 hours</TableCell>
                      <TableCell>Authentication only</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </AccordionDetails>
          </Accordion>

          {/* Section 7-9 */}
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6">7. Cookies and Tracking</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography paragraph>
                We use essential cookies for authentication and session management. We do not use third-party tracking cookies or behavioral advertising.
              </Typography>
            </AccordionDetails>
          </Accordion>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6">8. Children's Privacy</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography paragraph>
                NexPro is a B2B platform designed for professional use. We do not knowingly collect personal data from individuals under 18 years of age. If we become aware of such collection, we will promptly delete the data.
              </Typography>
            </AccordionDetails>
          </Accordion>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6">9. Changes to This Policy</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography paragraph>
                We may update this Privacy Policy periodically. We will notify you of any material changes through:
              </Typography>
              <List>
                <ListItem>
                  <ListItemIcon><CheckCircleIcon color="primary" /></ListItemIcon>
                  <ListItemText primary="Email notification to registered users" />
                </ListItem>
                <ListItem>
                  <ListItemIcon><CheckCircleIcon color="primary" /></ListItemIcon>
                  <ListItemText primary="Prominent notice on our website/application" />
                </ListItem>
                <ListItem>
                  <ListItemIcon><CheckCircleIcon color="primary" /></ListItemIcon>
                  <ListItemText primary="Updated 'Last Updated' date on this page" />
                </ListItem>
              </List>
            </AccordionDetails>
          </Accordion>

          {/* Section 10 - Grievance Officer */}
          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <EmailIcon color="primary" />
                <Typography variant="h6">10. Grievance Redressal</Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Typography paragraph>
                In accordance with Section 13 of the DPDP Act and the IT Act 2000, we have appointed a Grievance Officer to address your concerns:
              </Typography>
              <Paper variant="outlined" sx={{ p: 3, bgcolor: 'primary.50' }}>
                <Typography variant="h6" gutterBottom>
                  Grievance Officer / Data Protection Officer
                </Typography>
                <Typography variant="body1">
                  <strong>Name:</strong> NexPro Support Team<br />
                  <strong>Email:</strong> chinmaytechsoft@gmail.com<br />
                  <strong>Response Time:</strong> Within 30 days of receiving your complaint
                </Typography>
              </Paper>
              <Typography paragraph sx={{ mt: 2 }}>
                If you are not satisfied with our response, you may file a complaint with the Data Protection Board of India as established under the DPDP Act 2023.
              </Typography>
            </AccordionDetails>
          </Accordion>

          {/* Section 11 - Contact */}
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6">11. Contact Us</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography paragraph>
                For any questions about this Privacy Policy or our data practices, please contact us:
              </Typography>
              <Paper variant="outlined" sx={{ p: 3 }}>
                <Typography variant="body1">
                  <strong>NexPro</strong><br />
                  Email: chinmaytechsoft@gmail.com<br />
                  Website: www.nexpro.com
                </Typography>
              </Paper>
            </AccordionDetails>
          </Accordion>

          <Divider sx={{ my: 4 }} />

          {/* Footer */}
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              This Privacy Policy is compliant with:
            </Typography>
            <Typography variant="body2" color="primary" sx={{ fontWeight: 600 }}>
              Information Technology Act, 2000 | Digital Personal Data Protection Act, 2023
            </Typography>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}
