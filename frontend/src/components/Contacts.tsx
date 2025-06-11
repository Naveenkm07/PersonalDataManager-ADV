import React, { useState, useEffect } from 'react';
import {
  Box,
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
  Alert,
  Paper,
  Divider,
  Grid,
  Avatar,
  InputAdornment,
  Chip,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  LocationOn as LocationIcon,
  Work as WorkIcon,
} from '@mui/icons-material';
import { useNotification } from '../contexts/NotificationContext';

interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  company: string;
  notes: string;
  tags: string[];
}

const Contacts: React.FC = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [newContact, setNewContact] = useState<Partial<Contact>>({
    name: '',
    email: '',
    phone: '',
    address: '',
    company: '',
    notes: '',
    tags: [],
  });
  const [newTag, setNewTag] = useState('');
  const { showNotification } = useNotification();

  useEffect(() => {
    try {
      const storedContacts = localStorage.getItem('contacts');
      if (storedContacts) {
        setContacts(JSON.parse(storedContacts));
      }
    } catch (error) {
      showNotification('Error loading contacts', 'error');
    }
  }, [showNotification]);

  const handleOpen = () => {
    setOpen(true);
    setEditingContact(null);
    setNewContact({
      name: '',
      email: '',
      phone: '',
      address: '',
      company: '',
      notes: '',
      tags: [],
    });
  };

  const handleEdit = (contact: Contact) => {
    setEditingContact(contact);
    setNewContact(contact);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingContact(null);
    setNewContact({
      name: '',
      email: '',
      phone: '',
      address: '',
      company: '',
      notes: '',
      tags: [],
    });
  };

  const handleSave = () => {
    if (!newContact.name || !newContact.email) {
      showNotification('Name and email are required', 'error');
      return;
    }

    try {
      let updatedContacts;
      if (editingContact) {
        updatedContacts = contacts.map((contact) =>
          contact.id === editingContact.id
            ? { 
                ...newContact,
                id: contact.id,
                name: newContact.name || '',
                email: newContact.email || '',
                phone: newContact.phone || '',
                address: newContact.address || '',
                company: newContact.company || '',
                notes: newContact.notes || '',
                tags: newContact.tags || [],
              } as Contact
            : contact
        );
      } else {
        updatedContacts = [
          ...contacts,
          {
            ...newContact,
            id: Date.now().toString(),
            name: newContact.name || '',
            email: newContact.email || '',
            phone: newContact.phone || '',
            address: newContact.address || '',
            company: newContact.company || '',
            notes: newContact.notes || '',
            tags: newContact.tags || [],
          } as Contact,
        ];
      }

      localStorage.setItem('contacts', JSON.stringify(updatedContacts));
      setContacts(updatedContacts);
      handleClose();
      showNotification(
        `Contact ${editingContact ? 'updated' : 'added'} successfully`,
        'success'
      );
    } catch (error) {
      showNotification('Error saving contact', 'error');
    }
  };

  const handleDelete = (id: string) => {
    try {
      const updatedContacts = contacts.filter((contact) => contact.id !== id);
      localStorage.setItem('contacts', JSON.stringify(updatedContacts));
      setContacts(updatedContacts);
      showNotification('Contact deleted successfully', 'success');
    } catch (error) {
      showNotification('Error deleting contact', 'error');
    }
  };

  const handleAddTag = () => {
    if (newTag.trim() && !newContact.tags?.includes(newTag.trim())) {
      setNewContact((prev) => ({
        ...prev,
        tags: [...(prev.tags || []), newTag.trim()],
      }));
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setNewContact((prev) => ({
      ...prev,
      tags: prev.tags?.filter((tag) => tag !== tagToRemove) || [],
    }));
  };

  const filteredContacts = contacts.filter((contact) =>
    Object.values(contact).some((value) =>
      value.toString().toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Contacts
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        Manage your contacts securely. All data is stored locally in your browser.
      </Alert>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={8}>
          <TextField
            fullWidth
            placeholder="Search contacts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <Button
            fullWidth
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpen}
          >
            Add New Contact
          </Button>
        </Grid>
      </Grid>

      <Paper elevation={2}>
        <List>
          {filteredContacts.length === 0 ? (
            <ListItem>
              <ListItemText
                primary="No contacts found"
                secondary="Click 'Add New Contact' to get started"
              />
            </ListItem>
          ) : (
            filteredContacts.map((contact) => (
              <React.Fragment key={contact.id}>
                <ListItem>
                  <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                    {contact.name.charAt(0).toUpperCase()}
                  </Avatar>
                  <ListItemText
                    primary={contact.name}
                    secondary={
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          <EmailIcon fontSize="small" sx={{ mr: 1, verticalAlign: 'middle' }} />
                          {contact.email}
                        </Typography>
                        {contact.phone && (
                          <Typography variant="body2" color="text.secondary">
                            <PhoneIcon fontSize="small" sx={{ mr: 1, verticalAlign: 'middle' }} />
                            {contact.phone}
                          </Typography>
                        )}
                        {contact.company && (
                          <Typography variant="body2" color="text.secondary">
                            <WorkIcon fontSize="small" sx={{ mr: 1, verticalAlign: 'middle' }} />
                            {contact.company}
                          </Typography>
                        )}
                        {contact.address && (
                          <Typography variant="body2" color="text.secondary">
                            <LocationIcon fontSize="small" sx={{ mr: 1, verticalAlign: 'middle' }} />
                            {contact.address}
                          </Typography>
                        )}
                        {contact.tags && contact.tags.length > 0 && (
                          <Box sx={{ mt: 1 }}>
                            {contact.tags.map((tag) => (
                              <Chip
                                key={tag}
                                label={tag}
                                size="small"
                                sx={{ mr: 0.5, mb: 0.5 }}
                              />
                            ))}
                          </Box>
                        )}
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    <IconButton
                      edge="end"
                      onClick={() => handleEdit(contact)}
                      title="Edit contact"
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      edge="end"
                      onClick={() => handleDelete(contact.id)}
                      title="Delete contact"
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
        <DialogTitle>
          {editingContact ? 'Edit Contact' : 'Add New Contact'}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Name"
            fullWidth
            required
            value={newContact.name}
            onChange={(e) =>
              setNewContact({ ...newContact, name: e.target.value })
            }
          />
          <TextField
            margin="dense"
            label="Email"
            type="email"
            fullWidth
            required
            value={newContact.email}
            onChange={(e) =>
              setNewContact({ ...newContact, email: e.target.value })
            }
          />
          <TextField
            margin="dense"
            label="Phone"
            fullWidth
            value={newContact.phone}
            onChange={(e) =>
              setNewContact({ ...newContact, phone: e.target.value })
            }
          />
          <TextField
            margin="dense"
            label="Company"
            fullWidth
            value={newContact.company}
            onChange={(e) =>
              setNewContact({ ...newContact, company: e.target.value })
            }
          />
          <TextField
            margin="dense"
            label="Address"
            fullWidth
            value={newContact.address}
            onChange={(e) =>
              setNewContact({ ...newContact, address: e.target.value })
            }
          />
          <Box sx={{ mt: 2, mb: 1 }}>
            <Typography variant="subtitle2" gutterBottom>
              Tags
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
              <TextField
                size="small"
                label="Add tag"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
              />
              <Button
                variant="outlined"
                onClick={handleAddTag}
                disabled={!newTag.trim()}
              >
                Add
              </Button>
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {newContact.tags?.map((tag) => (
                <Chip
                  key={tag}
                  label={tag}
                  onDelete={() => handleRemoveTag(tag)}
                />
              ))}
            </Box>
          </Box>
          <TextField
            margin="dense"
            label="Notes"
            fullWidth
            multiline
            rows={4}
            value={newContact.notes}
            onChange={(e) =>
              setNewContact({ ...newContact, notes: e.target.value })
            }
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSave} variant="contained">
            {editingContact ? 'Update' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Contacts; 