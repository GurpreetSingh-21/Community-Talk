// backend/routes/directMessageRoutes.js
const express       = require("express");
const router        = express.Router();
const DirectMessage = require("../models/DirectMessage");
const Person        = require("../person");
const authenticate  = require("../middleware/authenticate");

// All direct-message routes require a valid JWT
router.use(authenticate);

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
    .sort("timestamp");

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
    const from    = req.user.id;
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
      _id:        dm._id,
      from:       dm.from,
      to:         dm.to,
      content:    dm.content,
      timestamp:  dm.timestamp,
      senderName: sender.fullName
    };

    // Emit to recipient’s room
    req.io.to(to).emit("receive_direct_message", payload);
    // (Optionally) emit back to sender’s room so they see it too
    req.io.to(from).emit("receive_direct_message", payload);

    // Return enriched payload
    return res.status(201).json(payload);

  } catch (err) {
    console.error("DirectMessage POST error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;