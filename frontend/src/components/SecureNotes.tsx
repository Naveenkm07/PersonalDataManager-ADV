import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Grid,
  Card,
  CardContent,
  CardActions,
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Lock as LockIcon,
  Tag as TagIcon,
} from '@mui/icons-material';
import { useFormik } from 'formik';
import * as yup from 'yup';
import { useNotification } from '../contexts/NotificationContext';
import SecurityService from '../services/SecurityService';

interface SecureNote {
  id: string;
  title: string;
  content: string;
  encrypted: boolean;
  createdAt: string;
  updatedAt: string;
  tags: string[];
}

const validationSchema = yup.object({
  title: yup.string().required('Title is required'),
  content: yup.string().required('Content is required'),
  tags: yup.string(),
});

const SecureNotes: React.FC = () => {
  const [notes, setNotes] = useState<SecureNote[]>([]);
  const [open, setOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<SecureNote | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const { showNotification } = useNotification();
  const securityService = SecurityService.getInstance();

  useEffect(() => {
    loadNotes();
  }, []);

  const loadNotes = () => {
    const loadedNotes = securityService.getSecureNotes();
    setNotes(loadedNotes);
  };

  const formik = useFormik({
    initialValues: {
      title: '',
      content: '',
      tags: '',
    },
    validationSchema,
    onSubmit: (values) => {
      const tags = values.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0);

      if (editingNote) {
        const updatedNote = securityService.updateSecureNote(
          editingNote.id,
          values.title,
          values.content,
          tags
        );
        if (updatedNote) {
          showNotification('Note updated successfully', 'success');
        }
      } else {
        securityService.createSecureNote(values.title, values.content, tags);
        showNotification('Note created successfully', 'success');
      }
      handleClose();
      loadNotes();
    },
  });

  const handleOpen = (note?: SecureNote) => {
    if (note) {
      setEditingNote(note);
      formik.setValues({
        title: note.title,
        content: note.content,
        tags: note.tags.join(', '),
      });
    } else {
      setEditingNote(null);
      formik.resetForm();
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingNote(null);
    formik.resetForm();
  };

  const handleDelete = (id: string) => {
    if (securityService.deleteSecureNote(id)) {
      showNotification('Note deleted successfully', 'success');
      loadNotes();
    }
  };

  const handleTagClick = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag)
        ? prev.filter((t) => t !== tag)
        : [...prev, tag]
    );
  };

  const filteredNotes = notes.filter((note) => {
    const matchesSearch =
      note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      note.content.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTags =
      selectedTags.length === 0 ||
      selectedTags.every((tag) => note.tags.includes(tag));
    
    return matchesSearch && matchesTags;
  });

  const allTags = Array.from(
    new Set(notes.flatMap((note) => note.tags))
  ).sort();

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">Secure Notes</Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => handleOpen()}
        >
          Add Note
        </Button>
      </Box>

      <Box sx={{ mb: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {allTags.map((tag) => (
                <Chip
                  key={tag}
                  label={tag}
                  onClick={() => handleTagClick(tag)}
                  color={selectedTags.includes(tag) ? 'primary' : 'default'}
                  icon={<TagIcon />}
                />
              ))}
            </Box>
          </Grid>
        </Grid>
      </Box>

      {filteredNotes.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography color="text.secondary">
            {searchTerm || selectedTags.length > 0
              ? 'No notes match your search'
              : 'No secure notes yet. Add one to get started!'}
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {filteredNotes.map((note) => (
            <Grid item xs={12} md={6} lg={4} key={note.id}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {note.title}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                    }}
                  >
                    {note.content}
                  </Typography>
                  <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {note.tags.map((tag) => (
                      <Chip
                        key={tag}
                        label={tag}
                        size="small"
                        icon={<TagIcon />}
                      />
                    ))}
                  </Box>
                </CardContent>
                <Divider />
                <CardActions>
                  <IconButton
                    size="small"
                    onClick={() => handleOpen(note)}
                    title="Edit"
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => handleDelete(note.id)}
                    title="Delete"
                  >
                    <DeleteIcon />
                  </IconButton>
                  <Box sx={{ flexGrow: 1 }} />
                  <Chip
                    size="small"
                    icon={<LockIcon />}
                    label="Encrypted"
                    color="primary"
                    variant="outlined"
                  />
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingNote ? 'Edit Secure Note' : 'Add Secure Note'}
        </DialogTitle>
        <form onSubmit={formik.handleSubmit}>
          <DialogContent>
            <TextField
              fullWidth
              margin="normal"
              name="title"
              label="Title"
              value={formik.values.title}
              onChange={formik.handleChange}
              error={formik.touched.title && Boolean(formik.errors.title)}
              helperText={formik.touched.title && formik.errors.title}
            />
            <TextField
              fullWidth
              margin="normal"
              name="content"
              label="Content"
              value={formik.values.content}
              onChange={formik.handleChange}
              error={formik.touched.content && Boolean(formik.errors.content)}
              helperText={formik.touched.content && formik.errors.content}
              multiline
              rows={4}
            />
            <TextField
              fullWidth
              margin="normal"
              name="tags"
              label="Tags (comma-separated)"
              value={formik.values.tags}
              onChange={formik.handleChange}
              helperText="Enter tags separated by commas"
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose}>Cancel</Button>
            <Button type="submit" variant="contained" color="primary">
              {editingNote ? 'Save Changes' : 'Add Note'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default SecureNotes; 