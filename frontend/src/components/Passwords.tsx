import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  InputAdornment,
  Alert,
  Paper,
  Divider,
  FormControlLabel,
  Checkbox,
  Slider,
  Stack,
} from '@mui/material';
import {
  Add as AddIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ContentCopy as CopyIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useNotification } from '../contexts/NotificationContext';

interface Password {
  _id: string;
  title: string;
  username: string;
  password: string;
  url: string;
  notes: string;
}

interface PasswordOptions {
  length: number;
  includeUppercase: boolean;
  includeLowercase: boolean;
  includeNumbers: boolean;
  includeSpecial: boolean;
}

const Passwords: React.FC = () => {
  const [passwords, setPasswords] = useState<Password[]>([]);
  const [open, setOpen] = useState(false);
  const [showPassword, setShowPassword] = useState<{ [key: string]: boolean }>({});
  const [newPassword, setNewPassword] = useState<Partial<Password>>({
    title: '',
    username: '',
    password: '',
    url: '',
    notes: '',
  });
  const [passwordOptions, setPasswordOptions] = useState<PasswordOptions>({
    length: 12,
    includeUppercase: true,
    includeLowercase: true,
    includeNumbers: true,
    includeSpecial: true,
  });
  const { showNotification } = useNotification();

  useEffect(() => {
    const fetchPasswords = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/passwords');
        setPasswords(response.data);
      } catch (error) {
        showNotification('Error fetching passwords', 'error');
        console.error('Error fetching passwords:', error);
      }
    };
    fetchPasswords();
  }, [showNotification]);

  const generatePassword = () => {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';

    let chars = '';
    if (passwordOptions.includeUppercase) chars += uppercase;
    if (passwordOptions.includeLowercase) chars += lowercase;
    if (passwordOptions.includeNumbers) chars += numbers;
    if (passwordOptions.includeSpecial) chars += special;

    if (chars === '') {
      showNotification('Please select at least one character type', 'error');
      return;
    }

    let password = '';
    for (let i = 0; i < passwordOptions.length; i++) {
      const randomIndex = Math.floor(Math.random() * chars.length);
      password += chars[randomIndex];
    }

    setNewPassword(prev => ({ ...prev, password }));
  };

  const handleOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setNewPassword({
      title: '',
      username: '',
      password: '',
      url: '',
      notes: '',
    });
  };

  const handleSave = async () => {
    if (!newPassword.title || !newPassword.username || !newPassword.password) {
      showNotification('Please fill in all required fields', 'error');
      return;
    }

    try {
      const response = await axios.post('http://localhost:5000/api/passwords', newPassword);
      setPasswords(prevPasswords => [...prevPasswords, response.data]);
      handleClose();
      showNotification('Password saved successfully', 'success');
    } catch (error) {
      showNotification('Error saving password', 'error');
      console.error('Error saving password:', error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await axios.delete(`http://localhost:5000/api/passwords/${id}`);
      setPasswords(prevPasswords => prevPasswords.filter((pwd) => pwd._id !== id));
      showNotification('Password deleted successfully', 'success');
    } catch (error) {
      showNotification('Error deleting password', 'error');
      console.error('Error deleting password:', error);
    }
  };

  const handleCopy = (text: string, type: string) => {
    try {
      navigator.clipboard.writeText(text);
      showNotification(`${type} copied to clipboard`, 'success');
    } catch (error) {
      showNotification('Error copying to clipboard', 'error');
    }
  };

  const togglePasswordVisibility = (id: string) => {
    setShowPassword(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Password Manager
      </Typography>

      <Button
        variant="contained"
        startIcon={<AddIcon />}
        onClick={handleOpen}
        sx={{ mb: 3 }}
      >
        Add New Password
      </Button>

      <Paper elevation={2}>
        <List>
          {passwords.length === 0 ? (
            <ListItem>
              <ListItemText
                primary="No passwords saved"
                secondary="Click 'Add New Password' to get started"
              />
            </ListItem>
          ) : (
            passwords.map((pwd) => (
              <React.Fragment key={pwd._id}>
                <ListItem>
                  <ListItemText
                    primary={pwd.title}
                    secondary={
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Username: {pwd.username}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Password: {showPassword[pwd._id] ? pwd.password : '••••••••'}
                        </Typography>
                        {pwd.url && (
                          <Typography variant="body2" color="text.secondary">
                            URL: {pwd.url}
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    <IconButton
                      edge="end"
                      onClick={() => handleCopy(pwd.username, 'Username')}
                      title="Copy username"
                    >
                      <CopyIcon />
                    </IconButton>
                    <IconButton
                      edge="end"
                      onClick={() => handleCopy(pwd.password, 'Password')}
                      title="Copy password"
                    >
                      <CopyIcon />
                    </IconButton>
                    <IconButton
                      edge="end"
                      onClick={() => togglePasswordVisibility(pwd._id)}
                      title={showPassword[pwd._id] ? 'Hide password' : 'Show password'}
                    >
                      {showPassword[pwd._id] ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                    <IconButton
                      edge="end"
                      onClick={() => handleDelete(pwd._id)}
                      title="Delete password"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
                <Divider />
              </React.Fragment>
            ))
          )}
        </List>
      </Paper>

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>Add New Password</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Title"
            fullWidth
            required
            value={newPassword.title}
            onChange={(e) =>
              setNewPassword({ ...newPassword, title: e.target.value })
            }
          />
          <TextField
            margin="dense"
            label="Username"
            fullWidth
            required
            value={newPassword.username}
            onChange={(e) =>
              setNewPassword({ ...newPassword, username: e.target.value })
            }
          />
          <Box sx={{ mt: 2, mb: 2 }}>
            <Typography gutterBottom>Password Options</Typography>
            <Stack spacing={2}>
              <Box>
                <Typography gutterBottom>Length: {passwordOptions.length}</Typography>
                <Slider
                  value={passwordOptions.length}
                  onChange={(_, value) => setPasswordOptions(prev => ({ ...prev, length: value as number }))}
                  min={8}
                  max={32}
                  step={1}
                  marks
                />
              </Box>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={passwordOptions.includeUppercase}
                    onChange={(e) => setPasswordOptions(prev => ({ ...prev, includeUppercase: e.target.checked }))}
                  />
                }
                label="Include Uppercase (A-Z)"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={passwordOptions.includeLowercase}
                    onChange={(e) => setPasswordOptions(prev => ({ ...prev, includeLowercase: e.target.checked }))}
                  />
                }
                label="Include Lowercase (a-z)"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={passwordOptions.includeNumbers}
                    onChange={(e) => setPasswordOptions(prev => ({ ...prev, includeNumbers: e.target.checked }))}
                  />
                }
                label="Include Numbers (0-9)"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={passwordOptions.includeSpecial}
                    onChange={(e) => setPasswordOptions(prev => ({ ...prev, includeSpecial: e.target.checked }))}
                  />
                }
                label="Include Special Characters (!@#$%^&*)"
              />
            </Stack>
          </Box>
          <TextField
            margin="dense"
            label="Password"
            type={showPassword['newPasswordInput'] ? 'text' : 'password'}
            fullWidth
            required
            value={newPassword.password}
            onChange={(e) =>
              setNewPassword({ ...newPassword, password: e.target.value })
            }
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={generatePassword}
                    title="Generate password"
                  >
                    <RefreshIcon />
                  </IconButton>
                  <IconButton
                    onClick={() => togglePasswordVisibility('newPasswordInput')}
                    title={showPassword['newPasswordInput'] ? 'Hide password' : 'Show password'}
                  >
                    {showPassword['newPasswordInput'] ? <VisibilityOffIcon /> : <VisibilityIcon />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          <TextField
            margin="dense"
            label="URL"
            fullWidth
            value={newPassword.url}
            onChange={(e) =>
              setNewPassword({ ...newPassword, url: e.target.value })
            }
          />
          <TextField
            margin="dense"
            label="Notes"
            fullWidth
            multiline
            rows={4}
            value={newPassword.notes}
            onChange={(e) =>
              setNewPassword({ ...newPassword, notes: e.target.value })
            }
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSave} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Passwords; 