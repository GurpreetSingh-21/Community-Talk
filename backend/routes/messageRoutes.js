// backend/routes/messageRoutes.js

const express   = require("express");
const router    = express.Router();
const jwt       = require("jsonwebtoken");
const Message   = require("../models/Message");
const Person    = require("../person");
const Community = require("../models/Community");

// map email domains to community names
const domainToCommunity = {
  "qmail.cuny.edu":  "Queens College",
  "baruch.cuny.edu": "Baruch College",
  "sikhs.org":       "Sikhs"
};

// ── authUser middleware ─────────────────────────────────────────────────────────
function authUser(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "Authorization header missing" });
  }
  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ error: "Token missing" });
  }
  try {
    req.user = jwt.verify(token, process.env.MY_SECRET_KEY);
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
}

router.use(authUser);

// ── POST /api/messages ─────────────────────────────────────────────────────────
// Create a new group‐message
router.post("/", async (req, res) => {
  try {
    const { content, communityId } = req.body;
    if (!content || !communityId) {
      return res.status(400).json({ error: "Content and communityId are required" });
    }

    // look up user
    const { email } = req.user;
    const person = await Person.findOne({ email });
    if (!person) return res.status(404).json({ error: "User not found" });

    // check domain → community mapping
    const domain           = email.split("@")[1].toLowerCase();
    const allowedCommunity = domainToCommunity[domain];
    if (!allowedCommunity) {
      return res.status(403).json({ error: "Your email domain cannot post here" });
    }

    // verify they’re posting to the right community
    const community = await Community.findById(communityId);
    if (
      !community ||
      community.name.trim().toLowerCase() !== allowedCommunity.toLowerCase()
    ) {
      return res.status(403).json({ error: "Access denied to this community" });
    }

    // create & save
    const newMessage = new Message({
      sender:    person.fullName,
      senderId:  person._id,
      avatar:    person.avatar || "/default-avatar.png",
      content,
      timestamp: new Date(),
      communityId
    });
    const saved = await newMessage.save();

    // emit to all connected sockets
    req.io.emit("receive_message", saved);

    res.status(201).json(saved);

  } catch (error) {
    console.error("POST /api/messages error:", error);
    res.status(500).json({ error: "Server Error" });
  }
});

// ── GET /api/messages/:communityId ─────────────────────────────────────────────
// Fetch all messages for one community (with same domain‐check)
router.get("/:communityId", async (req, res) => {
  try {
    const { communityId } = req.params;
    const { email }       = req.user;

    const domain           = email.split("@")[1].toLowerCase();
    const allowedCommunity = domainToCommunity[domain];
    if (!allowedCommunity) {
      return res.status(403).json({ error: "Your email domain cannot read here" });
    }

    const community = await Community.findById(communityId);
    if (
      !community ||
      community.name.trim().toLowerCase() !== allowedCommunity.toLowerCase()
    ) {
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