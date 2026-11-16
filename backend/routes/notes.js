const express = require('express');
const { body, validationResult } = require('express-validator');
const SecureNote = require('../models/SecureNote');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get all notes for user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const notes = await SecureNote.find({ userId: req.user.userId })
      .sort({ updatedAt: -1 });
    res.json(notes);
  } catch (error) {
    console.error('Get notes error:', error);
    res.status(500).json({ message: 'Error fetching notes' });
  }
});

// Create new note
router.post('/', authenticateToken, [
  body('title').notEmpty().trim(),
  body('content').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const noteData = {
      ...req.body,
      userId: req.user.userId
    };

    const note = new SecureNote(noteData);
    await note.save();

    res.status(201).json(note);
  } catch (error) {
    console.error('Create note error:', error);
    res.status(500).json({ message: 'Error creating note' });
  }
});

// Update note
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const note = await SecureNote.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.userId },
      req.body,
      { new: true }
    );

    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }

    res.json(note);
  } catch (error) {
    console.error('Update note error:', error);
    res.status(500).json({ message: 'Error updating note' });
  }
});

// Delete note
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const note = await SecureNote.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.userId
    });

    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }

    res.json({ message: 'Note deleted successfully' });
  } catch (error) {
    console.error('Delete note error:', error);
    res.status(500).json({ message: 'Error deleting note' });
  }
});

module.exports = router;
