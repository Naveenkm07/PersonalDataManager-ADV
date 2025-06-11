import React, { useState } from 'react';
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
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';

interface SearchResultItem {
  title: string;
  subtitle: string;
  onClick: () => void;
}

interface SearchResultCategory {
  type: string;
  icon: React.ReactNode;
  items: SearchResultItem[];
}

const Dashboard: React.FC = () => {
  const { user, isLoading } = useAuth();
  const { showNotification } = useNotification();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResultCategory[]>([]);
  const [searchDialogOpen, setSearchDialogOpen] = useState(false);
  
  const navItems = [
    { 
      path: '/passwords',
      label: 'Passwords', 
      icon: <LockIcon />,
      color: '#2196f3',
      description: 'Manage your passwords securely'
    },
    { 
      path: '/contacts',
      label: 'Contacts', 
      icon: <PeopleIcon />,
      color: '#4caf50',
      description: 'Manage your contacts'
    },
    {
      path: '/security',
      label: 'Security Log',
      icon: <SecurityIcon />,
      color: '#f44336',
      description: 'View security activity logs'
    },
    {
      path: '/sync',
      label: 'Sync Status',
      icon: <SyncIcon />,
      color: '#9c27b0',
      description: 'Check data synchronization status'
    },
    {
      path: '/secure-notes',
      label: 'Secure Notes',
      icon: <NoteIcon />,
      color: '#795548',
      description: 'Store encrypted notes'
    },
    {
      path: '/offline',
      label: 'Offline Data',
      icon: <StorageIcon />,
      color: '#607d8b',
      description: 'Manage offline data storage'
    },
    {
      path: '/analytics',
      label: 'Analytics',
      icon: <AnalyticsIcon />,
      color: '#00bcd4',
      description: 'View usage statistics'
    }
  ];

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
            onClick: () => navigate('/passwords')
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
            onClick: () => navigate('/contacts')
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
            onClick: () => navigate('/secure-notes')
          }))
        });
      }

      setSearchResults(results);
      setSearchDialogOpen(true);
    } catch (error) {
      showNotification('Error performing search', 'error');
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Welcome{user ? `, ${user.username}` : ''} to NHCE Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary" gutterBottom>
          Manage your digital life securely with our comprehensive suite of tools.
        </Typography>
        <Box sx={{ mt: 2 }}>
          <TextField
            fullWidth
            placeholder="Search across all data..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleSearch();
              }
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
              endAdornment: searchQuery && (
                <InputAdornment position="end">
                  <IconButton
                    size="small"
                    onClick={() => setSearchQuery('')}
                  >
                    <CloseIcon />
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          <Button
            variant="contained"
            onClick={handleSearch}
            sx={{ mt: 1 }}
            disabled={!searchQuery.trim()}
          >
            Search
          </Button>
        </Box>
      </Paper>
      
      <Grid container spacing={3}>
        {navItems.map((item) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={item.path}>
            <Card 
              component={Link} 
              to={item.path}
              sx={{ 
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                textDecoration: 'none',
                transition: 'all 0.3s ease-in-out',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 6,
                  '& .MuiTypography-root': {
                    color: item.color,
                  },
                },
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Box 
                    sx={{ 
                      backgroundColor: item.color,
                      borderRadius: '50%',
                      p: 1.5,
                      mr: 2,
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'transform 0.3s ease-in-out',
                      '&:hover': {
                        transform: 'scale(1.1)',
                      },
                    }}
                  >
                    {item.icon}
                  </Box>
                  <Typography 
                    variant="h6" 
                    component="h2"
                    sx={{
                      transition: 'color 0.3s ease-in-out',
                    }}
                  >
                    {item.label}
                  </Typography>
                </Box>
                <Typography 
                  variant="body2" 
                  color="text.secondary"
                  sx={{
                    transition: 'color 0.3s ease-in-out',
                  }}
                >
                  {item.description}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

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
                <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  {category.icon}
                  <Box sx={{ ml: 1 }}>{category.type}</Box>
                </Typography>
                <List>
                  {category.items.map((item, index) => (
                    <React.Fragment key={index}>
                      <ListItem button onClick={item.onClick}>
                        <ListItemText
                          primary={item.title}
                          secondary={item.subtitle}
                        />
                      </ListItem>
                      {index < category.items.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              </Box>
            ))
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSearchDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Dashboard; 