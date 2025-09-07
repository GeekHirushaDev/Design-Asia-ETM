const express = require('express');
const Team = require('../models/Team');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// @route   GET /api/teams
// @desc    Get user's teams
// @access  Private
router.get('/', asyncHandler(async (req, res) => {
  const teams = await Team.findUserTeams(req.user._id)
    .populate('lead', 'name email avatar')
    .populate('members.user', 'name email avatar');

  res.json({
    success: true,
    data: teams
  });
}));

module.exports = router;
