const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const DirectMessage = require('../models/DirectMessage');


// POST - send a new DM
router.post('/', authenticate, async (req, res) => {
  const { receiverId, content } = req.body;
  const senderId = req.user._id;

  try {
    const message = new DirectMessage({ senderId, receiverId, content });
    await message.save();

    // ✅ Emit to receiver inside the route
    req.io.to(receiverId.toString()).emit("privateMessage", message);

    res.status(201).json(message);
  } catch (err) {
    res.status(500).json({ error: 'Failed to send message' });
  }
});


// GET - fetch all DMs between two users
router.get('/:user1Id/:user2Id', authenticate, async (req, res) => {
  const { user1Id, user2Id } = req.params;

  try {
    const messages = await DirectMessage.find({
      $or: [
        { senderId: user1Id, receiverId: user2Id },
        { senderId: user2Id, receiverId: user1Id }
      ]
    }).sort({ createdAt: 1 });

    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

module.exports = router;
