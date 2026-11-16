const express = require('express');
const { body, validationResult } = require('express-validator');
const Contact = require('../models/Contact');
const Analytics = require('../models/Analytics');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get all contacts for user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const contacts = await Contact.find({ userId: req.user.userId })
      .sort({ updatedAt: -1 });
    res.json(contacts);
  } catch (error) {
    console.error('Get contacts error:', error);
    res.status(500).json({ message: 'Error fetching contacts' });
  }
});

// Create new contact
router.post('/', authenticateToken, [
  body('firstName').notEmpty().trim(),
  body('email').optional().isEmail().normalizeEmail()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const contactData = {
      ...req.body,
      userId: req.user.userId
    };

    const contact = new Contact(contactData);
    await contact.save();

    res.status(201).json(contact);
  } catch (error) {
    console.error('Create contact error:', error);
    res.status(500).json({ message: 'Error creating contact' });
  }
});

// Update contact
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const contact = await Contact.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.userId },
      req.body,
      { new: true }
    );

    if (!contact) {
      return res.status(404).json({ message: 'Contact not found' });
    }

    res.json(contact);
  } catch (error) {
    console.error('Update contact error:', error);
    res.status(500).json({ message: 'Error updating contact' });
  }
});

// Delete contact
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const contact = await Contact.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.userId
    });

    if (!contact) {
      return res.status(404).json({ message: 'Contact not found' });
    }

    res.json({ message: 'Contact deleted successfully' });
  } catch (error) {
    console.error('Delete contact error:', error);
    res.status(500).json({ message: 'Error deleting contact' });
  }
});

module.exports = router;
