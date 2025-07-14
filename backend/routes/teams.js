const express = require('express');
const router = express.Router();
const Team = require('../models/Team');
const SharedItem = require('../models/SharedItem');
const Password = require('../models/Password');
const SecureNote = require('../models/SecureNote');
const Contact = require('../models/Contact');

// Middleware to check if user is authenticated
const requireAuth = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  next();
};

// Get all teams for the current user
router.get('/', requireAuth, async (req, res) => {
  try {
    const teams = await Team.find({
      $or: [
        { owner: req.user.id },
        { 'members.user': req.user.id, 'members.status': 'accepted' }
      ]
    })
    .populate('owner', 'username email')
    .populate('members.user', 'username email')
    .populate('members.invitedBy', 'username email')
    .sort({ updatedAt: -1 });

    res.json(teams);
  } catch (error) {
    console.error('Error fetching teams:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create a new team
router.post('/', requireAuth, async (req, res) => {
  try {
    const { name, description, type, settings } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Team name is required' });
    }

    const team = new Team({
      name,
      description,
      type: type || 'team',
      owner: req.user.id,
      settings: settings || {},
      members: [{
        user: req.user.id,
        role: 'owner',
        status: 'accepted',
        joinedAt: Date.now()
      }]
    });

    await team.save();
    
    const populatedTeam = await Team.findById(team._id)
      .populate('owner', 'username email')
      .populate('members.user', 'username email');

    res.status(201).json(populatedTeam);
  } catch (error) {
    console.error('Error creating team:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get a specific team
router.get('/:teamId', requireAuth, async (req, res) => {
  try {
    const team = await Team.findById(req.params.teamId)
      .populate('owner', 'username email')
      .populate('members.user', 'username email')
      .populate('members.invitedBy', 'username email');

    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    // Check if user is a member
    const isMember = team.members.some(m => 
      m.user._id.toString() === req.user.id && m.status === 'accepted'
    );
    const isOwner = team.owner._id.toString() === req.user.id;

    if (!isMember && !isOwner) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(team);
  } catch (error) {
    console.error('Error fetching team:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update team settings
router.put('/:teamId', requireAuth, async (req, res) => {
  try {
    const team = await Team.findById(req.params.teamId);
    
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    // Check if user is owner or admin
    const userRole = team.getUserRole(req.user.id);
    if (!['owner', 'admin'].includes(userRole)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    const { name, description, settings } = req.body;
    
    if (name) team.name = name;
    if (description !== undefined) team.description = description;
    if (settings) team.settings = { ...team.settings, ...settings };

    await team.save();
    
    const updatedTeam = await Team.findById(team._id)
      .populate('owner', 'username email')
      .populate('members.user', 'username email');

    res.json(updatedTeam);
  } catch (error) {
    console.error('Error updating team:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Invite member to team
router.post('/:teamId/invite', requireAuth, async (req, res) => {
  try {
    const { email, role = 'member' } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const team = await Team.findById(req.params.teamId);
    
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    // Check if user can invite (owner or admin)
    const userRole = team.getUserRole(req.user.id);
    if (!['owner', 'admin'].includes(userRole)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    // Find user by email (you might need to adjust this based on your User model)
    const User = require('../models/User');
    const invitedUser = await User.findOne({ email });
    
    if (!invitedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if user is already a member
    const existingMember = team.members.find(m => m.user.toString() === invitedUser._id.toString());
    if (existingMember && existingMember.status === 'accepted') {
      return res.status(400).json({ message: 'User is already a member' });
    }

    await team.addMember(invitedUser._id, role, req.user.id);
    
    const updatedTeam = await Team.findById(team._id)
      .populate('owner', 'username email')
      .populate('members.user', 'username email');

    res.json(updatedTeam);
  } catch (error) {
    console.error('Error inviting member:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Accept/decline team invitation
router.put('/:teamId/invitation/:action', requireAuth, async (req, res) => {
  try {
    const { action } = req.params; // 'accept' or 'decline'
    
    if (!['accept', 'decline'].includes(action)) {
      return res.status(400).json({ message: 'Invalid action' });
    }

    const team = await Team.findById(req.params.teamId);
    
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    const member = team.members.find(m => m.user.toString() === req.user.id);
    
    if (!member) {
      return res.status(404).json({ message: 'Invitation not found' });
    }

    if (action === 'accept') {
      member.status = 'accepted';
      member.joinedAt = Date.now();
    } else {
      member.status = 'declined';
    }

    await team.save();
    
    const updatedTeam = await Team.findById(team._id)
      .populate('owner', 'username email')
      .populate('members.user', 'username email');

    res.json(updatedTeam);
  } catch (error) {
    console.error('Error updating invitation:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Remove member from team
router.delete('/:teamId/members/:userId', requireAuth, async (req, res) => {
  try {
    const team = await Team.findById(req.params.teamId);
    
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    // Check if user can remove members (owner or admin)
    const userRole = team.getUserRole(req.user.id);
    if (!['owner', 'admin'].includes(userRole)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    // Owner cannot remove themselves
    if (req.params.userId === req.user.id) {
      return res.status(400).json({ message: 'Cannot remove yourself from team' });
    }

    await team.removeMember(req.params.userId);
    
    const updatedTeam = await Team.findById(team._id)
      .populate('owner', 'username email')
      .populate('members.user', 'username email');

    res.json(updatedTeam);
  } catch (error) {
    console.error('Error removing member:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Share an item with the team
router.post('/:teamId/share', requireAuth, async (req, res) => {
  try {
    const { itemType, itemId, permissions, accessControl, allowedRoles, allowedUsers } = req.body;
    
    if (!itemType || !itemId) {
      return res.status(400).json({ message: 'Item type and ID are required' });
    }

    const team = await Team.findById(req.params.teamId);
    
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    // Check if user is a member
    const userRole = team.getUserRole(req.user.id);
    if (!userRole) {
      return res.status(403).json({ message: 'Not a team member' });
    }

    // Verify item exists and belongs to user
    let item;
    switch (itemType) {
      case 'password':
        item = await Password.findOne({ _id: itemId, user: req.user.id });
        break;
      case 'note':
        item = await SecureNote.findOne({ _id: itemId, user: req.user.id });
        break;
      case 'contact':
        item = await Contact.findOne({ _id: itemId, user: req.user.id });
        break;
      default:
        return res.status(400).json({ message: 'Invalid item type' });
    }

    if (!item) {
      return res.status(404).json({ message: 'Item not found or access denied' });
    }

    // Check if already shared
    const existingShare = await SharedItem.findOne({
      itemType,
      itemId,
      team: req.params.teamId,
      isActive: true
    });

    if (existingShare) {
      return res.status(400).json({ message: 'Item is already shared with this team' });
    }

    const sharedItem = new SharedItem({
      itemType,
      itemId,
      team: req.params.teamId,
      sharedBy: req.user.id,
      permissions: permissions || { view: true, edit: false, delete: false, share: false },
      accessControl: accessControl || 'team',
      allowedRoles: allowedRoles || [],
      allowedUsers: allowedUsers || []
    });

    await sharedItem.save();
    
    const populatedShare = await SharedItem.findById(sharedItem._id)
      .populate('itemId')
      .populate('sharedBy', 'username email');

    res.status(201).json(populatedShare);
  } catch (error) {
    console.error('Error sharing item:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get shared items for a team
router.get('/:teamId/shared-items', requireAuth, async (req, res) => {
  try {
    const team = await Team.findById(req.params.teamId);
    
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    // Check if user is a member
    const userRole = team.getUserRole(req.user.id);
    if (!userRole) {
      return res.status(403).json({ message: 'Not a team member' });
    }

    const sharedItems = await SharedItem.findAccessibleByUser(req.user.id, req.params.teamId, userRole);
    
    res.json(sharedItems);
  } catch (error) {
    console.error('Error fetching shared items:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update shared item permissions
router.put('/:teamId/shared-items/:itemId', requireAuth, async (req, res) => {
  try {
    const { permissions, accessControl, allowedRoles, allowedUsers } = req.body;

    const sharedItem = await SharedItem.findById(req.params.itemId);
    
    if (!sharedItem) {
      return res.status(404).json({ message: 'Shared item not found' });
    }

    // Check if user can modify (owner or shared by user)
    if (sharedItem.sharedBy.toString() !== req.user.id) {
      const team = await Team.findById(sharedItem.team);
      const userRole = team.getUserRole(req.user.id);
      if (!['owner', 'admin'].includes(userRole)) {
        return res.status(403).json({ message: 'Insufficient permissions' });
      }
    }

    if (permissions) {
      await sharedItem.updateTeamPermissions(permissions);
    }
    
    if (accessControl) sharedItem.accessControl = accessControl;
    if (allowedRoles) sharedItem.allowedRoles = allowedRoles;
    if (allowedUsers) sharedItem.allowedUsers = allowedUsers;

    await sharedItem.save();
    
    const updatedItem = await SharedItem.findById(sharedItem._id)
      .populate('itemId')
      .populate('sharedBy', 'username email');

    res.json(updatedItem);
  } catch (error) {
    console.error('Error updating shared item:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Remove shared item
router.delete('/:teamId/shared-items/:itemId', requireAuth, async (req, res) => {
  try {
    const sharedItem = await SharedItem.findById(req.params.itemId);
    
    if (!sharedItem) {
      return res.status(404).json({ message: 'Shared item not found' });
    }

    // Check if user can remove (owner or shared by user)
    if (sharedItem.sharedBy.toString() !== req.user.id) {
      const team = await Team.findById(sharedItem.team);
      const userRole = team.getUserRole(req.user.id);
      if (!['owner', 'admin'].includes(userRole)) {
        return res.status(403).json({ message: 'Insufficient permissions' });
      }
    }

    sharedItem.isActive = false;
    await sharedItem.save();

    res.json({ message: 'Item unshared successfully' });
  } catch (error) {
    console.error('Error removing shared item:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 