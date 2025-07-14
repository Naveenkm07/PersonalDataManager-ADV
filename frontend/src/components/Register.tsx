import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Link,
  Alert,
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
  PersonAdd as RegisterIcon
} from '@mui/icons-material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';

const Register: React.FC = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();
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
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

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
      // Mock registration - in production this would be a real API call
      // For demo purposes, we'll just log the user in directly
      const success = await login(formData.email, formData.password);
      if (success) {
        showNotification('Registration successful!', 'success');
        navigate('/dashboard');
      } else {
        showNotification('Registration failed', 'error');
      }
    } catch (error) {
      showNotification('Registration failed. Please try again.', 'error');
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

  const handleToggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  return (
    <Container 
      maxWidth="sm" 
      sx={{ 
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        py: isMobile ? 2 : 4
      }}
    >
      <Paper 
        elevation={isMobile ? 2 : 8}
        sx={{
          width: '100%',
          maxWidth: isMobile ? '100%' : 400,
          borderRadius: isMobile ? 2 : 3,
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <Box
          sx={{
            background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
            color: 'white',
            p: isMobile ? 3 : 4,
            textAlign: 'center'
          }}
        >
          <Typography 
            variant={isMobile ? 'h5' : 'h4'} 
            component="h1" 
            gutterBottom
            sx={{ fontWeight: 600 }}
          >
            NAVEEN
          </Typography>
          <Typography variant="body1" sx={{ opacity: 0.9 }}>
            Create Your Account
          </Typography>
        </Box>

        {/* Registration Form */}
        <CardContent sx={{ p: isMobile ? 3 : 4 }}>
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
            Sign Up
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
                  minHeight: isMobile ? 48 : 56,
                },
                mb: 2
              }}
            />

            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type={showPassword ? 'text' : 'password'}
              id="password"
              autoComplete="new-password"
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
                  minHeight: isMobile ? 48 : 56,
                },
                mb: 2
              }}
            />

            <TextField
              margin="normal"
              required
              fullWidth
              name="confirmPassword"
              label="Confirm Password"
              type={showConfirmPassword ? 'text' : 'password'}
              id="confirmPassword"
              autoComplete="new-password"
              value={formData.confirmPassword}
              onChange={handleChange}
              error={!!errors.confirmPassword}
              helperText={errors.confirmPassword}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Lock color="action" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle confirm password visibility"
                      onClick={handleToggleConfirmPasswordVisibility}
                      edge="end"
                      size="large"
                    >
                      {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiInputBase-root': {
                  minHeight: isMobile ? 48 : 56,
                },
                mb: 3
              }}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={isLoading}
              startIcon={<RegisterIcon />}
              sx={{
                mt: 2,
                mb: 2,
                py: isMobile ? 1.5 : 2,
                fontSize: isMobile ? '1rem' : '1.1rem',
                fontWeight: 600,
                borderRadius: 2,
                textTransform: 'none',
                boxShadow: 2,
                '&:hover': {
                  boxShadow: 4,
                }
              }}
            >
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </Button>

            <Box sx={{ textAlign: 'center', mt: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Already have an account?{' '}
                <Link 
                  component={RouterLink} 
                  to="/login" 
                  variant="body2"
                  sx={{ 
                    fontWeight: 600,
                    textDecoration: 'none',
                    '&:hover': {
                      textDecoration: 'underline'
                    }
                  }}
                >
                  Sign in here
                </Link>
              </Typography>
            </Box>

            {/* Demo Info */}
            <Alert 
              severity="info" 
              sx={{ 
                mt: 3,
                fontSize: isMobile ? '0.75rem' : '0.875rem'
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                Demo Registration:
              </Typography>
              <Typography variant="body2" sx={{ fontSize: 'inherit' }}>
                Use any email and password (min 6 characters)
              </Typography>
              <Typography variant="body2" sx={{ fontSize: 'inherit' }}>
                The system will create a demo account for you
              </Typography>
            </Alert>
          </Box>
        </CardContent>
      </Paper>
    </Container>
  );
};

export default Register; 