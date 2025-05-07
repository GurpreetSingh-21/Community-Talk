// backend/routes/directMessageRoutes.js
const express       = require("express");
const router        = express.Router();
const DirectMessage = require("../models/DirectMessage");
const Person        = require("../person");
const authenticate  = require("../middleware/authenticate");

// All direct-message routes require a valid JWT
router.use(authenticate);

/**
 * GET /api/direct-messages
 * Returns a list of all 1-on-1 conversations for the current user,
 * each with the partner’s id, fullName, lastMessage, and lastTimestamp,
 * sorted most-recent-first.
 */
router.get("/", async (req, res) => {
  try {
    const me = req.user.id;

    // fetch all DMs involving me, newest first
    const all = await DirectMessage.find({
      $or: [{ from: me }, { to: me }]
    })
    .sort({ timestamp: -1 });

    const seen = new Set();
    const convos = [];

    // walk through, keep first occurrence per partner
    for (let dm of all) {
      const partnerId = dm.from.toString() === me
        ? dm.to.toString()
        : dm.from.toString();
      if (seen.has(partnerId)) continue;
      seen.add(partnerId);

      // lookup partner's name
      const person = await Person.findById(partnerId).select("fullName");
      convos.push({
        _id:           partnerId,
        fullName:      person.fullName,
        lastMessage:   dm.content,
        lastTimestamp: dm.timestamp
      });
    }

    return res.json(convos);
  } catch (err) {
    console.error("DirectMessage LIST error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

/**
 * GET /api/direct-messages/:memberId
 * Returns the 1-on-1 history between the current user (req.user.id) and :memberId
 */
router.get("/:memberId", async (req, res) => {
  try {
    const me   = req.user.id;
    const them = req.params.memberId;

    const history = await DirectMessage.find({
      $or: [
        { from: me,   to: them },
        { from: them, to: me   }
      ]
    })
    .sort({ timestamp: 1 });

    return res.json(history);
  } catch (err) {
    console.error("DirectMessage GET error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

/**
 * POST /api/direct-messages
 * Body: { to: "<recipientId>", content: "..." }
 * Creates a new DM from req.user.id → req.body.to
 */
router.post("/", async (req, res) => {
  try {
    const from           = req.user.id;
    const { to, content } = req.body;

    if (!to || !content) {
      return res
        .status(400)
        .json({ error: "Recipient (to) and content required" });
    }

    // Verify recipient exists
    const recipient = await Person.findById(to);
    if (!recipient) {
      return res.status(404).json({ error: "Recipient not found" });
    }

    // Save to DB
    const dm = await new DirectMessage({ from, to, content }).save();

    // Lookup sender’s fullName
    const sender = await Person.findById(from).select("fullName");

    // Build enriched payload
    const payload = {
      _id:         dm._id,
      from:        dm.from,
      to:          dm.to,
      content:     dm.content,
      timestamp:   dm.timestamp,
      senderName:  sender.fullName
    };

    // Emit to recipient’s room
    req.io.to(to).emit("receive_direct_message", payload);
    // Also echo back to sender
    req.io.to(from).emit("receive_direct_message", payload);

    // Return enriched payload
    return res.status(201).json(payload);
  } catch (err) {
    console.error("DirectMessage POST error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;