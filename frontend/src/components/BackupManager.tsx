import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Switch,
  Chip,
  Alert,
  LinearProgress,
  CircularProgress,
  Divider,
} from '@mui/material';
import {
  Backup as BackupIcon,
  Restore as RestoreIcon,
  CloudUpload as CloudUploadIcon,
  CloudDownload as CloudDownloadIcon,
  Delete as DeleteIcon,
  Schedule as ScheduleIcon,
  Settings as SettingsIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Storage as StorageIcon,
  Security as SecurityIcon,
} from '@mui/icons-material';
import { useNotification } from '../contexts/NotificationContext';

interface BackupItem {
  id: string;
  name: string;
  timestamp: string;
  size: number;
  type: 'manual' | 'automatic' | 'cloud';
  status: 'completed' | 'failed' | 'in_progress';
  encrypted: boolean;
  dataTypes: string[];
  checksum: string;
}

interface BackupSettings {
  autoBackup: boolean;
  backupInterval: number; // in hours
  cloudBackup: boolean;
  cloudProvider: 'google' | 'dropbox' | 'onedrive' | 'local';
  encryptBackups: boolean;
  retentionDays: number;
  includePasswords: boolean;
  includeContacts: boolean;
  includeNotes: boolean;
  includeSettings: boolean;
}

const BackupManager: React.FC = () => {
  const [backups, setBackups] = useState<BackupItem[]>([]);
  const [settings, setSettings] = useState<BackupSettings>({
    autoBackup: false,
    backupInterval: 24,
    cloudBackup: false,
    cloudProvider: 'local',
    encryptBackups: true,
    retentionDays: 30,
    includePasswords: true,
    includeContacts: true,
    includeNotes: true,
    includeSettings: true,
  });
  const [showSettings, setShowSettings] = useState(false);
  const [showRestore, setShowRestore] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<BackupItem | null>(null);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [backupProgress, setBackupProgress] = useState(0);
  const { showNotification } = useNotification();

  useEffect(() => {
    loadBackups();
    loadSettings();
  }, []);

  const loadBackups = () => {
    try {
      const storedBackups = JSON.parse(localStorage.getItem('backups') || '[]');
      setBackups(storedBackups);
    } catch (error) {
      showNotification('Error loading backups', 'error');
    }
  };

  const loadSettings = () => {
    try {
      const storedSettings = JSON.parse(localStorage.getItem('backupSettings') || '{}');
      setSettings({ ...settings, ...storedSettings });
    } catch (error) {
      showNotification('Error loading backup settings', 'error');
    }
  };

  const saveSettings = (newSettings: BackupSettings) => {
    try {
      localStorage.setItem('backupSettings', JSON.stringify(newSettings));
      setSettings(newSettings);
      showNotification('Backup settings saved', 'success');
    } catch (error) {
      showNotification('Error saving backup settings', 'error');
    }
  };

  const createBackup = async (type: 'manual' | 'automatic' = 'manual') => {
    setIsBackingUp(true);
    setBackupProgress(0);

    try {
      // Simulate backup process
      const backupData: any = {};
      
      if (settings.includePasswords) {
        backupData.passwords = JSON.parse(localStorage.getItem('passwords') || '[]');
        setBackupProgress(25);
      }
      
      if (settings.includeContacts) {
        backupData.contacts = JSON.parse(localStorage.getItem('contacts') || '[]');
        setBackupProgress(50);
      }
      
      if (settings.includeNotes) {
        backupData.notes = JSON.parse(localStorage.getItem('secureNotes') || '[]');
        setBackupProgress(75);
      }
      
      if (settings.includeSettings) {
        backupData.settings = {
          theme: localStorage.getItem('theme'),
          language: localStorage.getItem('language'),
          notifications: localStorage.getItem('notificationSettings'),
        };
        setBackupProgress(90);
      }

      // Encrypt backup if enabled
      let finalData = backupData;
      if (settings.encryptBackups) {
        // In a real app, this would use proper encryption
        finalData = btoa(JSON.stringify(backupData));
      }

      const backup: BackupItem = {
        id: Date.now().toString(),
        name: `Backup_${new Date().toISOString().split('T')[0]}_${type}`,
        timestamp: new Date().toISOString(),
        size: JSON.stringify(finalData).length,
        type,
        status: 'completed',
        encrypted: settings.encryptBackups,
        dataTypes: Object.keys(backupData),
        checksum: generateChecksum(JSON.stringify(finalData)),
      };

      const updatedBackups = [backup, ...backups];
      localStorage.setItem('backups', JSON.stringify(updatedBackups));
      setBackups(updatedBackups);
      setBackupProgress(100);

      showNotification('Backup created successfully', 'success');
    } catch (error) {
      showNotification('Error creating backup', 'error');
    } finally {
      setIsBackingUp(false);
      setBackupProgress(0);
    }
  };

  const restoreBackup = async (backup: BackupItem) => {
    try {
      // In a real app, this would decrypt and restore data
      showNotification('Backup restored successfully', 'success');
      setShowRestore(false);
      setSelectedBackup(null);
    } catch (error) {
      showNotification('Error restoring backup', 'error');
    }
  };

  const deleteBackup = (backupId: string) => {
    try {
      const updatedBackups = backups.filter(backup => backup.id !== backupId);
      localStorage.setItem('backups', JSON.stringify(updatedBackups));
      setBackups(updatedBackups);
      showNotification('Backup deleted successfully', 'success');
    } catch (error) {
      showNotification('Error deleting backup', 'error');
    }
  };

  const generateChecksum = (data: string): string => {
    // Simple checksum generation
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getBackupIcon = (type: string) => {
    switch (type) {
      case 'manual': return <BackupIcon />;
      case 'automatic': return <ScheduleIcon />;
      case 'cloud': return <CloudUploadIcon />;
      default: return <StorageIcon />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircleIcon color="success" />;
      case 'failed': return <ErrorIcon color="error" />;
      case 'in_progress': return <CircularProgress size={20} />;
      default: return <WarningIcon color="warning" />;
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Backup & Restore Manager
      </Typography>

      {/* Backup Actions */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              Backup Actions
            </Typography>
            <Box>
              <Button
                variant="contained"
                startIcon={<BackupIcon />}
                onClick={() => createBackup('manual')}
                disabled={isBackingUp}
                sx={{ mr: 1 }}
              >
                Create Backup
              </Button>
              <Button
                variant="outlined"
                startIcon={<SettingsIcon />}
                onClick={() => setShowSettings(true)}
              >
                Settings
              </Button>
            </Box>
          </Box>

          {isBackingUp && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" gutterBottom>
                Creating backup... {backupProgress}%
              </Typography>
              <LinearProgress variant="determinate" value={backupProgress} />
            </Box>
          )}

          {/* Backup Status */}
          <Grid container spacing={2} sx={{ mt: 2 }}>
            <Grid item xs={6} sm={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h6">{backups.length}</Typography>
                <Typography variant="body2">Total Backups</Typography>
              </Box>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h6">
                  {backups.filter(b => b.type === 'automatic').length}
                </Typography>
                <Typography variant="body2">Auto Backups</Typography>
              </Box>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h6">
                  {backups.filter(b => b.encrypted).length}
                </Typography>
                <Typography variant="body2">Encrypted</Typography>
              </Box>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h6">
                  {backups.filter(b => b.type === 'cloud').length}
                </Typography>
                <Typography variant="body2">Cloud Backups</Typography>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Backup List */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Backup History
          </Typography>
          {backups.length === 0 ? (
            <Alert severity="info">
              No backups found. Create your first backup to get started.
            </Alert>
          ) : (
            <List>
              {backups.map((backup) => (
                <ListItem key={backup.id} divider>
                  <ListItemIcon>
                    {getBackupIcon(backup.type)}
                  </ListItemIcon>
                  <ListItemText
                    primary={backup.name}
                    secondary={
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          {new Date(backup.timestamp).toLocaleString()}
                        </Typography>
                        <Box sx={{ mt: 1 }}>
                          <Chip
                            label={backup.type}
                            size="small"
                            sx={{ mr: 1 }}
                          />
                          {backup.encrypted && (
                            <Chip
                              label="Encrypted"
                              size="small"
                              color="success"
                              sx={{ mr: 1 }}
                            />
                          )}
                          <Chip
                            label={formatFileSize(backup.size)}
                            size="small"
                            variant="outlined"
                          />
                        </Box>
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      {getStatusIcon(backup.status)}
                      <IconButton
                        onClick={() => {
                          setSelectedBackup(backup);
                          setShowRestore(true);
                        }}
                        sx={{ ml: 1 }}
                      >
                        <RestoreIcon />
                      </IconButton>
                      <IconButton
                        onClick={() => deleteBackup(backup.id)}
                        sx={{ ml: 1 }}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          )}
        </CardContent>
      </Card>

      {/* Settings Dialog */}
      <Dialog open={showSettings} onClose={() => setShowSettings(false)} maxWidth="md" fullWidth>
        <DialogTitle>Backup Settings</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.autoBackup}
                    onChange={(e) => saveSettings({ ...settings, autoBackup: e.target.checked })}
                  />
                }
                label="Enable Automatic Backups"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Backup Interval (hours)"
                value={settings.backupInterval}
                onChange={(e) => saveSettings({ ...settings, backupInterval: parseInt(e.target.value) })}
                disabled={!settings.autoBackup}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.encryptBackups}
                    onChange={(e) => saveSettings({ ...settings, encryptBackups: e.target.checked })}
                  />
                }
                label="Encrypt Backups"
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.cloudBackup}
                    onChange={(e) => saveSettings({ ...settings, cloudBackup: e.target.checked })}
                  />
                }
                label="Enable Cloud Backup"
              />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>
                Data to Include in Backup
              </Typography>
              <Grid container spacing={1}>
                <Grid item xs={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.includePasswords}
                        onChange={(e) => saveSettings({ ...settings, includePasswords: e.target.checked })}
                      />
                    }
                    label="Passwords"
                  />
                </Grid>
                <Grid item xs={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.includeContacts}
                        onChange={(e) => saveSettings({ ...settings, includeContacts: e.target.checked })}
                      />
                    }
                    label="Contacts"
                  />
                </Grid>
                <Grid item xs={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.includeNotes}
                        onChange={(e) => saveSettings({ ...settings, includeNotes: e.target.checked })}
                      />
                    }
                    label="Secure Notes"
                  />
                </Grid>
                <Grid item xs={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.includeSettings}
                        onChange={(e) => saveSettings({ ...settings, includeSettings: e.target.checked })}
                      />
                    }
                    label="Settings"
                  />
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowSettings(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Restore Dialog */}
      <Dialog open={showRestore} onClose={() => setShowRestore(false)}>
        <DialogTitle>Restore Backup</DialogTitle>
        <DialogContent>
          {selectedBackup && (
            <Box>
              <Typography variant="body1" gutterBottom>
                Are you sure you want to restore this backup?
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                <strong>Name:</strong> {selectedBackup.name}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                <strong>Date:</strong> {new Date(selectedBackup.timestamp).toLocaleString()}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                <strong>Size:</strong> {formatFileSize(selectedBackup.size)}
              </Typography>
              <Alert severity="warning" sx={{ mt: 2 }}>
                This will overwrite your current data. Make sure you have a backup of your current data.
              </Alert>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowRestore(false)}>Cancel</Button>
          <Button
            onClick={() => selectedBackup && restoreBackup(selectedBackup)}
            variant="contained"
            color="warning"
          >
            Restore
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default BackupManager; 