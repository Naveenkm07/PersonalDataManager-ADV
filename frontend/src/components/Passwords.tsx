import React, { useState, useEffect } from 'react';
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
  id: string;
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
    try {
      const storedPasswords = localStorage.getItem('passwords');
      if (storedPasswords) {
        setPasswords(JSON.parse(storedPasswords));
      }
    } catch (error) {
      showNotification('Error loading passwords', 'error');
    }
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

  const handleSave = () => {
    if (!newPassword.title || !newPassword.username || !newPassword.password) {
      showNotification('Please fill in all required fields', 'error');
      return;
    }

    try {
      const updatedPasswords = [
        ...passwords,
        {
          ...newPassword,
          id: Date.now().toString(),
        } as Password,
      ];

      localStorage.setItem('passwords', JSON.stringify(updatedPasswords));
      setPasswords(updatedPasswords);
      handleClose();
      showNotification('Password saved successfully', 'success');
    } catch (error) {
      showNotification('Error saving password', 'error');
    }
  };

  const handleDelete = (id: string) => {
    try {
      const updatedPasswords = passwords.filter((pwd) => pwd.id !== id);
      localStorage.setItem('passwords', JSON.stringify(updatedPasswords));
      setPasswords(updatedPasswords);
      showNotification('Password deleted successfully', 'success');
    } catch (error) {
      showNotification('Error deleting password', 'error');
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

      <Alert severity="info" sx={{ mb: 3 }}>
        Store and manage your passwords securely. All data is stored locally in your browser.
      </Alert>

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
              <React.Fragment key={pwd.id}>
                <ListItem>
                  <ListItemText
                    primary={pwd.title}
                    secondary={
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Username: {pwd.username}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Password: {showPassword[pwd.id] ? pwd.password : '••••••••'}
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
                      onClick={() => togglePasswordVisibility(pwd.id)}
                      title={showPassword[pwd.id] ? 'Hide password' : 'Show password'}
                    >
                      {showPassword[pwd.id] ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                    <IconButton
                      edge="end"
                      onClick={() => handleDelete(pwd.id)}
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
            type={showPassword['new'] ? 'text' : 'password'}
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
                    onClick={() => setShowPassword(prev => ({ ...prev, new: !prev['new'] }))}
                    edge="end"
                  >
                    {showPassword['new'] ? <VisibilityOffIcon /> : <VisibilityIcon />}
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