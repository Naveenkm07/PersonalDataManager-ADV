import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { useNotification } from '../contexts/NotificationContext';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

interface AnalyticsData {
  usageMetrics: any[];
  dailyStats: Record<string, any>;
  categoryStats: Record<string, any>;
}

const OfflineAnalytics: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [dailyStats, setDailyStats] = useState<any[]>([]);
  const [categoryStats, setCategoryStats] = useState<any[]>([]);
  const [usageMetrics, setUsageMetrics] = useState<any[]>([]);
  const { showNotification } = useNotification();

  useEffect(() => {
    loadAnalyticsData();
  }, []);

  const loadAnalyticsData = () => {
    try {
      setIsLoading(true);
      
      // Get data from localStorage
      const passwords = JSON.parse(localStorage.getItem('passwords') || '[]');
      const contacts = JSON.parse(localStorage.getItem('contacts') || '[]');
      const notes = JSON.parse(localStorage.getItem('secureNotes') || '[]');

      // Calculate daily stats
      const today = new Date().toISOString().split('T')[0];
      const dailyData = {
        date: today,
        passwords: passwords.length,
        contacts: contacts.length,
        notes: notes.length,
      };
      setDailyStats([dailyData]);

      // Calculate category stats
      const categoryData = [
        { name: 'Passwords', value: passwords.length },
        { name: 'Contacts', value: contacts.length },
        { name: 'Notes', value: notes.length },
      ];
      setCategoryStats(categoryData);

      // Calculate usage metrics
      const metrics = [
        {
          name: 'Total Items',
          value: passwords.length + contacts.length + notes.length,
        },
        {
          name: 'Last Updated',
          value: new Date().toLocaleString(),
        },
        {
          name: 'Storage Used',
          value: `${Math.round(
            (JSON.stringify(passwords).length +
              JSON.stringify(contacts).length +
              JSON.stringify(notes).length) /
              1024
          )} KB`,
        },
      ];
      setUsageMetrics(metrics);
    } catch (error) {
      showNotification('Failed to load analytics data', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportReport = () => {
    try {
      const data = {
        dailyStats,
        categoryStats,
        usageMetrics,
        timestamp: new Date().toISOString(),
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `analytics_report_${new Date().toISOString()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showNotification('Analytics report exported successfully', 'success');
    } catch (error) {
      showNotification('Failed to export analytics report', 'error');
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Analytics
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        View analytics and usage statistics for your offline data.
      </Alert>

      <Box sx={{ mb: 3 }}>
        <Button
          variant="contained"
          onClick={handleExportReport}
          disabled={isLoading}
        >
          Export Report
        </Button>
      </Box>

      <Grid container spacing={3}>
        {/* Usage Metrics */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Usage Metrics
              </Typography>
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Metric</TableCell>
                      <TableCell>Value</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {usageMetrics.map((metric) => (
                      <TableRow key={metric.name}>
                        <TableCell>{metric.name}</TableCell>
                        <TableCell>{metric.value}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Daily Stats Chart */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Daily Statistics
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dailyStats}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="passwords"
                    stroke="#8884d8"
                    name="Passwords"
                  />
                  <Line
                    type="monotone"
                    dataKey="contacts"
                    stroke="#82ca9d"
                    name="Contacts"
                  />
                  <Line
                    type="monotone"
                    dataKey="notes"
                    stroke="#ffc658"
                    name="Notes"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Category Distribution */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Data Distribution
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={categoryStats}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label
                  >
                    {categoryStats.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default OfflineAnalytics; 