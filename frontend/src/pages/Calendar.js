import React from 'react';
import { Container, Typography, Box, Card, CardContent } from '@mui/material';
import { CalendarMonth as CalendarIcon } from '@mui/icons-material';
import TaskCalendar from '../components/TaskCalendar';

export default function Calendar() {
  return (
    <Container maxWidth="xl">
      <Box sx={{ mb: 4 }}>
        <Card
          sx={{
            background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
            color: 'white',
            mb: 3,
          }}
        >
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <CalendarIcon sx={{ fontSize: 40 }} />
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 600 }}>
                  Task Calendar
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.5 }}>
                  View all tasks in a calendar format with filtering options
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>

        <Card sx={{ borderRadius: 3, boxShadow: 3 }}>
          <TaskCalendar />
        </Card>
      </Box>
    </Container>
  );
}
