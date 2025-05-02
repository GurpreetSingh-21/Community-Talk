// backend/routes/messageRoutes.js

const express   = require("express");
const router    = express.Router();
const jwt       = require("jsonwebtoken");
const Message   = require("../models/Message");
const Person    = require("../person");            // your Person model
const Community = require("../models/Community");  // your Community model

// Map email domain → allowed community name
const domainToCommunity = {
  "qmail.cuny.edu": "Queens College",
  "baruch.cuny.edu": "Baruch College",
  "sikhs.org":       "Sikhs"
  // add more mappings here as needed
};

// Middleware: verify JWT & attach decoded payload to req.user
function authUser(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "Authorization header missing" });

  const token = authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Token missing" });

  try {
    // use MY_SECRET_KEY since that’s what your .env defines
    req.user = jwt.verify(token, process.env.MY_SECRET_KEY);
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
}

// Apply auth to all routes under /api/messages
router.use(authUser);

// @route   POST /api/messages
// @desc    Create a new message (only in your own college)
router.post("/", async (req, res) => {
  try {
    const { content, communityId } = req.body;
    if (!content || !communityId) {
      return res.status(400).json({ error: "Content and communityId are required" });
    }

    // 1️⃣ Lookup user by token
    const { email } = req.user;
    const person = await Person.findOne({ email });
    if (!person) {
      return res.status(404).json({ error: "User not found" });
    }
    const sender = person.fullName;

    // 2️⃣ Verify domain → community
    const domain       = email.split("@")[1];
    const allowedName  = domainToCommunity[domain];
    if (!allowedName) {
      return res.status(403).json({ error: "No community assigned for your email domain." });
    }

    const community = await Community.findById(communityId);
    if (!community || community.name !== allowedName) {
      return res.status(403).json({ error: "Access denied to this community." });
    }

    // 3️⃣ Create & save message
    const newMessage = new Message({
      sender,
      avatar: person.avatar || "/default-avatar.png",
      content,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      communityId
    });
    const savedMessage = await newMessage.save();

    // 4️⃣ Emit in real time
    req.io.emit("receive_message", savedMessage);

    res.status(201).json(savedMessage);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server Error" });
  }
});

// @route   GET /api/messages/:communityId
// @desc    Get all messages for a community (only your college)
router.get("/:communityId", async (req, res) => {
  try {
    const { communityId } = req.params;
    const { email } = req.user;

    // 1️⃣ Domain → community check
    const domain      = email.split("@")[1];
    const allowedName = domainToCommunity[domain];
    if (!allowedName) {
      return res.status(403).json({ error: "No community assigned for your email domain." });
    }

    // 2️⃣ Ensure requested community matches
    const community = await Community.findById(communityId);
    if (!community || community.name !== allowedName) {
      return res.status(403).json({ error: "Access denied to this community." });
    }

    // 3️⃣ Fetch & return messages
    const messages = await Message.find({ communityId });
    res.status(200).json(messages);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server Error" });
  }
});

module.exports = router;