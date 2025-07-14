import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Typography,
  Card,
  CardContent,
  CircularProgress,
  Paper,
  TextField,
  InputAdornment,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Chip,
  Avatar,
  Badge,
  Tooltip,
  Fab,
  SpeedDial,
  SpeedDialAction,
  SpeedDialIcon,
  Alert,
  LinearProgress,
  useTheme,
  useMediaQuery,
  ListItemAvatar,
} from '@mui/material';
import {
  Lock as LockIcon,
  People as PeopleIcon,
  Security as SecurityIcon,
  Sync as SyncIcon,
  Note as NoteIcon,
  Storage as StorageIcon,
  Analytics as AnalyticsIcon,
  Search as SearchIcon,
  Close as CloseIcon,
  Add as AddIcon,
  Backup as BackupIcon,
  Settings as SettingsIcon,
  Notifications as NotificationsIcon,
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Star as StarIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import SyncService from '../services/SyncService';
import SecurityService from '../services/SecurityService';

interface SearchResultItem {
  title: string;
  subtitle: string;
  onClick: () => void;
  type: string;
  icon: React.ReactNode;
}

interface SearchResultCategory {
  type: string;
  icon: React.ReactNode;
  items: SearchResultItem[];
}

interface QuickStats {
  totalPasswords: number;
  totalContacts: number;
  totalNotes: number;
  weakPasswords: number;
  pendingSync: number;
  securityScore: number;
}

interface DashboardStats {
  totalPasswords: number;
  totalContacts: number;
  securityScore: number;
  lastSync: string;
  pendingActions: number;
  storageUsed: number;
  storageTotal: number;
}

interface SecurityAlert {
  id: string;
  type: 'warning' | 'error' | 'info' | 'success';
  message: string;
  timestamp: string;
}

const Dashboard: React.FC = () => {
  const { user, isLoading } = useAuth();
  const { showNotification } = useNotification();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResultCategory[]>([]);
  const [searchDialogOpen, setSearchDialogOpen] = useState(false);
  const [quickStats, setQuickStats] = useState<QuickStats>({
    totalPasswords: 0,
    totalContacts: 0,
    totalNotes: 0,
    weakPasswords: 0,
    pendingSync: 0,
    securityScore: 0,
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [securityAlerts, setSecurityAlerts] = useState<any[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalPasswords: 0,
    totalContacts: 0,
    securityScore: 85,
    lastSync: '2 hours ago',
    pendingActions: 3,
    storageUsed: 2.5,
    storageTotal: 10
  });
  const [alerts, setAlerts] = useState<SecurityAlert[]>([
    {
      id: '1',
      type: 'warning',
      message: 'Some passwords may be weak',
      timestamp: '2 hours ago'
    },
    {
      id: '2',
      type: 'info',
      message: 'Backup completed successfully',
      timestamp: '1 day ago'
    }
  ]);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const navItems = [
    { 
      path: '/passwords',
      label: 'Passwords', 
      icon: <LockIcon />,
      color: '#2196f3',
      description: 'Manage your passwords securely',
      quickAction: () => navigate('/passwords')
    },
    { 
      path: '/contacts',
      label: 'Contacts', 
      icon: <PeopleIcon />,
      color: '#4caf50',
      description: 'Manage your contacts',
      quickAction: () => navigate('/contacts')
    },
    {
      path: '/security',
      label: 'Security Log',
      icon: <SecurityIcon />,
      color: '#f44336',
      description: 'View security activity logs',
      quickAction: () => navigate('/security')
    },
    {
      path: '/sync',
      label: 'Sync Status',
      icon: <SyncIcon />,
      color: '#9c27b0',
      description: 'Check data synchronization status',
      quickAction: () => navigate('/sync')
    },
    {
      path: '/secure-notes',
      label: 'Secure Notes',
      icon: <NoteIcon />,
      color: '#795548',
      description: 'Store encrypted notes',
      quickAction: () => navigate('/secure-notes')
    },
    {
      path: '/offline',
      label: 'Offline Data',
      icon: <StorageIcon />,
      color: '#607d8b',
      description: 'Manage offline data storage',
      quickAction: () => navigate('/offline')
    },
    {
      path: '/analytics',
      label: 'Analytics',
      icon: <AnalyticsIcon />,
      color: '#00bcd4',
      description: 'View usage statistics',
      quickAction: () => navigate('/analytics')
    }
  ];

  const quickActions = [
    { name: 'Add Password', icon: <LockIcon />, action: () => navigate('/passwords') },
    { name: 'Add Contact', icon: <PeopleIcon />, action: () => navigate('/contacts') },
    { name: 'Security Check', icon: <SecurityIcon />, action: () => navigate('/security') },
    { name: 'Sync Data', icon: <SyncIcon />, action: () => navigate('/sync') },
    { name: 'Add Note', icon: <NoteIcon />, action: () => navigate('/secure-notes') },
    { name: 'View Analytics', icon: <AnalyticsIcon />, action: () => navigate('/analytics') }
  ];

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = () => {
    try {
      // Load quick stats
      const passwords = JSON.parse(localStorage.getItem('passwords') || '[]');
      const contacts = JSON.parse(localStorage.getItem('contacts') || '[]');
      const notes = JSON.parse(localStorage.getItem('secureNotes') || '[]');
      const syncService = SyncService.getInstance();
      const securityService = SecurityService.getInstance();

      const weakPasswords = passwords.filter((pwd: any) => {
        const hasUppercase = /[A-Z]/.test(pwd.password);
        const hasLowercase = /[a-z]/.test(pwd.password);
        const hasNumbers = /[0-9]/.test(pwd.password);
        const hasSpecial = /[^A-Za-z0-9]/.test(pwd.password);
        return !(hasUppercase && hasLowercase && hasNumbers && hasSpecial) || pwd.password.length < 12;
      }).length;

      setQuickStats({
        totalPasswords: passwords.length,
        totalContacts: contacts.length,
        totalNotes: notes.length,
        weakPasswords,
        pendingSync: syncService.getPendingChanges(),
        securityScore: calculateSecurityScore(passwords, notes, syncService),
      });

      // Load recent activity
      const activityLogs = JSON.parse(localStorage.getItem('activityLogs') || '[]');
      setRecentActivity(activityLogs.slice(0, 5));

      // Load security alerts
      const securityLogs = securityService.getSecurityLogs();
      const alerts = securityLogs
        .filter((log: any) => log.status === 'failure' || log.type === 'security_event')
        .slice(0, 3);
      setSecurityAlerts(alerts);

      // Load storage stats
      const storageUsed = localStorage.getItem('storageUsed') ? parseFloat(localStorage.getItem('storageUsed')!) : 0;
      const storageTotal = localStorage.getItem('storageTotal') ? parseFloat(localStorage.getItem('storageTotal')!) : 10;
      setStats({
        totalPasswords: passwords.length,
        totalContacts: contacts.length,
        securityScore: calculateSecurityScore(passwords, notes, syncService),
        lastSync: '2 hours ago',
        pendingActions: syncService.getPendingChanges(),
        storageUsed,
        storageTotal,
      });

    } catch (error) {
      showNotification('Error loading dashboard data', 'error');
    }
  };

  const calculateSecurityScore = (passwords: any[], notes: any[], syncService: any) => {
    let score = 0;
    
    // Password strength (40% weight)
    const strongPasswords = passwords.filter((pwd: any) => {
      const hasUppercase = /[A-Z]/.test(pwd.password);
      const hasLowercase = /[a-z]/.test(pwd.password);
      const hasNumbers = /[0-9]/.test(pwd.password);
      const hasSpecial = /[^A-Za-z0-9]/.test(pwd.password);
      return (hasUppercase && hasLowercase && hasNumbers && hasSpecial) && pwd.password.length >= 12;
    }).length;
    
    score += (strongPasswords / Math.max(passwords.length, 1)) * 40;
    
    // Encryption status (30% weight)
    score += localStorage.getItem('encryptionKey') ? 30 : 0;
    
    // Sync status (20% weight)
    score += syncService.isOnline() ? 20 : 0;
    
    // Recent activity (10% weight)
    score += recentActivity.length > 0 ? 10 : 0;
    
    return Math.round(score);
  };

  const handleSearch = () => {
    try {
      const results: SearchResultCategory[] = [];
      const searchTerm = searchQuery.toLowerCase();

      // Search in passwords
      const passwords = JSON.parse(localStorage.getItem('passwords') || '[]');
      const passwordResults = passwords.filter((pwd: any) =>
        pwd.title?.toLowerCase().includes(searchTerm) ||
        pwd.username?.toLowerCase().includes(searchTerm) ||
        pwd.notes?.toLowerCase().includes(searchTerm)
      );
      if (passwordResults.length > 0) {
        results.push({
          type: 'Passwords',
          icon: <LockIcon />,
          items: passwordResults.map((pwd: any) => ({
            title: pwd.title,
            subtitle: pwd.username,
            onClick: () => navigate('/passwords'),
            type: 'password',
            icon: <LockIcon />
          }))
        });
      }

      // Search in contacts
      const contacts = JSON.parse(localStorage.getItem('contacts') || '[]');
      const contactResults = contacts.filter((contact: any) =>
        contact.name?.toLowerCase().includes(searchTerm) ||
        contact.email?.toLowerCase().includes(searchTerm) ||
        contact.phone?.toLowerCase().includes(searchTerm) ||
        contact.company?.toLowerCase().includes(searchTerm)
      );
      if (contactResults.length > 0) {
        results.push({
          type: 'Contacts',
          icon: <PeopleIcon />,
          items: contactResults.map((contact: any) => ({
            title: contact.name,
            subtitle: contact.email,
            onClick: () => navigate('/contacts'),
            type: 'contact',
            icon: <PeopleIcon />
          }))
        });
      }

      // Search in notes
      const notes = JSON.parse(localStorage.getItem('secureNotes') || '[]');
      const noteResults = notes.filter((note: any) =>
        note.title?.toLowerCase().includes(searchTerm) ||
        note.content?.toLowerCase().includes(searchTerm)
      );
      if (noteResults.length > 0) {
        results.push({
          type: 'Notes',
          icon: <NoteIcon />,
          items: noteResults.map((note: any) => ({
            title: note.title,
            subtitle: note.content?.substring(0, 50) + '...',
            onClick: () => navigate('/secure-notes'),
            type: 'note',
            icon: <NoteIcon />
          }))
        });
      }

      setSearchResults(results);
      setSearchDialogOpen(true);
    } catch (error) {
      showNotification('Error performing search', 'error');
    }
  };

  const handleQuickAction = (action: () => void) => {
    action();
  };

  const getSecurityColor = (score: number) => {
    if (score >= 80) return 'success';
    if (score >= 60) return 'warning';
    return 'error';
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'warning': return <WarningIcon />;
      case 'error': return <ErrorIcon />;
      case 'success': return <CheckCircleIcon />;
      default: return <InfoIcon />;
    }
  };

  const storagePercentage = (stats.storageUsed / stats.storageTotal) * 100;

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Dashboard
        </Typography>
        <Chip 
          label={`Security Score: ${stats.securityScore}%`}
          color={getSecurityColor(stats.securityScore) as any}
          icon={<SecurityIcon />}
        />
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ textAlign: 'center', p: 2 }}>
              <LockIcon color="primary" sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h5" component="div">
                {stats.totalPasswords}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Passwords
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ textAlign: 'center', p: 2 }}>
              <PeopleIcon color="primary" sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h5" component="div">
                {stats.totalContacts}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Contacts
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ textAlign: 'center', p: 2 }}>
              <SyncIcon color="primary" sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h5" component="div">
                {stats.pendingActions}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Pending
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ textAlign: 'center', p: 2 }}>
              <StorageIcon color="primary" sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h5" component="div">
                {storagePercentage.toFixed(0)}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Storage
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Main Content Grid */}
      <Grid container spacing={3}>
        {/* Security Alerts */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <SecurityIcon sx={{ mr: 1 }} />
                Security Alerts
              </Typography>
              <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
                {alerts.map((alert) => (
                  <Alert 
                    key={alert.id} 
                    severity={alert.type} 
                    sx={{ mb: 1 }}
                    icon={getAlertIcon(alert.type)}
                  >
                    <Typography variant="body2">
                      {alert.message}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {alert.timestamp}
                    </Typography>
                  </Alert>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Activity */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <TrendingUpIcon sx={{ mr: 1 }} />
                Recent Activity
              </Typography>
              <List dense>
                {recentActivity.map((activity, index) => (
                  <React.Fragment key={activity.id}>
                    <ListItem>
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32 }}>
                          {activity.icon}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={activity.action}
                        secondary={activity.time}
                        primaryTypographyProps={{ variant: 'body2' }}
                        secondaryTypographyProps={{ variant: 'caption' }}
                      />
                    </ListItem>
                    {index < recentActivity.length - 1 && <Divider variant="inset" component="li" />}
                  </React.Fragment>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Storage Usage */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Storage Usage
              </Typography>
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">
                    {stats.storageUsed} GB used of {stats.storageTotal} GB
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {storagePercentage.toFixed(1)}%
                  </Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={storagePercentage} 
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </Box>
              <Button 
                variant="outlined" 
                size="small" 
                onClick={() => navigate('/offline')}
              >
                Manage Storage
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* Quick Actions */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Quick Actions
              </Typography>
              <Grid container spacing={1}>
                {quickActions.map((action, index) => (
                  <Grid item xs={6} sm={4} key={index}>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={action.action}
                      startIcon={action.icon}
                      sx={{ 
                        width: '100%', 
                        height: 56,
                        flexDirection: 'column',
                        textAlign: 'center'
                      }}
                    >
                      <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>
                        {action.name}
                      </Typography>
                    </Button>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Speed Dial for Quick Actions */}
      <SpeedDial
        ariaLabel="Quick actions"
        sx={{
          position: 'fixed',
          bottom: 16,
          right: 16,
        }}
        icon={<SpeedDialIcon />}
      >
        {quickActions.map((action) => (
          <SpeedDialAction
            key={action.name}
            icon={action.icon}
            tooltipTitle={action.name}
            onClick={action.action}
          />
        ))}
      </SpeedDial>

      {/* Search Results Dialog */}
      <Dialog 
        open={searchDialogOpen} 
        onClose={() => setSearchDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Search Results
          <IconButton
            aria-label="close"
            onClick={() => setSearchDialogOpen(false)}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {searchResults.length === 0 ? (
            <Typography>No results found</Typography>
          ) : (
            searchResults.map((category) => (
              <Box key={category.type} sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  {category.icon} {category.type}
                </Typography>
                <List>
                  {category.items.map((item, index) => (
                    <ListItem key={index} button onClick={item.onClick}>
                      <ListItemIcon>{item.icon}</ListItemIcon>
                      <ListItemText
                        primary={item.title}
                        secondary={item.subtitle}
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>
            ))
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default Dashboard; 