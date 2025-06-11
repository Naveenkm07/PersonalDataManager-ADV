import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  CircularProgress,
  LinearProgress,
  Chip,
} from '@mui/material';
import {
  Security as SecurityIcon,
  Timeline as TimelineIcon,
  Assessment as AssessmentIcon,
  Insights as InsightsIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { useNotification } from '../contexts/NotificationContext';

interface SecurityScore {
  overall: number;
  passwordStrength: number;
  encryptionStatus: number;
  backupStatus: number;
}

interface ActivityLog {
  id: string;
  type: 'password' | 'contact' | 'task' | 'backup';
  action: 'create' | 'update' | 'delete';
  timestamp: string;
  details: string;
}

interface UsageStats {
  totalPasswords: number;
  totalContacts: number;
  totalTasks: number;
  lastBackup: string | null;
  weakPasswords: number;
  reusedPasswords: number;
}

const Analytics: React.FC = () => {
  const [securityScore, setSecurityScore] = useState<SecurityScore>({
    overall: 0,
    passwordStrength: 0,
    encryptionStatus: 0,
    backupStatus: 0,
  });
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [usageStats, setUsageStats] = useState<UsageStats>({
    totalPasswords: 0,
    totalContacts: 0,
    totalTasks: 0,
    lastBackup: null,
    weakPasswords: 0,
    reusedPasswords: 0,
  });
  const { showNotification } = useNotification();

  useEffect(() => {
    loadAnalyticsData();
  }, []);

  const loadAnalyticsData = () => {
    try {
      // Load passwords
      const passwords = JSON.parse(localStorage.getItem('passwords') || '[]');
      const contacts = JSON.parse(localStorage.getItem('contacts') || '[]');
      const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
      const backups = JSON.parse(localStorage.getItem('backups') || '[]');
      const activityLogs = JSON.parse(localStorage.getItem('activityLogs') || '[]');

      // Calculate security score
      const weakPasswords = passwords.filter((pwd: any) => {
        const hasUppercase = /[A-Z]/.test(pwd.password);
        const hasLowercase = /[a-z]/.test(pwd.password);
        const hasNumbers = /[0-9]/.test(pwd.password);
        const hasSpecial = /[^A-Za-z0-9]/.test(pwd.password);
        return !(hasUppercase && hasLowercase && hasNumbers && hasSpecial) || pwd.password.length < 12;
      }).length;

      const passwordStrength = Math.max(0, 100 - (weakPasswords / passwords.length) * 100);
      const encryptionStatus = localStorage.getItem('encryptionKey') ? 100 : 0;
      const backupStatus = backups.length > 0 ? 100 : 0;
      const overall = Math.round((passwordStrength + encryptionStatus + backupStatus) / 3);

      setSecurityScore({
        overall,
        passwordStrength,
        encryptionStatus,
        backupStatus,
      });

      // Set usage stats
      setUsageStats({
        totalPasswords: passwords.length,
        totalContacts: contacts.length,
        totalTasks: tasks.length,
        lastBackup: backups.length > 0 ? new Date(backups[backups.length - 1].timestamp).toLocaleString() : null,
        weakPasswords,
        reusedPasswords: findReusedPasswords(passwords),
      });

      // Set activity logs
      setActivityLogs(activityLogs);
    } catch (error) {
      showNotification('Error loading analytics data', 'error');
    }
  };

  const findReusedPasswords = (passwords: any[]): number => {
    const passwordMap = new Map<string, number>();
    passwords.forEach(pwd => {
      passwordMap.set(pwd.password, (passwordMap.get(pwd.password) || 0) + 1);
    });
    return Array.from(passwordMap.values()).filter(count => count > 1).length;
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'success.main';
    if (score >= 60) return 'warning.main';
    return 'error.main';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Good';
    if (score >= 60) return 'Fair';
    return 'Poor';
  };

  const renderSecurityScore = () => (
    <Card>
      <CardHeader title="Security Score" />
      <CardContent>
        <Box sx={{ textAlign: 'center', mb: 2 }}>
          <CircularProgress
            variant="determinate"
            value={securityScore.overall}
            size={120}
            thickness={4}
            sx={{ color: getScoreColor(securityScore.overall) }}
          />
          <Typography variant="h4" sx={{ mt: 2, color: getScoreColor(securityScore.overall) }}>
            {securityScore.overall}%
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            {getScoreLabel(securityScore.overall)}
          </Typography>
        </Box>
        <List>
          <ListItem>
            <ListItemIcon>
              <SecurityIcon color={securityScore.passwordStrength >= 80 ? 'success' : 'warning'} />
            </ListItemIcon>
            <ListItemText
              primary="Password Strength"
              secondary={`${securityScore.passwordStrength}%`}
            />
            <LinearProgress
              variant="determinate"
              value={securityScore.passwordStrength}
              sx={{ width: 100, color: getScoreColor(securityScore.passwordStrength) }}
            />
          </ListItem>
          <ListItem>
            <ListItemIcon>
              <SecurityIcon color={securityScore.encryptionStatus >= 80 ? 'success' : 'warning'} />
            </ListItemIcon>
            <ListItemText
              primary="Encryption Status"
              secondary={`${securityScore.encryptionStatus}%`}
            />
            <LinearProgress
              variant="determinate"
              value={securityScore.encryptionStatus}
              sx={{ width: 100, color: getScoreColor(securityScore.encryptionStatus) }}
            />
          </ListItem>
          <ListItem>
            <ListItemIcon>
              <SecurityIcon color={securityScore.backupStatus >= 80 ? 'success' : 'warning'} />
            </ListItemIcon>
            <ListItemText
              primary="Backup Status"
              secondary={`${securityScore.backupStatus}%`}
            />
            <LinearProgress
              variant="determinate"
              value={securityScore.backupStatus}
              sx={{ width: 100, color: getScoreColor(securityScore.backupStatus) }}
            />
          </ListItem>
        </List>
      </CardContent>
    </Card>
  );

  const renderUsageStats = () => (
    <Card>
      <CardHeader title="Usage Statistics" />
      <CardContent>
        <Grid container spacing={2}>
          <Grid item xs={6}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h6">{usageStats.totalPasswords}</Typography>
              <Typography variant="body2" color="text.secondary">Total Passwords</Typography>
            </Paper>
          </Grid>
          <Grid item xs={6}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h6">{usageStats.totalContacts}</Typography>
              <Typography variant="body2" color="text.secondary">Total Contacts</Typography>
            </Paper>
          </Grid>
          <Grid item xs={6}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h6">{usageStats.totalTasks}</Typography>
              <Typography variant="body2" color="text.secondary">Total Tasks</Typography>
            </Paper>
          </Grid>
          <Grid item xs={6}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h6">
                {usageStats.lastBackup ? 'Yes' : 'No'}
              </Typography>
              <Typography variant="body2" color="text.secondary">Last Backup</Typography>
            </Paper>
          </Grid>
        </Grid>
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle1" gutterBottom>Security Issues</Typography>
          {usageStats.weakPasswords > 0 && (
            <Chip
              icon={<WarningIcon />}
              label={`${usageStats.weakPasswords} weak passwords`}
              color="warning"
              sx={{ mr: 1, mb: 1 }}
            />
          )}
          {usageStats.reusedPasswords > 0 && (
            <Chip
              icon={<ErrorIcon />}
              label={`${usageStats.reusedPasswords} reused passwords`}
              color="error"
              sx={{ mr: 1, mb: 1 }}
            />
          )}
          {usageStats.weakPasswords === 0 && usageStats.reusedPasswords === 0 && (
            <Chip
              icon={<CheckCircleIcon />}
              label="No security issues found"
              color="success"
            />
          )}
        </Box>
      </CardContent>
    </Card>
  );

  const renderActivityLog = () => (
    <Card>
      <CardHeader title="Recent Activity" />
      <CardContent>
        <List>
          {activityLogs.slice(0, 10).map((log) => (
            <React.Fragment key={log.id}>
              <ListItem>
                <ListItemIcon>
                  {log.type === 'password' && <SecurityIcon />}
                  {log.type === 'contact' && <TimelineIcon />}
                  {log.type === 'task' && <AssessmentIcon />}
                  {log.type === 'backup' && <InsightsIcon />}
                </ListItemIcon>
                <ListItemText
                  primary={log.details}
                  secondary={new Date(log.timestamp).toLocaleString()}
                />
              </ListItem>
              <Divider />
            </React.Fragment>
          ))}
          {activityLogs.length === 0 && (
            <ListItem>
              <ListItemText
                primary="No recent activity"
                secondary="Your activity will appear here"
              />
            </ListItem>
          )}
        </List>
      </CardContent>
    </Card>
  );

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Analytics & Reporting
      </Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          {renderSecurityScore()}
        </Grid>
        <Grid item xs={12} md={6}>
          {renderUsageStats()}
        </Grid>
        <Grid item xs={12}>
          {renderActivityLog()}
        </Grid>
      </Grid>
    </Box>
  );
};

export default Analytics; 