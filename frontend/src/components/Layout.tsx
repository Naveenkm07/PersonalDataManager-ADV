import React from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation, Link } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Box,
  useTheme,
  Container,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Button,
  useMediaQuery,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Brightness4 as DarkModeIcon,
  Brightness7 as LightModeIcon,
  Dashboard as DashboardIcon,
  Lock as LockIcon,
  People as PeopleIcon,
  Storage as StorageIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import Dashboard from './Dashboard';
import Passwords from './Passwords';
import Contacts from './Contacts';
import LoadingScreen from './LoadingScreen';
import { Link as RouterLink } from 'react-router-dom';

interface LayoutProps {
  onToggleColorMode: () => void;
}

const Layout: React.FC<LayoutProps> = ({ onToggleColorMode }) => {
  const { logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: <DashboardIcon /> },
    { path: '/passwords', label: 'Passwords', icon: <LockIcon /> },
    { path: '/contacts', label: 'Contacts', icon: <PeopleIcon /> },
    { path: '/data-management', label: 'Data Management', icon: <StorageIcon /> },
  ];

  const handleNavigation = (path: string) => {
    navigate(path);
    setDrawerOpen(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const pageTitle = location.pathname.split('/')[1]?.charAt(0).toUpperCase() + 
                   location.pathname.split('/')[1]?.slice(1) || 'Dashboard';

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar position="fixed">
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={() => setDrawerOpen(true)}
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            {pageTitle}
          </Typography>
          <IconButton color="inherit" onClick={onToggleColorMode}>
            {theme.palette.mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
          </IconButton>
        </Toolbar>
      </AppBar>

      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      >
        <Box
          sx={{
            width: 250,
            pt: 8,
            height: '100%',
            bgcolor: 'background.paper',
          }}
        >
          <List>
            {navItems.map((item) => (
              <ListItemButton
                key={item.label}
                component={Link}
                to={item.path}
                selected={location.pathname === item.path}
                onClick={() => setDrawerOpen(false)}
                sx={{
                  '&.Mui-selected': {
                    backgroundColor: 'action.selected',
                  },
                }}
              >
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.label} />
              </ListItemButton>
            ))}
            {isAuthenticated && (
              <>
                <ListItem button onClick={() => navigate('/offline-data')}>
                  <ListItemText primary="Offline Data" />
                </ListItem>
                <ListItem button onClick={() => navigate('/offline-analytics')}>
                  <ListItemText primary="Analytics" />
                </ListItem>
              </>
            )}
            <ListItem button onClick={handleLogout}>
              <ListItemText primary="Logout" />
            </ListItem>
          </List>
        </Box>
      </Drawer>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          pt: 8,
          bgcolor: 'background.default',
        }}
      >
        <Container maxWidth="lg" sx={{ py: 3 }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/passwords" element={<Passwords />} />
            <Route path="/contacts" element={<Contacts />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Container>
      </Box>
    </Box>
  );
};

export default Layout; 