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
  Cookie as CookieIcon,
  Security as SecurityIcon,
  Settings as SettingsIcon,
  Analytics as AnalyticsIcon,
} from '@mui/icons-material';

export default function CookiePolicy() {
  const lastUpdated = 'December 2, 2025';
  const effectiveDate = 'December 2, 2025';

  const cookieTypes = [
    {
      name: 'Essential Cookies',
      description: 'These cookies are necessary for the website to function and cannot be switched off. They are usually only set in response to actions made by you such as setting your privacy preferences, logging in, or filling in forms.',
      examples: ['Session cookies', 'Authentication cookies', 'Security cookies'],
      retention: 'Session or up to 24 hours',
      required: true,
    },
    {
      name: 'Functional Cookies',
      description: 'These cookies enable the website to provide enhanced functionality and personalization. They may be set by us or by third-party providers whose services we have added to our pages.',
      examples: ['Language preferences', 'User interface settings', 'Remember me functionality'],
      retention: 'Up to 1 year',
      required: false,
    },
    {
      name: 'Analytics Cookies',
      description: 'These cookies allow us to count visits and traffic sources so we can measure and improve the performance of our site. They help us know which pages are the most and least popular.',
      examples: ['Page view tracking', 'Feature usage analytics', 'Performance monitoring'],
      retention: 'Up to 2 years',
      required: false,
    },
  ];

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
          to="/home"
          startIcon={<ArrowBackIcon />}
          sx={{ mb: 3 }}
        >
          Back to Home
        </Button>

        <Paper sx={{ p: 4, borderRadius: 3 }}>
          {/* Header */}
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <CookieIcon sx={{ fontSize: 48, color: '#6366f1', mb: 2 }} />
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
              Cookie Policy
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Last Updated: {lastUpdated} | Effective Date: {effectiveDate}
            </Typography>
          </Box>

          <Divider sx={{ mb: 4 }} />

          {/* Introduction */}
          <Typography variant="body1" paragraph>
            This Cookie Policy explains how NexPro ("we," "our," or "us"), a product of <strong>Chinmay Technosoft Private Limited</strong>, uses cookies and similar technologies to recognize you when you visit our website and use our services. It explains what these technologies are and why we use them, as well as your rights to control our use of them.
          </Typography>

          <Typography variant="body1" paragraph>
            By using NexPro, you consent to the use of cookies in accordance with this Cookie Policy. If you do not accept the use of cookies, please disable them as instructed in this policy so that cookies from this website cannot be placed on your device.
          </Typography>

          {/* What are Cookies */}
          <Accordion defaultExpanded sx={{ mb: 2 }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                1. What are Cookies?
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body1" paragraph>
                Cookies are small text files that are stored on your computer or mobile device when you visit a website. They are widely used to make websites work more efficiently and provide information to website owners.
              </Typography>
              <Typography variant="body1" paragraph>
                Cookies can be "persistent" or "session" cookies:
              </Typography>
              <List>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircleIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Persistent Cookies"
                    secondary="Remain on your device until deleted or until they expire"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircleIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Session Cookies"
                    secondary="Deleted when you close your web browser"
                  />
                </ListItem>
              </List>
            </AccordionDetails>
          </Accordion>

          {/* Types of Cookies We Use */}
          <Accordion defaultExpanded sx={{ mb: 2 }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                2. Types of Cookies We Use
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'grey.100' }}>
                      <TableCell sx={{ fontWeight: 600 }}>Cookie Type</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Purpose</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Retention</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Required</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {cookieTypes.map((cookie) => (
                      <TableRow key={cookie.name}>
                        <TableCell sx={{ fontWeight: 500 }}>{cookie.name}</TableCell>
                        <TableCell>{cookie.description}</TableCell>
                        <TableCell>{cookie.retention}</TableCell>
                        <TableCell>{cookie.required ? 'Yes' : 'No'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </AccordionDetails>
          </Accordion>

          {/* Specific Cookies We Use */}
          <Accordion sx={{ mb: 2 }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                3. Specific Cookies Used by NexPro
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'grey.100' }}>
                      <TableCell sx={{ fontWeight: 600 }}>Cookie Name</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Type</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Purpose</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Duration</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell>nexpro_session</TableCell>
                      <TableCell>Essential</TableCell>
                      <TableCell>Maintains user session state</TableCell>
                      <TableCell>Session</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>nexpro_auth</TableCell>
                      <TableCell>Essential</TableCell>
                      <TableCell>Authentication token storage</TableCell>
                      <TableCell>7 days</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>nexpro_csrf</TableCell>
                      <TableCell>Essential</TableCell>
                      <TableCell>Cross-site request forgery protection</TableCell>
                      <TableCell>Session</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>nexpro_preferences</TableCell>
                      <TableCell>Functional</TableCell>
                      <TableCell>Stores user preferences (theme, language)</TableCell>
                      <TableCell>1 year</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </AccordionDetails>
          </Accordion>

          {/* How to Control Cookies */}
          <Accordion sx={{ mb: 2 }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                4. How to Control Cookies
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body1" paragraph>
                You can control and manage cookies in various ways. Please note that removing or blocking cookies may impact your user experience and some functionality may no longer be available.
              </Typography>

              <Typography variant="subtitle1" sx={{ fontWeight: 600, mt: 2, mb: 1 }}>
                Browser Settings
              </Typography>
              <Typography variant="body1" paragraph>
                Most browsers allow you to refuse to accept cookies and to delete cookies. The methods for doing so vary from browser to browser:
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemIcon><SettingsIcon color="primary" /></ListItemIcon>
                  <ListItemText primary="Chrome: Settings → Privacy and Security → Cookies" />
                </ListItem>
                <ListItem>
                  <ListItemIcon><SettingsIcon color="primary" /></ListItemIcon>
                  <ListItemText primary="Firefox: Options → Privacy & Security → Cookies" />
                </ListItem>
                <ListItem>
                  <ListItemIcon><SettingsIcon color="primary" /></ListItemIcon>
                  <ListItemText primary="Safari: Preferences → Privacy → Cookies" />
                </ListItem>
                <ListItem>
                  <ListItemIcon><SettingsIcon color="primary" /></ListItemIcon>
                  <ListItemText primary="Edge: Settings → Privacy & Security → Cookies" />
                </ListItem>
              </List>

              <Typography variant="subtitle1" sx={{ fontWeight: 600, mt: 2, mb: 1 }}>
                Impact of Disabling Cookies
              </Typography>
              <Typography variant="body1" paragraph>
                If you disable essential cookies, you may not be able to:
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemIcon><SecurityIcon color="error" /></ListItemIcon>
                  <ListItemText primary="Log in to your NexPro account" />
                </ListItem>
                <ListItem>
                  <ListItemIcon><SecurityIcon color="error" /></ListItemIcon>
                  <ListItemText primary="Access protected features and data" />
                </ListItem>
                <ListItem>
                  <ListItemIcon><SecurityIcon color="error" /></ListItemIcon>
                  <ListItemText primary="Maintain your session while navigating the application" />
                </ListItem>
              </List>
            </AccordionDetails>
          </Accordion>

          {/* Third-Party Cookies */}
          <Accordion sx={{ mb: 2 }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                5. Third-Party Cookies
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body1" paragraph>
                We do not use third-party advertising cookies. However, we may use limited third-party services that set their own cookies:
              </Typography>
              <List>
                <ListItem>
                  <ListItemIcon><AnalyticsIcon color="primary" /></ListItemIcon>
                  <ListItemText
                    primary="Analytics Services"
                    secondary="To understand how users interact with our platform and improve our services"
                  />
                </ListItem>
              </List>
              <Typography variant="body1" paragraph>
                We ensure that any third-party services we use are compliant with applicable data protection laws and our privacy standards.
              </Typography>
            </AccordionDetails>
          </Accordion>

          {/* Updates to Policy */}
          <Accordion sx={{ mb: 2 }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                6. Updates to This Policy
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body1" paragraph>
                We may update this Cookie Policy from time to time to reflect changes in technology, legislation, our operations, or for other operational, legal, or regulatory reasons. Any changes will be posted on this page with an updated revision date.
              </Typography>
              <Typography variant="body1" paragraph>
                We encourage you to periodically review this policy to stay informed about our use of cookies.
              </Typography>
            </AccordionDetails>
          </Accordion>

          {/* Contact Information */}
          <Accordion sx={{ mb: 2 }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                7. Contact Us
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body1" paragraph>
                If you have any questions about our use of cookies or this Cookie Policy, please contact us:
              </Typography>
              <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
                <Typography variant="body1">
                  <strong>Chinmay Technosoft Private Limited</strong>
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Email: privacy@chinmaytechnosoft.com
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Website: https://chinmaytechnosoft.com
                </Typography>
              </Paper>
            </AccordionDetails>
          </Accordion>

          <Divider sx={{ my: 4 }} />

          {/* Footer */}
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary" paragraph>
              This Cookie Policy is compliant with the Information Technology Act, 2000 and the Digital Personal Data Protection Act, 2023 (DPDP Act) of India.
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Button
                component={RouterLink}
                to="/privacy-policy"
                variant="outlined"
                size="small"
              >
                Privacy Policy
              </Button>
              <Button
                component={RouterLink}
                to="/terms-of-service"
                variant="outlined"
                size="small"
              >
                Terms of Service
              </Button>
              <Button
                component={RouterLink}
                to="/home"
                variant="contained"
                size="small"
              >
                Back to Home
              </Button>
            </Box>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}
