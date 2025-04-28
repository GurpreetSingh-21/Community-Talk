const express = require('express');
const router = express.Router();
const Community = require('../models/Community');

// @route   POST /api/communities
// @desc    Create a new community
router.post('/', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Community name is required' });
    }

    const newCommunity = new Community({ name });
    const savedCommunity = await newCommunity.save();

    res.status(201).json(savedCommunity);
  } catch (error) {
    console.error(error);
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Community name already exists' });
    }
    res.status(500).json({ error: 'Server Error' });
  }
});

// @route   GET /api/communities
// @desc    Get all communities
router.get('/', async (req, res) => {
  try {
    const communities = await Community.find();
    res.status(200).json(communities);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server Error' });
  }
});


// @route   DELETE /api/communities/:id
// @desc    Delete a community by ID
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await Community.findByIdAndDelete(id);
    res.status(200).json({ message: 'Community deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});


module.exports = router;
