import express from 'express';
import Team from '../models/Team.js';
import User from '../models/User.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { AuthRequest } from '../types/index.js';

const router = express.Router();

// Get all teams (admin and employees can view)
router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { page = 1, limit = 20, status, search } = req.query;
    const filter: any = {};

    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const teams = await Team.find(filter)
      .populate('createdBy', 'name email')
      .populate('members', 'name email role')
      .populate('leader', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Team.countDocuments(filter);

    res.json({
      teams,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit)),
        limit: Number(limit),
      },
    });
  } catch (error) {
    console.error('Get teams error:', error);
    res.status(500).json({ error: 'Failed to fetch teams' });
  }
});

// Create team (admin only)
router.post('/', authenticateToken, requireRole(['admin']), async (req: AuthRequest, res) => {
  try {
    const { name, description, members, leader } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Team name is required' });
    }

    // Check if team name already exists
    const existingTeam = await Team.findOne({ name: name.trim() });
    if (existingTeam) {
      return res.status(400).json({ error: 'Team name already exists' });
    }

    // Validate members exist
    if (members && members.length > 0) {
      const validMembers = await User.find({ _id: { $in: members } });
      if (validMembers.length !== members.length) {
        return res.status(400).json({ error: 'Some selected members do not exist' });
      }
    }

    // Validate leader exists and is in members list
    if (leader) {
      const leaderUser = await User.findById(leader);
      if (!leaderUser) {
        return res.status(400).json({ error: 'Selected leader does not exist' });
      }
      if (members && !members.includes(leader)) {
        return res.status(400).json({ error: 'Team leader must be a member of the team' });
      }
    }

    const team = new Team({
      name: name.trim(),
      description: description?.trim(),
      createdBy: req.user!._id,
      members: members || [],
      leader: leader || null
    });

    await team.save();

    const populatedTeam = await Team.findById(team._id)
      .populate('createdBy', 'name email')
      .populate('members', 'name email role')
      .populate('leader', 'name email');

    res.status(201).json(populatedTeam);
  } catch (error) {
    console.error('Create team error:', error);
    res.status(500).json({ error: 'Failed to create team' });
  }
});

// Get team by ID
router.get('/:teamId', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const team = await Team.findById(req.params.teamId)
      .populate('createdBy', 'name email')
      .populate('members', 'name email role phone status')
      .populate('leader', 'name email');

    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    res.json(team);
  } catch (error) {
    console.error('Get team error:', error);
    res.status(500).json({ error: 'Failed to fetch team' });
  }
});

// Update team (admin only)
router.put('/:teamId', authenticateToken, requireRole(['admin']), async (req: AuthRequest, res) => {
  try {
    const { name, description, members, leader, status } = req.body;
    const teamId = req.params.teamId;

    // Check if team name is taken by another team
    if (name) {
      const existingTeam = await Team.findOne({ name: name.trim(), _id: { $ne: teamId } });
      if (existingTeam) {
        return res.status(400).json({ error: 'Team name already exists' });
      }
    }

    // Validate members exist
    if (members && members.length > 0) {
      const validMembers = await User.find({ _id: { $in: members } });
      if (validMembers.length !== members.length) {
        return res.status(400).json({ error: 'Some selected members do not exist' });
      }
    }

    // Validate leader exists and is in members list
    if (leader) {
      const leaderUser = await User.findById(leader);
      if (!leaderUser) {
        return res.status(400).json({ error: 'Selected leader does not exist' });
      }
      if (members && !members.includes(leader)) {
        return res.status(400).json({ error: 'Team leader must be a member of the team' });
      }
    }

    const updateData: any = {};
    if (name) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description?.trim();
    if (members) updateData.members = members;
    if (leader !== undefined) updateData.leader = leader;
    if (status) updateData.status = status;

    const team = await Team.findByIdAndUpdate(
      teamId,
      updateData,
      { new: true, runValidators: true }
    )
      .populate('createdBy', 'name email')
      .populate('members', 'name email role')
      .populate('leader', 'name email');

    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    res.json(team);
  } catch (error) {
    console.error('Update team error:', error);
    res.status(500).json({ error: 'Failed to update team' });
  }
});

// Delete team (admin only)
router.delete('/:teamId', authenticateToken, requireRole(['admin']), async (req: AuthRequest, res) => {
  try {
    const team = await Team.findByIdAndDelete(req.params.teamId);
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    res.json({ message: 'Team deleted successfully' });
  } catch (error) {
    console.error('Delete team error:', error);
    res.status(500).json({ error: 'Failed to delete team' });
  }
});

// Add member to team (admin only)
router.post('/:teamId/members', authenticateToken, requireRole(['admin']), async (req: AuthRequest, res) => {
  try {
    const { userId } = req.body;
    const teamId = req.params.teamId;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if team exists
    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    // Check if user is already a member
    if (team.members.includes(userId)) {
      return res.status(400).json({ error: 'User is already a member of this team' });
    }

    team.members.push(userId);
    await team.save();

    const updatedTeam = await Team.findById(teamId)
      .populate('createdBy', 'name email')
      .populate('members', 'name email role')
      .populate('leader', 'name email');

    res.json(updatedTeam);
  } catch (error) {
    console.error('Add team member error:', error);
    res.status(500).json({ error: 'Failed to add team member' });
  }
});

// Remove member from team (admin only)
router.delete('/:teamId/members/:userId', authenticateToken, requireRole(['admin']), async (req: AuthRequest, res) => {
  try {
    const { teamId, userId } = req.params;

    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    // Remove user from members
    team.members = team.members.filter(memberId => memberId.toString() !== userId);

    // If the user was the leader, remove them as leader
    if (team.leader && team.leader.toString() === userId) {
      team.leader = undefined;
    }

    await team.save();

    const updatedTeam = await Team.findById(teamId)
      .populate('createdBy', 'name email')
      .populate('members', 'name email role')
      .populate('leader', 'name email');

    res.json(updatedTeam);
  } catch (error) {
    console.error('Remove team member error:', error);
    res.status(500).json({ error: 'Failed to remove team member' });
  }
});

export default router;