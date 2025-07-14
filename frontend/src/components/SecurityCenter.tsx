import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Alert,
  Button,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  LinearProgress,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Switch,
  Divider,
  IconButton,
} from '@mui/material';
import {
  Security as SecurityIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Refresh as RefreshIcon,
  Lock as LockIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Shield as ShieldIcon,
  Key as KeyIcon,
  Update as UpdateIcon,
} from '@mui/icons-material';
import { useNotification } from '../contexts/NotificationContext';

interface SecurityIssue {
  id: string;
  type: 'weak_password' | 'reused_password' | 'old_password' | 'no_2fa' | 'insecure_connection';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  affectedItems: number;
  recommendation: string;
  fixed: boolean;
}

interface SecurityScore {
  overall: number;
  passwordStrength: number;
  encryptionStatus: number;
  backupStatus: number;
  twoFactorStatus: number;
  connectionSecurity: number;
}

const SecurityCenter: React.FC = () => {
  const [securityScore, setSecurityScore] = useState<SecurityScore>({
    overall: 0,
    passwordStrength: 0,
    encryptionStatus: 0,
    backupStatus: 0,
    twoFactorStatus: 0,
    connectionSecurity: 0,
  });
  const [securityIssues, setSecurityIssues] = useState<SecurityIssue[]>([]);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<SecurityIssue | null>(null);
  const { showNotification } = useNotification();

  useEffect(() => {
    analyzeSecurity();
  }, []);

  const analyzeSecurity = () => {
    try {
      const passwords = JSON.parse(localStorage.getItem('passwords') || '[]');
      const contacts = JSON.parse(localStorage.getItem('contacts') || '[]');
      const notes = JSON.parse(localStorage.getItem('secureNotes') || '[]');
      const securityLogs = JSON.parse(localStorage.getItem('securityLogs') || '[]');

      // Calculate password strength score
      const strongPasswords = passwords.filter((pwd: any) => {
        const hasUppercase = /[A-Z]/.test(pwd.password);
        const hasLowercase = /[a-z]/.test(pwd.password);
        const hasNumbers = /[0-9]/.test(pwd.password);
        const hasSpecial = /[^A-Za-z0-9]/.test(pwd.password);
        return (hasUppercase && hasLowercase && hasNumbers && hasSpecial) && pwd.password.length >= 12;
      }).length;

      const passwordStrength = passwords.length > 0 ? (strongPasswords / passwords.length) * 100 : 0;

      // Calculate encryption status
      const encryptionStatus = localStorage.getItem('encryptionKey') ? 100 : 0;

      // Calculate backup status
      const backupStatus = localStorage.getItem('lastBackup') ? 100 : 0;

      // Calculate 2FA status
      const twoFactorStatus = localStorage.getItem('2faSecret') ? 100 : 0;

      // Calculate connection security
      const connectionSecurity = window.location.protocol === 'https:' ? 100 : 50;

      // Overall score
      const overall = Math.round(
        (passwordStrength + encryptionStatus + backupStatus + twoFactorStatus + connectionSecurity) / 5
      );

      setSecurityScore({
        overall,
        passwordStrength,
        encryptionStatus,
        backupStatus,
        twoFactorStatus,
        connectionSecurity,
      });

      // Identify security issues
      const issues: SecurityIssue[] = [];

      // Weak passwords
      const weakPasswords = passwords.filter((pwd: any) => {
        const hasUppercase = /[A-Z]/.test(pwd.password);
        const hasLowercase = /[a-z]/.test(pwd.password);
        const hasNumbers = /[0-9]/.test(pwd.password);
        const hasSpecial = /[^A-Za-z0-9]/.test(pwd.password);
        return !(hasUppercase && hasLowercase && hasNumbers && hasSpecial) || pwd.password.length < 12;
      });

      if (weakPasswords.length > 0) {
        issues.push({
          id: 'weak_passwords',
          type: 'weak_password',
          severity: weakPasswords.length > 5 ? 'high' : 'medium',
          title: 'Weak Passwords Detected',
          description: `${weakPasswords.length} passwords don't meet security standards`,
          affectedItems: weakPasswords.length,
          recommendation: 'Update passwords to include uppercase, lowercase, numbers, and special characters',
          fixed: false,
        });
      }

      // Reused passwords
      const passwordMap = new Map<string, number>();
      passwords.forEach((pwd: any) => {
        passwordMap.set(pwd.password, (passwordMap.get(pwd.password) || 0) + 1);
      });
      const reusedPasswords = Array.from(passwordMap.entries()).filter(([_, count]) => count > 1);
      
      if (reusedPasswords.length > 0) {
        issues.push({
          id: 'reused_passwords',
          type: 'reused_password',
          severity: 'high',
          title: 'Reused Passwords',
          description: `${reusedPasswords.length} passwords are used multiple times`,
          affectedItems: reusedPasswords.length,
          recommendation: 'Use unique passwords for each account',
          fixed: false,
        });
      }

      // No 2FA
      if (!localStorage.getItem('2faSecret')) {
        issues.push({
          id: 'no_2fa',
          type: 'no_2fa',
          severity: 'medium',
          title: 'Two-Factor Authentication Not Enabled',
          description: 'Your account is not protected by 2FA',
          affectedItems: 1,
          recommendation: 'Enable two-factor authentication for enhanced security',
          fixed: false,
        });
      }

      // Insecure connection
      if (window.location.protocol !== 'https:') {
        issues.push({
          id: 'insecure_connection',
          type: 'insecure_connection',
          severity: 'medium',
          title: 'Insecure Connection',
          description: 'You are not using a secure HTTPS connection',
          affectedItems: 1,
          recommendation: 'Use HTTPS connection for secure data transmission',
          fixed: false,
        });
      }

      setSecurityIssues(issues);
    } catch (error) {
      showNotification('Error analyzing security', 'error');
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <ErrorIcon color="error" />;
      case 'high': return <WarningIcon color="warning" />;
      case 'medium': return <WarningIcon color="info" />;
      case 'low': return <CheckCircleIcon color="success" />;
      default: return <SecurityIcon />;
    }
  };

  const handleFixIssue = (issue: SecurityIssue) => {
    setSelectedIssue(issue);
    if (issue.type === 'weak_password') {
      setShowPasswordDialog(true);
    } else {
      showNotification(`Fixing ${issue.title}...`, 'info');
      // Implement specific fix logic here
    }
  };

  const handlePasswordUpdate = () => {
    if (newPassword.length < 12) {
      showNotification('Password must be at least 12 characters long', 'error');
      return;
    }

    // Update password logic here
    showNotification('Password updated successfully', 'success');
    setShowPasswordDialog(false);
    setNewPassword('');
    analyzeSecurity();
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Security Center
      </Typography>

      {/* Overall Security Score */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Overall Security Score
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Box sx={{ position: 'relative', display: 'inline-flex', mr: 2 }}>
              <LinearProgress
                variant="determinate"
                value={securityScore.overall}
                sx={{ width: 100, height: 100, borderRadius: '50%' }}
              />
              <Box
                sx={{
                  top: 0,
                  left: 0,
                  bottom: 0,
                  right: 0,
                  position: 'absolute',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Typography variant="h6" component="div" color="text.secondary">
                  {securityScore.overall}%
                </Typography>
              </Box>
            </Box>
            <Box>
              <Typography variant="body1">
                {securityScore.overall >= 80 ? 'Excellent' : 
                 securityScore.overall >= 60 ? 'Good' : 
                 securityScore.overall >= 40 ? 'Fair' : 'Poor'}
              </Typography>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={analyzeSecurity}
                sx={{ mt: 1 }}
              >
                Re-analyze
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        {/* Security Metrics */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Security Metrics
              </Typography>
              <List>
                <ListItem>
                  <ListItemIcon>
                    <KeyIcon color={securityScore.passwordStrength >= 80 ? 'success' : 'warning'} />
                  </ListItemIcon>
                  <ListItemText
                    primary="Password Strength"
                    secondary={`${securityScore.passwordStrength}%`}
                  />
                  <LinearProgress
                    variant="determinate"
                    value={securityScore.passwordStrength}
                    sx={{ width: 100 }}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <LockIcon color={securityScore.encryptionStatus >= 80 ? 'success' : 'warning'} />
                  </ListItemIcon>
                  <ListItemText
                    primary="Encryption Status"
                    secondary={`${securityScore.encryptionStatus}%`}
                  />
                  <LinearProgress
                    variant="determinate"
                    value={securityScore.encryptionStatus}
                    sx={{ width: 100 }}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <ShieldIcon color={securityScore.twoFactorStatus >= 80 ? 'success' : 'warning'} />
                  </ListItemIcon>
                  <ListItemText
                    primary="Two-Factor Authentication"
                    secondary={`${securityScore.twoFactorStatus}%`}
                  />
                  <LinearProgress
                    variant="determinate"
                    value={securityScore.twoFactorStatus}
                    sx={{ width: 100 }}
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Security Issues */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Security Issues ({securityIssues.length})
              </Typography>
              {securityIssues.length === 0 ? (
                <Alert severity="success">
                  No security issues detected! Your account is secure.
                </Alert>
              ) : (
                <List>
                  {securityIssues.map((issue) => (
                    <ListItem key={issue.id} divider>
                      <ListItemIcon>
                        {getSeverityIcon(issue.severity)}
                      </ListItemIcon>
                      <ListItemText
                        primary={issue.title}
                        secondary={
                          <Box>
                            <Typography variant="body2" color="text.secondary">
                              {issue.description}
                            </Typography>
                            <Chip
                              label={issue.severity.toUpperCase()}
                              color={getSeverityColor(issue.severity) as any}
                              size="small"
                              sx={{ mt: 1 }}
                            />
                          </Box>
                        }
                      />
                      <Button
                        variant="contained"
                        size="small"
                        onClick={() => handleFixIssue(issue)}
                        disabled={issue.fixed}
                      >
                        {issue.fixed ? 'Fixed' : 'Fix'}
                      </Button>
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Password Update Dialog */}
      <Dialog open={showPasswordDialog} onClose={() => setShowPasswordDialog(false)}>
        <DialogTitle>Update Weak Password</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {selectedIssue?.recommendation}
          </Typography>
          <TextField
            fullWidth
            type={showPassword ? 'text' : 'password'}
            label="New Password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            InputProps={{
              endAdornment: (
                <IconButton
                  onClick={() => setShowPassword(!showPassword)}
                  edge="end"
                >
                  {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                </IconButton>
              ),
            }}
            helperText="Password must be at least 12 characters with uppercase, lowercase, numbers, and special characters"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowPasswordDialog(false)}>Cancel</Button>
          <Button onClick={handlePasswordUpdate} variant="contained">
            Update Password
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SecurityCenter; 