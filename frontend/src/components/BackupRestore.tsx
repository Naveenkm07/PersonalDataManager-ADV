import React, { useState } from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
} from '@mui/material';
import { Backup as BackupIcon, Restore as RestoreIcon } from '@mui/icons-material';
import { useNotification } from '../contexts/NotificationContext';
import { passwords, contacts, tasks } from '../services/api';

const BackupRestore: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [isRestore, setIsRestore] = useState(false);
  const { showNotification } = useNotification();

  const handleOpen = (isRestore: boolean) => {
    setIsRestore(isRestore);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleBackup = async () => {
    try {
      const backupData = {
        passwords: await passwords.getAll(),
        contacts: await contacts.getAll(),
        tasks: await tasks.getAll(),
        timestamp: new Date().toISOString(),
      };

      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showNotification('Backup created successfully', 'success');
      handleClose();
    } catch (error) {
      showNotification(error instanceof Error ? error.message : 'Failed to create backup', 'error');
    }
  };

  const handleRestore = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const backupData = JSON.parse(text);

      // Validate backup data
      if (!backupData.passwords || !backupData.contacts || !backupData.tasks) {
        throw new Error('Invalid backup file format');
      }

      // Clear existing data
      localStorage.removeItem('passwords');
      localStorage.removeItem('contacts');
      localStorage.removeItem('tasks');

      // Restore data
      localStorage.setItem('passwords', JSON.stringify(backupData.passwords));
      localStorage.setItem('contacts', JSON.stringify(backupData.contacts));
      localStorage.setItem('tasks', JSON.stringify(backupData.tasks));

      showNotification('Data restored successfully', 'success');
      handleClose();
      window.location.reload(); // Reload to reflect changes
    } catch (error) {
      showNotification(error instanceof Error ? error.message : 'Failed to restore backup', 'error');
    }
  };

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', mt: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5">Backup & Restore</Typography>
      </Box>

      <Paper sx={{ p: 3 }}>
        <Box display="flex" gap={2} flexDirection="column">
          <Button
            variant="contained"
            color="primary"
            startIcon={<BackupIcon />}
            onClick={() => handleOpen(false)}
          >
            Create Backup
          </Button>
          <Button
            variant="contained"
            color="secondary"
            startIcon={<RestoreIcon />}
            onClick={() => handleOpen(true)}
          >
            Restore from Backup
          </Button>
        </Box>
      </Paper>

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          {isRestore ? 'Restore from Backup' : 'Create Backup'}
        </DialogTitle>
        <DialogContent>
          {isRestore ? (
            <Box sx={{ mt: 2 }}>
              <Alert severity="warning" sx={{ mb: 2 }}>
                Warning: This will replace all existing data with the backup data.
              </Alert>
              <input
                type="file"
                accept=".json"
                onChange={handleRestore}
                style={{ display: 'none' }}
                id="restore-file-input"
              />
              <label htmlFor="restore-file-input">
                <Button variant="contained" component="span">
                  Select Backup File
                </Button>
              </label>
            </Box>
          ) : (
            <Box sx={{ mt: 2 }}>
              <Alert severity="info">
                This will create a backup of all your passwords, contacts, and tasks.
              </Alert>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          {!isRestore && (
            <Button onClick={handleBackup} variant="contained" color="primary">
              Download Backup
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default BackupRestore; 