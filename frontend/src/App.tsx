import React, { lazy, Suspense, useState } from 'react';
import { Box, Container, AppBar, Toolbar, Typography, Button, IconButton, Drawer, List, ListItem, ListItemButton, ListItemText, useMediaQuery } from '@mui/material';
import { Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import MenuIcon from '@mui/icons-material/Menu';
import LockIcon from '@mui/icons-material/Lock';
import PeopleIcon from '@mui/icons-material/People';
import SecurityIcon from '@mui/icons-material/Security';
import SyncIcon from '@mui/icons-material/Sync';
import NoteIcon from '@mui/icons-material/Note';
import StorageIcon from '@mui/icons-material/Storage';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import DashboardIcon from '@mui/icons-material/Dashboard';
import { useAuth } from './contexts/AuthContext';
import { useNotification } from './contexts/NotificationContext';
import LoadingScreen from './components/LoadingScreen';
import Login from './components/Login';
import Register from './components/Register';
import ThemeToggle from './components/ThemeToggle';
import Teams from './components/Teams';

// Lazy load components
const Dashboard = lazy(() => import('./components/Dashboard'));
const Passwords = lazy(() => import('./components/Passwords'));
const Contacts = lazy(() => import('./components/Contacts'));
const SecurityLog = lazy(() => import('./components/SecurityLog'));
const SyncStatus = lazy(() => import('./components/SyncStatus'));
const SecureNotes = lazy(() => import('./components/SecureNotes'));
const OfflineDataManager = lazy(() => import('./components/OfflineDataManager'));
const Analytics = lazy(() => import('./components/Analytics'));

// ProtectedRoute Component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  return <>{children}</>;
};

const App: React.FC = () => {
  const { logout, isLoading } = useAuth();
  const { showNotification } = useNotification();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  if (isLoading) {
    return <LoadingScreen />;
  }

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: <DashboardIcon /> },
    { path: '/teams', label: 'Teams', icon: <PeopleIcon /> },
    { path: '/passwords', label: 'Passwords', icon: <LockIcon /> },
    { path: '/contacts', label: 'Contacts', icon: <PeopleIcon /> },
    { path: '/security', label: 'Security Log', icon: <SecurityIcon /> },
    { path: '/sync', label: 'Sync Status', icon: <SyncIcon /> },
    { path: '/secure-notes', label: 'Secure Notes', icon: <NoteIcon /> },
    { path: '/offline', label: 'Offline Data', icon: <StorageIcon /> },
    { path: '/analytics', label: 'Analytics', icon: <AnalyticsIcon /> },
  ];

  const drawer = (
    <Box onClick={handleDrawerToggle} sx={{ textAlign: 'center' }}>
      <Typography variant="h6" sx={{ my: 2 }}>
        NAVEEN
      </Typography>
      <List>
        {navItems.map((item) => (
          <ListItem key={item.path} disablePadding>
            <ListItemButton 
              component={Link} 
              to={item.path} 
              sx={{ 
                textAlign: 'center',
                backgroundColor: location.pathname === item.path ? 'rgba(25, 118, 210, 0.1)' : 'transparent'
              }}
            >
              <ListItemText primary={item.label} />
            </ListItemButton>
          </ListItem>
        ))}
        <ListItem disablePadding>
          <ListItemButton sx={{ textAlign: 'center' }} onClick={() => {
            localStorage.removeItem('isLoggedIn');
            showNotification('Logged out successfully!', 'success');
            window.location.href = '/login';
          }}>
            <ListItemText primary="Logout" />
          </ListItemButton>
        </ListItem>
      </List>
    </Box>
  );

  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn');
    showNotification('Logged out successfully!', 'success');
    window.location.href = '/login';
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="static" component="nav">
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography
            variant="h6"
            component="div"
            sx={{ flexGrow: 1, display: { xs: 'none', md: 'block' } }}
          >
            NAVEEN
          </Typography>
          <Box sx={{ display: { xs: 'none', md: 'block' } }}>
            {navItems.map((item) => (
              <Button 
                key={item.path} 
                color="inherit" 
                component={Link} 
                to={item.path}
                sx={{
                  backgroundColor: location.pathname === item.path ? 'rgba(255, 255, 255, 0.1)' : 'transparent'
                }}
              >
                {item.label}
              </Button>
            ))}
            <Button color="inherit" onClick={handleLogout}>
              Logout
            </Button>
            <ThemeToggle />
          </Box>
        </Toolbar>
      </AppBar>
      
      <nav>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile.
          }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: 240 },
          }}
        >
          {drawer}
        </Drawer>
      </nav>
      
      <Container component="main" sx={{ flexGrow: 1, py: 3 }}>
        <Suspense fallback={<LoadingScreen />}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/teams"
              element={
                <ProtectedRoute>
                  <Teams />
                </ProtectedRoute>
              }
            />
            <Route
              path="/passwords"
              element={
                <ProtectedRoute>
                  <Passwords />
                </ProtectedRoute>
              }
            />
            <Route
              path="/contacts"
              element={
                <ProtectedRoute>
                  <Contacts />
                </ProtectedRoute>
              }
            />
            <Route
              path="/security"
              element={
                <ProtectedRoute>
                  <SecurityLog />
                </ProtectedRoute>
              }
            />
            <Route
              path="/sync"
              element={
                <ProtectedRoute>
                  <SyncStatus />
                </ProtectedRoute>
              }
            />
            <Route
              path="/secure-notes"
              element={
                <ProtectedRoute>
                  <SecureNotes />
                </ProtectedRoute>
              }
            />
            <Route
              path="/offline"
              element={
                <ProtectedRoute>
                  <OfflineDataManager />
                </ProtectedRoute>
              }
            />
            <Route
              path="/analytics"
              element={
                <ProtectedRoute>
                  <Analytics />
                </ProtectedRoute>
              }
            />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Suspense>
      </Container>
    </Box>
  );
};

export default App;