import React, { lazy, Suspense } from 'react';
import { Box, Container, AppBar, Toolbar, Typography, Button } from '@mui/material';
import { Routes, Route, Link, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { useNotification } from './contexts/NotificationContext';
import LoadingScreen from './components/LoadingScreen';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import SecurityLog from './components/SecurityLog';
import SyncStatus from './components/SyncStatus';
import SecureNotes from './components/SecureNotes';
import Analytics from './components/Analytics';

// Lazy load components
const OfflineDataManager = lazy(() => import('./components/OfflineDataManager'));
const Passwords = lazy(() => import('./components/Passwords'));
const Contacts = lazy(() => import('./components/Contacts'));

// ProtectedRoute Component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';

  if (!isLoggedIn) {
    return <Navigate to="/login" />;
  }

  return <>{children}</>;
};

const App: React.FC = () => {
  const { logout } = useAuth();
  const { showNotification } = useNotification();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            NHCE
          </Typography>
          <Button color="inherit" component={Link} to="/dashboard">
            Dashboard
          </Button>
          <Button color="inherit" component={Link} to="/passwords">
            Passwords
          </Button>
          <Button color="inherit" component={Link} to="/contacts">
            Contacts
          </Button>
          <Button color="inherit" component={Link} to="/security">
            Security Log
          </Button>
          <Button color="inherit" component={Link} to="/sync">
            Sync Status
          </Button>
          <Button color="inherit" component={Link} to="/secure-notes">
            Secure Notes
          </Button>
          <Button color="inherit" component={Link} to="/offline">
            Offline Data
          </Button>
          <Button color="inherit" component={Link} to="/analytics">
            Analytics
          </Button>
          <Button color="inherit" onClick={() => {
            localStorage.removeItem('isLoggedIn');
            showNotification('Logged out successfully!', 'success');
            window.location.href = '/login';
          }}>
            Logout
          </Button>
        </Toolbar>
      </AppBar>
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