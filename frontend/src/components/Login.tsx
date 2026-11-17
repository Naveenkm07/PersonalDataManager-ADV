import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Link,
  InputAdornment,
  IconButton,
  useTheme,
  useMediaQuery,
  Paper,
  Container
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Email,
  Lock,
  Login as LoginIcon
} from '@mui/icons-material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';

const Login: React.FC = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState('');
  const [mfaRequired, setMfaRequired] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isLoading, setIsLoading] = useState(false);

  const { login, loginWithOAuth } = useAuth();
  const { showNotification } = useNotification();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    }
    if (mfaRequired && !/^\d{6}$/.test(otp)) newErrors.otp = 'Enter the six-digit authenticator code';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      const success = await login(formData.email, formData.password, mfaRequired ? otp : undefined);
      if (success) {
        showNotification('Login successful!', 'success');
        navigate('/dashboard');
      } else {
        showNotification('Invalid credentials', 'error');
      }
    } catch (error) {
      if (error instanceof Error && error.message === 'MFA_REQUIRED') {
        setMfaRequired(true);
        showNotification('Enter the code from your authenticator app.', 'info');
        return;
      }
      showNotification('Login failed. Please try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleTogglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const startGoogleLogin = () => {
    const apiBase = process.env.REACT_APP_API_URL || 'http://localhost:8000';
    const expectedOrigin = new URL(apiBase).origin;
    let timeout = 0;
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== expectedOrigin || event.data?.type !== 'securevault-oauth') return;
      window.removeEventListener('message', handleMessage);
      window.clearTimeout(timeout);
      if (loginWithOAuth(event.data.session)) {
        showNotification('Google sign-in successful!', 'success');
        navigate('/dashboard');
      } else {
        showNotification('Google sign-in did not return a valid session.', 'error');
      }
    };
    window.addEventListener('message', handleMessage);
    timeout = window.setTimeout(() => window.removeEventListener('message', handleMessage), 5 * 60 * 1000);
    const popup = window.open(`${apiBase}/api/auth/oauth/google/authorize`, 'securevault-google-oauth', 'popup,width=520,height=640');
    if (!popup) {
      window.removeEventListener('message', handleMessage);
      window.clearTimeout(timeout);
      showNotification('Allow pop-ups to continue with Google.', 'error');
    }
  };

  return (
    <Container 
      maxWidth="sm" 
      sx={{ 
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        py: 4
      }}
    >
      <Paper 
        elevation={8}
        sx={{
          width: '100%',
          maxWidth: 400,
          borderRadius: 3,
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <Box
          sx={{
            background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
            color: 'white',
            p: 4,
            textAlign: 'center'
          }}
        >
          <Typography 
            variant="h4" 
            component="h1" 
            gutterBottom
            sx={{ fontWeight: 600 }}
          >
            NAVEEN
          </Typography>
          <Typography variant="body1" sx={{ opacity: 0.9 }}>
            Digital Life Management System
          </Typography>
        </Box>

        {/* Login Form */}
        <CardContent sx={{ p: 4 }}>
          <Typography 
            variant="h6" 
            component="h2" 
            gutterBottom 
            sx={{ 
              textAlign: 'center', 
              mb: 3,
              color: 'text.primary'
            }}
          >
            Sign In
          </Typography>

          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Email Address"
              name="email"
              autoComplete="email"
              autoFocus
              value={formData.email}
              onChange={handleChange}
              error={!!errors.email}
              helperText={errors.email}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Email color="action" />
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiInputBase-root': {
                  minHeight: 56,
                },
                mb: 2
              }}
            />

            {mfaRequired && (
              <TextField
                margin="normal"
                required
                fullWidth
                name="otp"
                label="Authenticator code"
                value={otp}
                onChange={event => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
                error={!!errors.otp}
                helperText={errors.otp || 'Enter the six-digit code from your authenticator app.'}
                inputProps={{ inputMode: 'numeric', pattern: '[0-9]{6}', maxLength: 6 }}
              />
            )}

            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type={showPassword ? 'text' : 'password'}
              id="password"
              autoComplete="current-password"
              value={formData.password}
              onChange={handleChange}
              error={!!errors.password}
              helperText={errors.password}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Lock color="action" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={handleTogglePasswordVisibility}
                      edge="end"
                      size="large"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiInputBase-root': {
                  minHeight: 56,
                },
                mb: 3
              }}
            />

            <Button
              type="button"
              fullWidth
              variant="outlined"
              onClick={startGoogleLogin}
              sx={{ mt: 1, py: 1.5, textTransform: 'none' }}
            >
              Continue with Google
            </Button>

            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={isLoading}
              startIcon={<LoginIcon />}
              sx={{
                mt: 2,
                mb: 2,
                py: 2,
                fontSize: '1.1rem',
                fontWeight: 600,
                borderRadius: 2,
                textTransform: 'none',
                boxShadow: 2,
                '&:hover': {
                  boxShadow: 4,
                }
              }}
            >
              {isLoading ? 'Signing In...' : 'Sign In'}
            </Button>

            <Box sx={{ textAlign: 'center', mt: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Don't have an account?{' '}
                <Link 
                  component={RouterLink} 
                  to="/register" 
                  variant="body2"
                  sx={{ 
                    fontWeight: 600,
                    textDecoration: 'none',
                    '&:hover': {
                      textDecoration: 'underline'
                    }
                  }}
                >
                  Sign up here
                </Link>
              </Typography>
            </Box>

          </Box>
        </CardContent>
      </Paper>
    </Container>
  );
};

export default Login;
