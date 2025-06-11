import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Grid,
  Alert,
  CircularProgress,
  Divider,
} from '@mui/material';
import { useNotification } from '../contexts/NotificationContext';
import OfflineDataService from '../services/OfflineDataService';

const OfflineDataManager: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { showNotification } = useNotification();
  const offlineDataService = OfflineDataService.getInstance();

  const handleExportJSON = async () => {
    try {
      setIsLoading(true);
      // Get all data from localStorage
      const data = {
        contacts: JSON.parse(localStorage.getItem('contacts') || '[]'),
        tasks: JSON.parse(localStorage.getItem('tasks') || '[]'),
        passwords: JSON.parse(localStorage.getItem('passwords') || '[]'),
        secureNotes: JSON.parse(localStorage.getItem('secureNotes') || '[]'),
      };
      await offlineDataService.exportToJSON(data);
      showNotification('Data exported successfully', 'success');
    } catch (error) {
      showNotification('Failed to export data', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      setIsLoading(true);
      // Get all data from localStorage
      const data = {
        contacts: JSON.parse(localStorage.getItem('contacts') || '[]'),
        tasks: JSON.parse(localStorage.getItem('tasks') || '[]'),
        passwords: JSON.parse(localStorage.getItem('passwords') || '[]'),
        secureNotes: JSON.parse(localStorage.getItem('secureNotes') || '[]'),
      };
      await offlineDataService.exportToCSV(Object.values(data).flat());
      showNotification('Data exported successfully', 'success');
    } catch (error) {
      showNotification('Failed to export data', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImportJSON = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsLoading(true);
      const data = await offlineDataService.importFromJSON(file);
      
      // Validate and store data
      if (data.contacts) localStorage.setItem('contacts', JSON.stringify(data.contacts));
      if (data.tasks) localStorage.setItem('tasks', JSON.stringify(data.tasks));
      if (data.passwords) localStorage.setItem('passwords', JSON.stringify(data.passwords));
      if (data.secureNotes) localStorage.setItem('secureNotes', JSON.stringify(data.secureNotes));
      
      showNotification('Data imported successfully', 'success');
    } catch (error) {
      showNotification('Failed to import data', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImportCSV = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsLoading(true);
      const data = await offlineDataService.importFromCSV(file);
      
      // Store imported data
      localStorage.setItem('importedData', JSON.stringify(data));
      showNotification('Data imported successfully', 'success');
    } catch (error) {
      showNotification('Failed to import data', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateBackup = async () => {
    try {
      setIsLoading(true);
      const data = {
        contacts: JSON.parse(localStorage.getItem('contacts') || '[]'),
        tasks: JSON.parse(localStorage.getItem('tasks') || '[]'),
        passwords: JSON.parse(localStorage.getItem('passwords') || '[]'),
        secureNotes: JSON.parse(localStorage.getItem('secureNotes') || '[]'),
      };
      await offlineDataService.createBackup(data);
      showNotification('Backup created successfully', 'success');
    } catch (error) {
      showNotification('Failed to create backup', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestoreBackup = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsLoading(true);
      const data = await offlineDataService.restoreFromBackup(file);
      
      // Validate and store restored data
      if (data.contacts) localStorage.setItem('contacts', JSON.stringify(data.contacts));
      if (data.tasks) localStorage.setItem('tasks', JSON.stringify(data.tasks));
      if (data.passwords) localStorage.setItem('passwords', JSON.stringify(data.passwords));
      if (data.secureNotes) localStorage.setItem('secureNotes', JSON.stringify(data.secureNotes));
      
      showNotification('Backup restored successfully', 'success');
    } catch (error) {
      showNotification('Failed to restore backup', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Offline Data Management
      </Typography>
      
      <Alert severity="info" sx={{ mb: 3 }}>
        Manage your data offline with export/import and backup features.
      </Alert>

      <Grid container spacing={3}>
        {/* Export Section */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Export Data
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Button
                  variant="contained"
                  onClick={handleExportJSON}
                  disabled={isLoading}
                >
                  {isLoading ? <CircularProgress size={24} /> : 'Export as JSON'}
                </Button>
                <Button
                  variant="contained"
                  onClick={handleExportCSV}
                  disabled={isLoading}
                >
                  {isLoading ? <CircularProgress size={24} /> : 'Export as CSV'}
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Import Section */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Import Data
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Button
                  variant="contained"
                  component="label"
                  disabled={isLoading}
                >
                  Import JSON
                  <input
                    type="file"
                    hidden
                    accept=".json"
                    onChange={handleImportJSON}
                  />
                </Button>
                <Button
                  variant="contained"
                  component="label"
                  disabled={isLoading}
                >
                  Import CSV
                  <input
                    type="file"
                    hidden
                    accept=".csv"
                    onChange={handleImportCSV}
                  />
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Backup Section */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Backup & Restore
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Button
                  variant="contained"
                  onClick={handleCreateBackup}
                  disabled={isLoading}
                >
                  {isLoading ? <CircularProgress size={24} /> : 'Create Backup'}
                </Button>
                <Button
                  variant="contained"
                  component="label"
                  disabled={isLoading}
                >
                  Restore Backup
                  <input
                    type="file"
                    hidden
                    accept=".zip"
                    onChange={handleRestoreBackup}
                  />
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default OfflineDataManager; 