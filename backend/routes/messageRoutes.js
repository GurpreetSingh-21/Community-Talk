const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const Message = require("../models/Message");
const Person = require("../person");
const Community = require("../models/Community");

// Email domain → allowed community name mapping
const domainToCommunity = {
  "qmail.cuny.edu": "Queens College",
  "baruch.cuny.edu": "Baruch College",
  "sikhs.org": "Sikhs",
  "gmail.com": "YourTestCommunityName"  // ← adjust this if needed
};

// Middleware to check JWT token and attach user info
function authUser(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "Authorization header missing" });

  const token = authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Token missing" });

  try {
    req.user = jwt.verify(token, process.env.MY_SECRET_KEY);
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
}

router.use(authUser);

// POST /api/messages - Create a new message
router.post("/", async (req, res) => {
  try {
    const { content, communityId } = req.body;
    if (!content || !communityId) {
      return res.status(400).json({ error: "Content and communityId are required" });
    }

    const { email } = req.user;
    const person = await Person.findOne({ email });
    if (!person) return res.status(404).json({ error: "User not found" });

    const sender = person.fullName;
    const domain = email.split("@")[1];
    const allowedName = domainToCommunity[domain];
    if (!allowedName) return res.status(403).json({ error: "No community assigned for your domain" });

    const community = await Community.findById(communityId);
    if (
      !community ||
      allowedName.trim().toLowerCase() !== community.name.trim().toLowerCase()
    ) {
      console.log("Blocked: Domain mismatch →", { allowedName, communityName: community?.name });
      return res.status(403).json({ error: "Access denied to this community" });
    }

    const newMessage = new Message({
      sender,
      senderId: person._id,
      avatar: person.avatar || "/default-avatar.png",
      content,
      timestamp: new Date(),
      communityId
    });

    const savedMessage = await newMessage.save();
    req.io.emit("receive_message", savedMessage);
    res.status(201).json(savedMessage);

  } catch (error) {
    console.error("POST /api/messages error:", error);
    res.status(500).json({ error: "Server Error" });
  }
});

// GET /api/messages/:communityId - Fetch messages for a community
router.get("/:communityId", async (req, res) => {
  try {
    const { communityId } = req.params;
    const { email } = req.user;
    const domain = email.split("@")[1];
    const allowedName = domainToCommunity[domain];
    if (!allowedName) return res.status(403).json({ error: "No community assigned for your domain" });

    const community = await Community.findById(communityId);
    if (
      !community ||
      allowedName.trim().toLowerCase() !== community.name.trim().toLowerCase()
    ) {
      console.log("Blocked (GET): Domain mismatch →", { allowedName, communityName: community?.name });
      return res.status(403).json({ error: "Access denied to this community" });
    }

    const messages = await Message.find({ communityId });
    res.status(200).json(messages);

  } catch (error) {
    console.error("GET /api/messages/:id error:", error);
    res.status(500).json({ error: "Server Error" });
  }
});

module.exports = router;
