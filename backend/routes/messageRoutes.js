const express = require("express");
const router = express.Router();
const Message = require("../models/Message");

// @route   POST /api/messages
// @desc    Create a new message
router.post("/", async (req, res) => {
  try {
    const { content, communityId } = req.body;

    if (!content || !communityId) {
      return res.status(400).json({ error: "Content and communityId are required" });
    }

    const newMessage = new Message({
      sender: "Anonymous", // temporary
      avatar: "/default-avatar.png",
      content,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      communityId
    });

    const savedMessage = await newMessage.save();

    // 📡 Emit message to all connected clients
    req.io.emit("receive_message", savedMessage);

    res.status(201).json(savedMessage);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server Error" });
  }
});

// @route   GET /api/messages/:communityId
// @desc    Get all messages for a community
router.get("/:communityId", async (req, res) => {
  try {
    const { communityId } = req.params;
    const messages = await Message.find({ communityId });
    res.status(200).json(messages);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server Error" });
  }
});

module.exports = router;