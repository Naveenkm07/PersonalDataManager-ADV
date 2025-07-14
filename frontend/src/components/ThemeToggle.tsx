import React, { useState } from 'react';
import {
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Typography,
  Box,
  Divider,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  Card,
  CardContent,
  useTheme as useMuiTheme,
} from '@mui/material';
import {
  Brightness4,
  Brightness7,
  SettingsBrightness,
  Palette,
  Check,
} from '@mui/icons-material';
import { useTheme, ThemeMode, CustomColorScheme, predefinedColorSchemes, darkColorSchemes } from '../contexts/ThemeContext';

const ThemeToggle: React.FC = () => {
  const { mode, setMode, colorScheme, setColorScheme, isDark } = useTheme();
  const muiTheme = useMuiTheme();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [colorDialogOpen, setColorDialogOpen] = useState(false);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleModeChange = (newMode: ThemeMode) => {
    setMode(newMode);
    handleClose();
  };

  const handleColorSchemeSelect = (scheme: CustomColorScheme) => {
    setColorScheme(scheme);
    setColorDialogOpen(false);
  };

  const getModeIcon = () => {
    switch (mode) {
      case 'light':
        return <Brightness7 />;
      case 'dark':
        return <Brightness4 />;
      case 'system':
        return <SettingsBrightness />;
      default:
        return <SettingsBrightness />;
    }
  };

  const getModeLabel = () => {
    switch (mode) {
      case 'light':
        return 'Light Mode';
      case 'dark':
        return 'Dark Mode';
      case 'system':
        return 'System';
      default:
        return 'System';
    }
  };

  const ColorSchemeCard: React.FC<{
    scheme: CustomColorScheme;
    isSelected: boolean;
    onClick: () => void;
  }> = ({ scheme, isSelected, onClick }) => (
    <Card
      sx={{
        cursor: 'pointer',
        border: isSelected ? 2 : 1,
        borderColor: isSelected ? 'primary.main' : 'divider',
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: muiTheme.shadows[4],
        },
      }}
      onClick={onClick}
    >
      <CardContent sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <Box
            sx={{
              width: 20,
              height: 20,
              borderRadius: '50%',
              backgroundColor: scheme.primary,
              mr: 1,
            }}
          />
          <Typography variant="subtitle2" sx={{ flexGrow: 1 }}>
            {scheme.name}
          </Typography>
          {isSelected && (
            <Check color="primary" sx={{ fontSize: 20 }} />
          )}
        </Box>
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Box
            sx={{
              width: 16,
              height: 16,
              borderRadius: 2,
              backgroundColor: scheme.primary,
            }}
          />
          <Box
            sx={{
              width: 16,
              height: 16,
              borderRadius: 2,
              backgroundColor: scheme.secondary,
            }}
          />
          <Box
            sx={{
              width: 16,
              height: 16,
              borderRadius: 2,
              backgroundColor: scheme.accent,
            }}
          />
        </Box>
      </CardContent>
    </Card>
  );

  return (
    <>
      <IconButton
        color="inherit"
        onClick={handleClick}
        sx={{
          ml: 1,
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
          },
        }}
      >
        {getModeIcon()}
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        PaperProps={{
          sx: {
            minWidth: 200,
            mt: 1,
          },
        }}
      >
        <Box sx={{ px: 2, py: 1 }}>
          <Typography variant="subtitle2" color="text.secondary">
            Theme Mode
          </Typography>
        </Box>
        <MenuItem onClick={() => handleModeChange('light')}>
          <ListItemIcon>
            <Brightness7 />
          </ListItemIcon>
          <ListItemText primary="Light Mode" />
          {mode === 'light' && <Check color="primary" />}
        </MenuItem>
        <MenuItem onClick={() => handleModeChange('dark')}>
          <ListItemIcon>
            <Brightness4 />
          </ListItemIcon>
          <ListItemText primary="Dark Mode" />
          {mode === 'dark' && <Check color="primary" />}
        </MenuItem>
        <MenuItem onClick={() => handleModeChange('system')}>
          <ListItemIcon>
            <SettingsBrightness />
          </ListItemIcon>
          <ListItemText primary="System" />
          {mode === 'system' && <Check color="primary" />}
        </MenuItem>
        
        <Divider />
        
        <Box sx={{ px: 2, py: 1 }}>
          <Typography variant="subtitle2" color="text.secondary">
            Current: {getModeLabel()}
          </Typography>
          <Chip
            label={colorScheme.name}
            size="small"
            sx={{ mt: 0.5 }}
          />
        </Box>
        
        <Divider />
        
        <MenuItem onClick={() => setColorDialogOpen(true)}>
          <ListItemIcon>
            <Palette />
          </ListItemIcon>
          <ListItemText primary="Customize Colors" />
        </MenuItem>
      </Menu>

      <Dialog
        open={colorDialogOpen}
        onClose={() => setColorDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Palette />
            <Typography variant="h6">Choose Color Scheme</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Light Themes
            </Typography>
            <Grid container spacing={2}>
              {predefinedColorSchemes.map((scheme) => (
                <Grid item xs={12} sm={6} md={4} key={scheme.name}>
                  <ColorSchemeCard
                    scheme={scheme}
                    isSelected={colorScheme.name === scheme.name}
                    onClick={() => handleColorSchemeSelect(scheme)}
                  />
                </Grid>
              ))}
            </Grid>
          </Box>
          
          <Divider sx={{ my: 3 }} />
          
          <Box>
            <Typography variant="h6" gutterBottom>
              Dark Themes
            </Typography>
            <Grid container spacing={2}>
              {darkColorSchemes.map((scheme) => (
                <Grid item xs={12} sm={6} md={4} key={scheme.name}>
                  <ColorSchemeCard
                    scheme={scheme}
                    isSelected={colorScheme.name === scheme.name}
                    onClick={() => handleColorSchemeSelect(scheme)}
                  />
                </Grid>
              ))}
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setColorDialogOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ThemeToggle; 