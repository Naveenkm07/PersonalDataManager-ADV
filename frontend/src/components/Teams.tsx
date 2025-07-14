import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  Grid,
  Chip,
  Avatar,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Fab,
  Tooltip,
  Alert,
  Tabs,
  Tab,
  Badge,
  Switch,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import {
  Add as AddIcon,
  People as PeopleIcon,
  PersonAdd as PersonAddIcon,
  Settings as SettingsIcon,
  Share as ShareIcon,
  Visibility as VisibilityIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Group as GroupIcon,
  FamilyRestroom as FamilyIcon,
  Business as BusinessIcon,
} from '@mui/icons-material';
import { useNotification } from '../contexts/NotificationContext';
import SecurityService from '../services/SecurityService';

interface Team {
  _id: string;
  name: string;
  description: string;
  type: 'family' | 'team' | 'organization';
  owner: {
    _id: string;
    username: string;
    email: string;
  };
  members: Array<{
    user: {
      _id: string;
      username: string;
      email: string;
    };
    role: 'owner' | 'admin' | 'member' | 'viewer';
    status: 'pending' | 'accepted' | 'declined';
    invitedAt: string;
    joinedAt?: string;
  }>;
  settings: {
    allowPasswordSharing: boolean;
    allowNoteSharing: boolean;
    allowContactSharing: boolean;
    requireApproval: boolean;
    maxMembers: number;
  };
  createdAt: string;
  updatedAt: string;
}

interface SharedItem {
  _id: string;
  itemType: 'password' | 'note' | 'contact';
  itemId: {
    _id: string;
    title?: string;
    name?: string;
    username?: string;
    email?: string;
  };
  sharedBy: {
    _id: string;
    username: string;
    email: string;
  };
  permissions: {
    view: boolean;
    edit: boolean;
    delete: boolean;
    share: boolean;
  };
  accessControl: 'team' | 'role-based' | 'individual';
  sharedAt: string;
}

interface Password {
  _id: string;
  title: string;
  username: string;
  password: string;
  url: string;
  notes: string;
}

interface SecureNote {
  id: string;
  title: string;
  content: string;
  encrypted: boolean;
  createdAt: string;
  updatedAt: string;
  tags: string[];
}

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

const Teams: React.FC = () => {
  const { showNotification } = useNotification();
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [sharedItems, setSharedItems] = useState<SharedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  
  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  
  // Form states
  const [newTeam, setNewTeam] = useState({
    name: '',
    description: '',
    type: 'team' as const,
    settings: {
      allowPasswordSharing: true,
      allowNoteSharing: true,
      allowContactSharing: true,
      requireApproval: false,
      maxMembers: 50,
    },
  });
  
  const [inviteData, setInviteData] = useState({
    email: '',
    role: 'member' as const,
  });

  const [passwords, setPasswords] = useState<Password[]>([]);
  const [notes, setNotes] = useState<SecureNote[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedItems, setSelectedItems] = useState<{ type: 'password' | 'note' | 'contact'; id: string }[]>([]);
  const [itemPermissions, setItemPermissions] = useState<Record<string, { view: boolean; edit: boolean; delete: boolean }>>({});

  useEffect(() => {
    fetchTeams();
    fetchPasswords();
    fetchNotes();
    fetchContacts();
  }, []);

  const fetchTeams = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/teams', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setTeams(data);
      } else {
        showNotification('Failed to fetch teams', 'error');
      }
    } catch (error) {
      console.error('Error fetching teams:', error);
      showNotification('Error fetching teams', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchSharedItems = async (teamId: string) => {
    try {
      const response = await fetch(`/api/teams/${teamId}/shared-items`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setSharedItems(data);
      }
    } catch (error) {
      console.error('Error fetching shared items:', error);
    }
  };

  const fetchPasswords = async () => {
    try {
      const response = await fetch('/api/passwords', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (response.ok) {
        setPasswords(await response.json());
      }
    } catch (error) {
      // ignore
    }
  };

  const fetchNotes = async () => {
    const securityService = SecurityService.getInstance();
    const notes = await securityService.getSecureNotes();
    setNotes(notes);
  };

  const fetchContacts = () => {
    try {
      const storedContacts = localStorage.getItem('contacts');
      if (storedContacts) setContacts(JSON.parse(storedContacts));
    } catch {}
  };

  const handleCreateTeam = async () => {
    try {
      const response = await fetch('/api/teams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(newTeam),
      });
      
      if (response.ok) {
        const team = await response.json();
        setTeams([team, ...teams]);
        setCreateDialogOpen(false);
        setNewTeam({
          name: '',
          description: '',
          type: 'team',
          settings: {
            allowPasswordSharing: true,
            allowNoteSharing: true,
            allowContactSharing: true,
            requireApproval: false,
            maxMembers: 50,
          },
        });
        showNotification('Team created successfully!', 'success');
      } else {
        const error = await response.json();
        showNotification(error.message || 'Failed to create team', 'error');
      }
    } catch (error) {
      console.error('Error creating team:', error);
      showNotification('Error creating team', 'error');
    }
  };

  const handleInviteMember = async () => {
    if (!selectedTeam) return;
    
    try {
      const response = await fetch(`/api/teams/${selectedTeam._id}/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(inviteData),
      });
      
      if (response.ok) {
        const updatedTeam = await response.json();
        setTeams(teams.map(t => t._id === updatedTeam._id ? updatedTeam : t));
        setSelectedTeam(updatedTeam);
        setInviteDialogOpen(false);
        setInviteData({ email: '', role: 'member' });
        showNotification('Invitation sent successfully!', 'success');
      } else {
        const error = await response.json();
        showNotification(error.message || 'Failed to send invitation', 'error');
      }
    } catch (error) {
      console.error('Error inviting member:', error);
      showNotification('Error sending invitation', 'error');
    }
  };

  const handleAcceptInvitation = async (teamId: string) => {
    try {
      const response = await fetch(`/api/teams/${teamId}/invitation/accept`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      
      if (response.ok) {
        const updatedTeam = await response.json();
        setTeams(teams.map(t => t._id === updatedTeam._id ? updatedTeam : t));
        showNotification('Invitation accepted!', 'success');
      }
    } catch (error) {
      console.error('Error accepting invitation:', error);
      showNotification('Error accepting invitation', 'error');
    }
  };

  const handleDeclineInvitation = async (teamId: string) => {
    try {
      const response = await fetch(`/api/teams/${teamId}/invitation/decline`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      
      if (response.ok) {
        setTeams(teams.filter(t => t._id !== teamId));
        showNotification('Invitation declined', 'info');
      }
    } catch (error) {
      console.error('Error declining invitation:', error);
      showNotification('Error declining invitation', 'error');
    }
  };

  const getTeamIcon = (type: string) => {
    switch (type) {
      case 'family':
        return <FamilyIcon />;
      case 'organization':
        return <BusinessIcon />;
      default:
        return <GroupIcon />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner':
        return 'error';
      case 'admin':
        return 'warning';
      case 'member':
        return 'primary';
      case 'viewer':
        return 'default';
      default:
        return 'default';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted':
        return 'success';
      case 'pending':
        return 'warning';
      case 'declined':
        return 'error';
      default:
        return 'default';
    }
  };

  const getCurrentUserRole = (team: Team) => {
    const currentUserId = localStorage.getItem('userId');
    const member = team.members.find(m => m.user._id === currentUserId);
    return member?.role || null;
  };

  const canManageTeam = (team: Team) => {
    const role = getCurrentUserRole(team);
    return ['owner', 'admin'].includes(role || '');
  };

  const isOwner = (team: Team) => {
    const currentUserId = localStorage.getItem('userId');
    return team.owner._id === currentUserId;
  };

  const handleToggleItem = (type: 'password' | 'note' | 'contact', id: string) => {
    const key = `${type}:${id}`;
    setSelectedItems((prev) =>
      prev.some((item) => item.type === type && item.id === id)
        ? prev.filter((item) => !(item.type === type && item.id === id))
        : [...prev, { type, id }]
    );
    setItemPermissions((prev) =>
      prev[key]
        ? prev
        : { ...prev, [key]: { view: true, edit: false, delete: false } }
    );
  };

  const handlePermissionChange = (type: 'password' | 'note' | 'contact', id: string, perm: 'view' | 'edit' | 'delete') => {
    const key = `${type}:${id}`;
    setItemPermissions((prev) => ({
      ...prev,
      [key]: { ...prev[key], [perm]: !prev[key]?.[perm] },
    }));
  };

  const handleShareItems = async () => {
    if (!selectedTeam) return;
    for (const item of selectedItems) {
      const key = `${item.type}:${item.id}`;
      const perms = itemPermissions[key] || { view: true, edit: false, delete: false };
      let itemId = item.id;
      if (item.type === 'note') {
        // notes use id, backend expects _id
        const note = notes.find((n) => n.id === item.id);
        if (note) itemId = note.id;
      }
      if (item.type === 'contact') {
        // contacts use id, backend expects _id
        const contact = contacts.find((c) => c.id === item.id);
        if (contact) itemId = contact.id;
      }
      await fetch(`/api/teams/${selectedTeam._id}/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          itemType: item.type,
          itemId,
          permissions: perms,
        }),
      });
    }
    setShareDialogOpen(false);
    setSelectedItems([]);
    setItemPermissions({});
    showNotification('Items shared with team!', 'success');
    fetchSharedItems(selectedTeam._id);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <Typography>Loading teams...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Teams & Collaboration
        </Typography>
        <Tooltip title="Create New Team">
          <Fab
            color="primary"
            aria-label="add team"
            onClick={() => setCreateDialogOpen(true)}
          >
            <AddIcon />
          </Fab>
        </Tooltip>
      </Box>

      {teams.length === 0 ? (
        <Card sx={{ textAlign: 'center', py: 8 }}>
          <CardContent>
            <PeopleIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No Teams Yet
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Create your first team to start collaborating and sharing securely.
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setCreateDialogOpen(true)}
            >
              Create Team
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {teams.map((team) => (
            <Grid item xs={12} md={6} lg={4} key={team._id}>
              <Card 
                sx={{ 
                  cursor: 'pointer',
                  '&:hover': { boxShadow: 4 },
                  border: selectedTeam?._id === team._id ? 2 : 1,
                  borderColor: selectedTeam?._id === team._id ? 'primary.main' : 'divider'
                }}
                onClick={() => {
                  setSelectedTeam(team);
                  fetchSharedItems(team._id);
                  setTabValue(0);
                }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                      {getTeamIcon(team.type)}
                    </Avatar>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="h6" component="h2">
                        {team.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {team.type.charAt(0).toUpperCase() + team.type.slice(1)}
                      </Typography>
                    </Box>
                  </Box>
                  
                  {team.description && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {team.description}
                    </Typography>
                  )}
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Chip
                      label={`${team.members.filter(m => m.status === 'accepted').length} members`}
                      size="small"
                      icon={<PeopleIcon />}
                    />
                    <Box sx={{ ml: 'auto' }}>
                      <Chip
                        label={getCurrentUserRole(team) || 'pending'}
                        size="small"
                        color={getRoleColor(getCurrentUserRole(team) || '')}
                      />
                    </Box>
                  </Box>
                  
                  <Typography variant="caption" color="text.secondary">
                    Created by {team.owner.username}
                  </Typography>
                </CardContent>
                
                <CardActions sx={{ justifyContent: 'space-between' }}>
                  <Box>
                    {canManageTeam(team) && (
                      <>
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTeam(team);
                            setInviteDialogOpen(true);
                          }}
                        >
                          <PersonAddIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTeam(team);
                            setSettingsDialogOpen(true);
                          }}
                        >
                          <SettingsIcon />
                        </IconButton>
                      </>
                    )}
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedTeam(team);
                        setShareDialogOpen(true);
                      }}
                    >
                      <ShareIcon />
                    </IconButton>
                  </Box>
                  
                  {team.members.find(m => m.user._id === localStorage.getItem('userId'))?.status === 'pending' && (
                    <Box>
                      <IconButton
                        size="small"
                        color="success"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAcceptInvitation(team._id);
                        }}
                      >
                        <CheckIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeclineInvitation(team._id);
                        }}
                      >
                        <CloseIcon />
                      </IconButton>
                    </Box>
                  )}
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Selected Team Details */}
      {selectedTeam && (
        <Box sx={{ mt: 4 }}>
          <Card>
            <CardContent>
              <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
                  <Tab label="Members" />
                  <Tab label="Shared Items" />
                  <Tab label="Settings" />
                </Tabs>
              </Box>
              
              {tabValue === 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    Team Members
                  </Typography>
                  <List>
                    {selectedTeam.members.map((member, index) => (
                      <React.Fragment key={member.user._id}>
                        <ListItem>
                          <ListItemAvatar>
                            <Avatar>{member.user.username[0].toUpperCase()}</Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={member.user.username}
                            secondary={member.user.email}
                          />
                          <ListItemSecondaryAction>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Chip
                                label={member.role}
                                size="small"
                                color={getRoleColor(member.role)}
                              />
                              <Chip
                                label={member.status}
                                size="small"
                                color={getStatusColor(member.status)}
                              />
                            </Box>
                          </ListItemSecondaryAction>
                        </ListItem>
                        {index < selectedTeam.members.length - 1 && <Divider />}
                      </React.Fragment>
                    ))}
                  </List>
                </Box>
              )}
              
              {tabValue === 1 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    Shared Items
                  </Typography>
                  {sharedItems.length === 0 ? (
                    <Typography color="text.secondary">
                      No items shared yet.
                    </Typography>
                  ) : (
                    <List>
                      {sharedItems.map((item) => (
                        <ListItem key={item._id}>
                          <ListItemAvatar>
                            <Avatar>
                              {item.itemType === 'password' && <VisibilityIcon />}
                              {item.itemType === 'note' && <EditIcon />}
                              {item.itemType === 'contact' && <PeopleIcon />}
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={item.itemId.title || item.itemId.name || item.itemId.username || 'Untitled'}
                            secondary={`${item.itemType} • Shared by ${item.sharedBy.username}`}
                          />
                          <ListItemSecondaryAction>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                              {item.permissions.view && (
                                <Chip label="View" size="small" />
                              )}
                              {item.permissions.edit && (
                                <Chip label="Edit" size="small" color="primary" />
                              )}
                              {item.permissions.delete && (
                                <Chip label="Delete" size="small" color="warning" />
                              )}
                            </Box>
                          </ListItemSecondaryAction>
                        </ListItem>
                      ))}
                    </List>
                  )}
                </Box>
              )}
              
              {tabValue === 2 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    Team Settings
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={selectedTeam.settings.allowPasswordSharing}
                            disabled={!canManageTeam(selectedTeam)}
                          />
                        }
                        label="Allow Password Sharing"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={selectedTeam.settings.allowNoteSharing}
                            disabled={!canManageTeam(selectedTeam)}
                          />
                        }
                        label="Allow Note Sharing"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={selectedTeam.settings.allowContactSharing}
                            disabled={!canManageTeam(selectedTeam)}
                          />
                        }
                        label="Allow Contact Sharing"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={selectedTeam.settings.requireApproval}
                            disabled={!canManageTeam(selectedTeam)}
                          />
                        }
                        label="Require Approval"
                      />
                    </Grid>
                  </Grid>
                </Box>
              )}
            </CardContent>
          </Card>
        </Box>
      )}

      {/* Create Team Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Team</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Team Name"
            fullWidth
            value={newTeam.name}
            onChange={(e) => setNewTeam({ ...newTeam, name: e.target.value })}
          />
          <TextField
            margin="dense"
            label="Description"
            fullWidth
            multiline
            rows={3}
            value={newTeam.description}
            onChange={(e) => setNewTeam({ ...newTeam, description: e.target.value })}
          />
          <FormControl fullWidth margin="dense">
            <InputLabel>Team Type</InputLabel>
            <Select
              value={newTeam.type}
              onChange={(e) => setNewTeam({ ...newTeam, type: e.target.value as any })}
            >
              <MenuItem value="team">Team</MenuItem>
              <MenuItem value="family">Family</MenuItem>
              <MenuItem value="organization">Organization</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleCreateTeam} variant="contained" disabled={!newTeam.name}>
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Invite Member Dialog */}
      <Dialog open={inviteDialogOpen} onClose={() => setInviteDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Invite Member</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Email"
            type="email"
            fullWidth
            value={inviteData.email}
            onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
          />
          <FormControl fullWidth margin="dense">
            <InputLabel>Role</InputLabel>
            <Select
              value={inviteData.role}
              onChange={(e) => setInviteData({ ...inviteData, role: e.target.value as any })}
            >
              <MenuItem value="viewer">Viewer</MenuItem>
              <MenuItem value="member">Member</MenuItem>
              <MenuItem value="admin">Admin</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInviteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleInviteMember} variant="contained" disabled={!inviteData.email}>
            Invite
          </Button>
        </DialogActions>
      </Dialog>

      {/* Share Item Dialog */}
      <Dialog open={shareDialogOpen} onClose={() => setShareDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Share Items</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Select items to share with your team. You can control permissions for each item.
          </Alert>
          <Typography variant="h6" sx={{ mt: 2 }}>Passwords</Typography>
          <List>
            {passwords.map((pwd) => {
              const checked = selectedItems.some((item) => item.type === 'password' && item.id === pwd._id);
              const key = `password:${pwd._id}`;
              return (
                <ListItem key={pwd._id}>
                  <Checkbox checked={checked} onChange={() => handleToggleItem('password', pwd._id)} />
                  <ListItemText primary={pwd.title} secondary={pwd.username} />
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <FormControlLabel
                      control={<Checkbox checked={itemPermissions[key]?.view || false} onChange={() => handlePermissionChange('password', pwd._id, 'view')} />}
                      label="View"
                    />
                    <FormControlLabel
                      control={<Checkbox checked={itemPermissions[key]?.edit || false} onChange={() => handlePermissionChange('password', pwd._id, 'edit')} />}
                      label="Edit"
                    />
                    <FormControlLabel
                      control={<Checkbox checked={itemPermissions[key]?.delete || false} onChange={() => handlePermissionChange('password', pwd._id, 'delete')} />}
                      label="Delete"
                    />
                  </Box>
                </ListItem>
              );
            })}
          </List>
          <Typography variant="h6" sx={{ mt: 2 }}>Notes</Typography>
          <List>
            {notes.map((note) => {
              const checked = selectedItems.some((item) => item.type === 'note' && item.id === note.id);
              const key = `note:${note.id}`;
              return (
                <ListItem key={note.id}>
                  <Checkbox checked={checked} onChange={() => handleToggleItem('note', note.id)} />
                  <ListItemText primary={note.title} />
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <FormControlLabel
                      control={<Checkbox checked={itemPermissions[key]?.view || false} onChange={() => handlePermissionChange('note', note.id, 'view')} />}
                      label="View"
                    />
                    <FormControlLabel
                      control={<Checkbox checked={itemPermissions[key]?.edit || false} onChange={() => handlePermissionChange('note', note.id, 'edit')} />}
                      label="Edit"
                    />
                    <FormControlLabel
                      control={<Checkbox checked={itemPermissions[key]?.delete || false} onChange={() => handlePermissionChange('note', note.id, 'delete')} />}
                      label="Delete"
                    />
                  </Box>
                </ListItem>
              );
            })}
          </List>
          <Typography variant="h6" sx={{ mt: 2 }}>Contacts</Typography>
          <List>
            {contacts.map((contact) => {
              const checked = selectedItems.some((item) => item.type === 'contact' && item.id === contact.id);
              const key = `contact:${contact.id}`;
              return (
                <ListItem key={contact.id}>
                  <Checkbox checked={checked} onChange={() => handleToggleItem('contact', contact.id)} />
                  <ListItemText primary={contact.name} secondary={contact.email} />
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <FormControlLabel
                      control={<Checkbox checked={itemPermissions[key]?.view || false} onChange={() => handlePermissionChange('contact', contact.id, 'view')} />}
                      label="View"
                    />
                    <FormControlLabel
                      control={<Checkbox checked={itemPermissions[key]?.edit || false} onChange={() => handlePermissionChange('contact', contact.id, 'edit')} />}
                      label="Edit"
                    />
                    <FormControlLabel
                      control={<Checkbox checked={itemPermissions[key]?.delete || false} onChange={() => handlePermissionChange('contact', contact.id, 'delete')} />}
                      label="Delete"
                    />
                  </Box>
                </ListItem>
              );
            })}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShareDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleShareItems} variant="contained" disabled={selectedItems.length === 0}>Share</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Teams; 