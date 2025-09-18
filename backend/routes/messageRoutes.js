// backend/routes/messageRoutes.js
const express   = require("express");
const router    = express.Router();
const jwt       = require("jsonwebtoken");
const mongoose  = require("mongoose");
const Message   = require("../models/Message");
const Person    = require("../person");
const Community = require("../models/Community");

// map email domains to community names (adjust to your actual communities)
const domainToCommunity = {
  "qmail.cuny.edu":  "Queens College",
  "baruch.cuny.edu": "Baruch College",
  "sikhs.org":       "Sikhs",
};

// ── helpers ───────────────────────────────────────────────────────────────────
function authUser(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;
  if (!token) return res.status(401).json({ error: "Authorization token missing" });

  try {
    req.user = jwt.verify(token, process.env.MY_SECRET_KEY);
    return next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

function getAllowedCommunityName(email = "") {
  const domain = String(email.split("@")[1] || "").toLowerCase();
  return domainToCommunity[domain] || null;
}

const SKIP_DOMAIN_CHECK = String(process.env.SKIP_DOMAIN_CHECK || "").toLowerCase() === "true";

// All routes here require auth
router.use(authUser);

// ── POST /api/messages ───────────────────────────────────────────────────────
// Create a new group message
router.post("/", async (req, res) => {
  try {
    const { content, communityId } = req.body;

    // basic body validation
    if (!content || !communityId) {
      return res.status(400).json({ error: "Content and communityId are required" });
    }

    // check ObjectId
    if (!mongoose.isValidObjectId(communityId)) {
      return res.status(400).json({ error: "Invalid communityId" });
    }

    // find user
    const { email } = req.user;
    const person = await Person.findOne({ email }).lean();
    if (!person) return res.status(404).json({ error: "User not found" });

    // find community
    const community = await Community.findById(communityId).lean();
    if (!community) return res.status(404).json({ error: "Community not found" });

    // optional domain ↔ community gate
    if (!SKIP_DOMAIN_CHECK) {
      const allowed = getAllowedCommunityName(email);
      if (!allowed) {
        return res.status(403).json({ error: "Your email domain cannot post to any community" });
      }
      if (community.name.trim().toLowerCase() !== allowed.toLowerCase()) {
        return res.status(403).json({ error: "Access denied to this community" });
      }
    }

    const newMessage = new Message({
      sender:    person.fullName,
      senderId:  person._id,
      avatar:    person.avatar || "/default-avatar.png",
      content,
      timestamp: new Date(),
      communityId,
    });

    const saved = await newMessage.save();

    // broadcast to everyone (or later: to a community room)
    req.io?.emit("receive_message", {
      _id:        saved._id,
      sender:     saved.sender,
      senderId:   saved.senderId,
      avatar:     saved.avatar,
      content:    saved.content,
      timestamp:  saved.timestamp,
      communityId: String(saved.communityId),
    });

    return res.status(201).json(saved);
  } catch (error) {
    console.error("POST /api/messages error:", error);
    return res.status(500).json({ error: "Server Error" });
  }
});

// ── GET /api/messages/:communityId ───────────────────────────────────────────
// Fetch all messages for one community
router.get("/:communityId", async (req, res) => {
  try {
    const { communityId } = req.params;

    if (!mongoose.isValidObjectId(communityId)) {
      return res.status(400).json({ error: "Invalid communityId" });
    }

    const { email } = req.user;
    const community = await Community.findById(communityId).lean();
    if (!community) return res.status(404).json({ error: "Community not found" });

    if (!SKIP_DOMAIN_CHECK) {
      const allowed = getAllowedCommunityName(email);
      if (!allowed) {
        return res.status(403).json({ error: "Your email domain cannot read this community" });
      }
      if (community.name.trim().toLowerCase() !== allowed.toLowerCase()) {
        return res.status(403).json({ error: "Access denied to this community" });
      }
    }

    const messages = await Message.find({ communityId })
      .select("_id sender senderId avatar content timestamp communityId")
      .sort({ timestamp: 1 })
      .lean();

    return res.status(200).json(messages);
  } catch (error) {
    console.error("GET /api/messages/:communityId error:", error);
    return res.status(500).json({ error: "Server Error" });
  }
});

module.exports = router;