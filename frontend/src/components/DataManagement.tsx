import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Chip,
  Alert,
  Snackbar,
  CircularProgress,
} from '@mui/material';
import {
  Backup as BackupIcon,
  Restore as RestoreIcon,
  FileDownload as ExportIcon,
  FileUpload as ImportIcon,
  Security as SecurityIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useNotification } from '../contexts/NotificationContext';
import CryptoJS from 'crypto-js';

interface Backup {
  id: string;
  timestamp: string;
  size: number;
  type: 'auto' | 'manual';
  encrypted: boolean;
}

interface DataManagementProps {
  onDataChange: (data: any) => void;
}

const DataManagement: React.FC<DataManagementProps> = ({ onDataChange }) => {
  const [backups, setBackups] = useState<Backup[]>([]);
  const [encryptionKey, setEncryptionKey] = useState('');
  const [isEncrypted, setIsEncrypted] = useState(false);
  const [backupDialogOpen, setBackupDialogOpen] = useState(false);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<Backup | null>(null);
  const [loading, setLoading] = useState(false);
  const { showNotification } = useNotification();

  // Load backups from localStorage
  useEffect(() => {
    const storedBackups = localStorage.getItem('backups');
    if (storedBackups) {
      setBackups(JSON.parse(storedBackups));
    }
  }, []);

  // Save backups to localStorage
  const saveBackups = (newBackups: Backup[]) => {
    localStorage.setItem('backups', JSON.stringify(newBackups));
    setBackups(newBackups);
  };

  // Create a new backup
  const createBackup = async (type: 'auto' | 'manual' = 'manual') => {
    try {
      setLoading(true);
      const data = {
        tasks: JSON.parse(localStorage.getItem('tasks') || '[]'),
        contacts: JSON.parse(localStorage.getItem('contacts') || '[]'),
        settings: JSON.parse(localStorage.getItem('settings') || '{}'),
      };

      let backupData = JSON.stringify(data);
      if (isEncrypted && encryptionKey) {
        backupData = CryptoJS.AES.encrypt(backupData, encryptionKey).toString();
      }

      const backup: Backup = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        size: backupData.length,
        type,
        encrypted: isEncrypted,
      };

      // Store backup in localStorage
      const newBackups = [...backups, backup];
      saveBackups(newBackups);
      localStorage.setItem(`backup_${backup.id}`, backupData);

      showNotification('Backup created successfully', 'success');
    } catch (error) {
      showNotification('Failed to create backup', 'error');
    } finally {
      setLoading(false);
      setBackupDialogOpen(false);
    }
  };

  // Restore from backup
  const restoreBackup = async (backupId: string) => {
    try {
      setLoading(true);
      const backupData = localStorage.getItem(`backup_${backupId}`);
      if (!backupData) {
        throw new Error('Backup not found');
      }

      let data;
      if (isEncrypted && encryptionKey) {
        const decrypted = CryptoJS.AES.decrypt(backupData, encryptionKey);
        data = JSON.parse(decrypted.toString(CryptoJS.enc.Utf8));
      } else {
        data = JSON.parse(backupData);
      }

      // Restore data to localStorage
      localStorage.setItem('tasks', JSON.stringify(data.tasks));
      localStorage.setItem('contacts', JSON.stringify(data.contacts));
      localStorage.setItem('settings', JSON.stringify(data.settings));

      onDataChange(data);
      showNotification('Backup restored successfully', 'success');
    } catch (error) {
      showNotification('Failed to restore backup', 'error');
    } finally {
      setLoading(false);
      setRestoreDialogOpen(false);
    }
  };

  // Export data in different formats
  const exportData = (format: 'json' | 'csv' | 'txt') => {
    try {
      const data = {
        tasks: JSON.parse(localStorage.getItem('tasks') || '[]'),
        contacts: JSON.parse(localStorage.getItem('contacts') || '[]'),
        settings: JSON.parse(localStorage.getItem('settings') || '{}'),
      };

      let content: string;
      let mimeType: string;
      let extension: string;

      switch (format) {
        case 'json':
          content = JSON.stringify(data, null, 2);
          mimeType = 'application/json';
          extension = 'json';
          break;
        case 'csv':
          content = convertToCSV(data);
          mimeType = 'text/csv';
          extension = 'csv';
          break;
        case 'txt':
          content = JSON.stringify(data, null, 2);
          mimeType = 'text/plain';
          extension = 'txt';
          break;
        default:
          throw new Error('Unsupported format');
      }

      if (isEncrypted && encryptionKey) {
        content = CryptoJS.AES.encrypt(content, encryptionKey).toString();
      }

      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `backup_${new Date().toISOString()}.${extension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showNotification('Data exported successfully', 'success');
    } catch (error) {
      showNotification('Failed to export data', 'error');
    }
  };

  // Convert data to CSV format
  const convertToCSV = (data: any): string => {
    const tasks = data.tasks.map((task: any) => ({
      type: 'task',
      ...task,
    }));
    const contacts = data.contacts.map((contact: any) => ({
      type: 'contact',
      ...contact,
    }));

    const allItems = [...tasks, ...contacts];
    const headers = Object.keys(allItems[0]).join(',');
    const rows = allItems.map((item: any) => Object.values(item).join(','));
    return [headers, ...rows].join('\n');
  };

  // Delete backup
  const deleteBackup = (backupId: string) => {
    try {
      localStorage.removeItem(`backup_${backupId}`);
      const newBackups = backups.filter((backup) => backup.id !== backupId);
      saveBackups(newBackups);
      showNotification('Backup deleted successfully', 'success');
    } catch (error) {
      showNotification('Failed to delete backup', 'error');
    }
  };

  // Toggle encryption
  const toggleEncryption = () => {
    if (!isEncrypted && !encryptionKey) {
      showNotification('Please set an encryption key first', 'warning');
      return;
    }
    setIsEncrypted(!isEncrypted);
    showNotification(
      `Data ${isEncrypted ? 'decrypted' : 'encrypted'} successfully`,
      'success'
    );
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">Data Management</Typography>
        <Box>
          <Button
            variant="contained"
            color="primary"
            startIcon={<BackupIcon />}
            onClick={() => setBackupDialogOpen(true)}
            sx={{ mr: 1 }}
          >
            Create Backup
          </Button>
          <Button
            variant="outlined"
            startIcon={<SecurityIcon />}
            onClick={toggleEncryption}
            sx={{ mr: 1 }}
          >
            {isEncrypted ? 'Disable Encryption' : 'Enable Encryption'}
          </Button>
        </Box>
      </Box>

      {isEncrypted && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <TextField
            fullWidth
            label="Encryption Key"
            type="password"
            value={encryptionKey}
            onChange={(e) => setEncryptionKey(e.target.value)}
            helperText="Enter a secure encryption key"
          />
        </Paper>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Backups
            </Typography>
            <List>
              {backups.map((backup) => (
                <ListItem
                  key={backup.id}
                  sx={{
                    bgcolor: 'background.paper',
                    mb: 1,
                    borderRadius: 1,
                    '&:hover': {
                      bgcolor: 'action.hover',
                    },
                  }}
                >
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Typography variant="subtitle1">
                          {new Date(backup.timestamp).toLocaleString()}
                        </Typography>
                        <Chip
                          label={backup.type}
                          size="small"
                          sx={{ ml: 1 }}
                        />
                        {backup.encrypted && (
                          <Chip
                            label="Encrypted"
                            size="small"
                            color="primary"
                            sx={{ ml: 1 }}
                          />
                        )}
                      </Box>
                    }
                    secondary={`Size: ${(backup.size / 1024).toFixed(2)} KB`}
                  />
                  <ListItemSecondaryAction>
                    <IconButton
                      edge="end"
                      aria-label="restore"
                      onClick={() => {
                        setSelectedBackup(backup);
                        setRestoreDialogOpen(true);
                      }}
                      sx={{ mr: 1 }}
                    >
                      <RestoreIcon />
                    </IconButton>
                    <IconButton
                      edge="end"
                      aria-label="delete"
                      onClick={() => deleteBackup(backup.id)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Export Data
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Button
                variant="outlined"
                startIcon={<ExportIcon />}
                onClick={() => exportData('json')}
              >
                Export as JSON
              </Button>
              <Button
                variant="outlined"
                startIcon={<ExportIcon />}
                onClick={() => exportData('csv')}
              >
                Export as CSV
              </Button>
              <Button
                variant="outlined"
                startIcon={<ExportIcon />}
                onClick={() => exportData('txt')}
              >
                Export as TXT
              </Button>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Backup Dialog */}
      <Dialog open={backupDialogOpen} onClose={() => setBackupDialogOpen(false)}>
        <DialogTitle>Create Backup</DialogTitle>
        <DialogContent>
          <Typography>
            This will create a backup of all your data.
            {isEncrypted && ' The backup will be encrypted.'}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBackupDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={() => createBackup()}
            variant="contained"
            color="primary"
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Create Backup'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Restore Dialog */}
      <Dialog open={restoreDialogOpen} onClose={() => setRestoreDialogOpen(false)}>
        <DialogTitle>Restore Backup</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to restore this backup? This will overwrite your current data.
            {isEncrypted && ' The backup is encrypted.'}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRestoreDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={() => selectedBackup && restoreBackup(selectedBackup.id)}
            variant="contained"
            color="primary"
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Restore'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={loading}
        message="Processing..."
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
};

export default DataManagement; 