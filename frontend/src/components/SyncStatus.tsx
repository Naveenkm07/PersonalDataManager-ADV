import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  CircularProgress,
  Button,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Divider,
} from '@mui/material';
import {
  Sync as SyncIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useNotification } from '../contexts/NotificationContext';

interface SyncEvent {
  id: string;
  timestamp: string;
  type: 'success' | 'error' | 'warning';
  details: string;
  dataType: string;
}

const SyncStatus: React.FC = () => {
  const [syncEvents, setSyncEvents] = useState<SyncEvent[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const { showNotification } = useNotification();

  useEffect(() => {
    loadSyncHistory();
  }, []);

  const loadSyncHistory = () => {
    const history = JSON.parse(localStorage.getItem('syncHistory') || '[]');
    setSyncEvents(history);
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      // Simulate sync process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const newEvent: SyncEvent = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        type: 'success',
        details: 'Data synchronized successfully',
        dataType: 'all'
      };

      const updatedHistory = [newEvent, ...syncEvents];
      localStorage.setItem('syncHistory', JSON.stringify(updatedHistory));
      setSyncEvents(updatedHistory);
      showNotification('Data synchronized successfully', 'success');
    } catch (error) {
      showNotification('Sync failed', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const getStatusColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'success';
      case 'error':
        return 'error';
      case 'warning':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircleIcon color="success" />;
      case 'error':
        return <ErrorIcon color="error" />;
      case 'warning':
        return <WarningIcon color="warning" />;
      default:
        return null;
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Sync Status
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card>
            <CardHeader
              title="Sync Controls"
              action={
                <Button
                  variant="contained"
                  startIcon={isSyncing ? <CircularProgress size={20} /> : <RefreshIcon />}
                  onClick={handleSync}
                  disabled={isSyncing}
                >
                  {isSyncing ? 'Syncing...' : 'Sync Now'}
                </Button>
              }
            />
            <CardContent>
              <Typography variant="body2" color="text.secondary">
                Last sync: {syncEvents[0]?.timestamp ? new Date(syncEvents[0].timestamp).toLocaleString() : 'Never'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardHeader title="Sync History" />
            <CardContent>
              <List>
                {syncEvents.map((event) => (
                  <React.Fragment key={event.id}>
                    <ListItem>
                      <ListItemIcon>
                        {getStatusIcon(event.type)}
                      </ListItemIcon>
                      <ListItemText
                        primary={event.details}
                        secondary={new Date(event.timestamp).toLocaleString()}
                      />
                      <Chip
                        label={event.type}
                        color={getStatusColor(event.type)}
                        size="small"
                      />
                    </ListItem>
                    <Divider />
                  </React.Fragment>
                ))}
                {syncEvents.length === 0 && (
                  <ListItem>
                    <ListItemText
                      primary="No sync history"
                      secondary="Sync history will appear here"
                    />
                  </ListItem>
                )}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default SyncStatus; 