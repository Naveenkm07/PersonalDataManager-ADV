import React, { useState } from 'react';
import { 
  TextField, 
  Button, 
  Box, 
  Typography, 
  Container, 
  Paper,
  Avatar 
} from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { useNavigate } from 'react-router-dom';
import { useNotification } from '../contexts/NotificationContext';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (email === 'nhce@gmail.com' && password === 'CSECSE') {
        // Store auth state
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('user', JSON.stringify({ email }));
        
        showNotification('Login successful! Redirecting...', 'success');
        
        // Add slight delay for better UX
        setTimeout(() => {
          navigate('/dashboard');
        }, 1000);
      } else {
        showNotification('Invalid email or password', 'error');
      }
    } catch (error) {
      console.error('Login error:', error);
      showNotification('An error occurred during login', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper
          elevation={3}
          sx={{
            padding: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '100%',
          }}
        >
          <Avatar sx={{ m: 1, bgcolor: 'primary.main' }}>
            <LockOutlinedIcon />
          </Avatar>
          
          <Typography component="h1" variant="h5" gutterBottom>
            Sign in to NHCE
          </Typography>
          
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1, width: '100%' }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Email Address"
              name="email"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={email !== '' && !email.includes('@')}
              helperText={email !== '' && !email.includes('@') ? 'Invalid email format' : ''}
            />
            
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type="password"
              id="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={password !== '' && password.length < 6}
              helperText={password !== '' && password.length < 6 ? 'Password must be at least 6 characters' : ''}
            />
            
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={isSubmitting || !email || !password}
            >
              {isSubmitting ? 'Signing in...' : 'Sign In'}
            </Button>

            <Typography variant="body2" color="text.secondary" align="center">
              Personal Data Manger
              <br />
              New Horizon College of Engineering
              <br />
              Bengaluru , Karnataka.
            </Typography>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default Login;