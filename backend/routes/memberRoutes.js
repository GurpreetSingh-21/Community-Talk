const express = require('express');
const router = express.Router();
const Member = require('../models/Member');

// @route   GET /api/members/:communityId
// @desc    Get all members of a specific community
router.get('/:communityId', async (req, res) => {
  try {
    const { communityId } = req.params;

    const members = await Member.find({ communityId });
    res.status(200).json(members);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server Error' });
  }
});

// @route   POST /api/members
// @desc    Create a new member for a community
router.post('/', async (req, res) => {
  try {
    const { name, communityId } = req.body;
    if (!name || !communityId) {
      return res.status(400).json({ error: 'Name and communityId are required' });
    }

    const newMember = new Member({ name, communityId });
    const savedMember = await newMember.save();

    res.status(201).json(savedMember);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server Error' });
  }
});

module.exports = router;
