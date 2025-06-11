import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useNotification } from '../contexts/NotificationContext';

interface OfflineData {
  id: string;
  type: 'password' | 'contact' | 'note';
  timestamp: string;
  data: any;
}

const OfflineData: React.FC = () => {
  const [offlineData, setOfflineData] = useState<OfflineData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { showNotification } = useNotification();

  useEffect(() => {
    loadOfflineData();
  }, []);

  const loadOfflineData = () => {
    try {
      const passwords = JSON.parse(localStorage.getItem('passwords') || '[]');
      const contacts = JSON.parse(localStorage.getItem('contacts') || '[]');
      const notes = JSON.parse(localStorage.getItem('secureNotes') || '[]');

      const data: OfflineData[] = [
        ...passwords.map((pwd: any) => ({
          id: pwd.id,
          type: 'password',
          timestamp: new Date().toISOString(),
          data: pwd,
        })),
        ...contacts.map((contact: any) => ({
          id: contact.id,
          type: 'contact',
          timestamp: new Date().toISOString(),
          data: contact,
        })),
        ...notes.map((note: any) => ({
          id: note.id,
          type: 'note',
          timestamp: new Date().toISOString(),
          data: note,
        })),
      ];

      setOfflineData(data);
    } catch (error) {
      showNotification('Error loading offline data', 'error');
    }
  };

  const handleExport = () => {
    try {
      setIsLoading(true);
      const data = {
        passwords: JSON.parse(localStorage.getItem('passwords') || '[]'),
        contacts: JSON.parse(localStorage.getItem('contacts') || '[]'),
        notes: JSON.parse(localStorage.getItem('secureNotes') || '[]'),
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `offline_data_${new Date().toISOString()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showNotification('Data exported successfully', 'success');
    } catch (error) {
      showNotification('Error exporting data', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) return;

    try {
      setIsLoading(true);
      const text = await selectedFile.text();
      const data = JSON.parse(text);

      if (data.passwords) {
        localStorage.setItem('passwords', JSON.stringify(data.passwords));
      }
      if (data.contacts) {
        localStorage.setItem('contacts', JSON.stringify(data.contacts));
      }
      if (data.notes) {
        localStorage.setItem('secureNotes', JSON.stringify(data.notes));
      }

      loadOfflineData();
      showNotification('Data imported successfully', 'success');
      handleClose();
    } catch (error) {
      showNotification('Error importing data', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setSelectedFile(null);
  };

  const handleDelete = (id: string, type: string) => {
    try {
      const storageKey = `${type}s`;
      const items = JSON.parse(localStorage.getItem(storageKey) || '[]');
      const updatedItems = items.filter((item: any) => item.id !== id);
      localStorage.setItem(storageKey, JSON.stringify(updatedItems));
      loadOfflineData();
      showNotification('Item deleted successfully', 'success');
    } catch (error) {
      showNotification('Error deleting item', 'error');
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'password':
        return 'Password';
      case 'contact':
        return 'Contact';
      case 'note':
        return 'Secure Note';
      default:
        return type;
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Offline Data
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        Manage your offline data. Export for backup or import from a previous backup.
      </Alert>

      <Box sx={{ mb: 3 }}>
        <Button
          variant="contained"
          startIcon={<DownloadIcon />}
          onClick={handleExport}
          disabled={isLoading}
          sx={{ mr: 2 }}
        >
          {isLoading ? <CircularProgress size={24} /> : 'Export Data'}
        </Button>
        <Button
          variant="contained"
          startIcon={<UploadIcon />}
          onClick={handleOpen}
          disabled={isLoading}
          sx={{ mr: 2 }}
        >
          Import Data
        </Button>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={loadOfflineData}
          disabled={isLoading}
        >
          Refresh
        </Button>
      </Box>

      <Card>
        <CardContent>
          <List>
            {offlineData.map((item) => (
              <ListItem key={item.id}>
                <ListItemText
                  primary={getTypeLabel(item.type)}
                  secondary={
                    <>
                      <Typography component="span" variant="body2">
                        ID: {item.id}
                      </Typography>
                      <br />
                      <Typography component="span" variant="body2">
                        Last Updated: {new Date(item.timestamp).toLocaleString()}
                      </Typography>
                    </>
                  }
                />
                <ListItemSecondaryAction>
                  <IconButton
                    edge="end"
                    onClick={() => handleDelete(item.id, item.type)}
                  >
                    <DeleteIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        </CardContent>
      </Card>

      <Dialog open={open} onClose={handleClose}>
        <DialogTitle>Import Data</DialogTitle>
        <DialogContent>
          <input
            type="file"
            accept=".json"
            onChange={handleFileSelect}
            style={{ marginTop: '1rem' }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button
            onClick={handleImport}
            variant="contained"
            disabled={!selectedFile || isLoading}
          >
            {isLoading ? <CircularProgress size={24} /> : 'Import'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default OfflineData; 