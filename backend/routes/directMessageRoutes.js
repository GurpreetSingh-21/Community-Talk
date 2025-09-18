// backend/routes/directMessageRoutes.js
const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

const DirectMessage = require("../models/DirectMessage");
const Person = require("../person");
const authenticate = require("../middleware/authenticate");

// All direct-message routes require a valid JWT
router.use(authenticate);

/**
 * GET /api/direct-messages
 * List all 1-on-1 conversations for the current user, newest-first,
 * with partner’s id, fullName, lastMessage, lastTimestamp.
 *
 * Optional query:
 *   ?q=term   (search partner name)
 *   ?limit=20 (default 50, max 100)
 */
router.get("/", async (req, res) => {
  try {
    const me = req.user.id;
    const q = (req.query.q || "").trim();
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 100);

    // Pipeline:
    // 1) match my messages
    // 2) sort newest first
    // 3) compute partnerId = from==me ? to : from
    // 4) group by partnerId, pick most recent message
    // 5) lookup partner Person to get fullName
    // 6) optional filter by q on fullName
    const items = await DirectMessage.aggregate([
      {
        $match: {
          $or: [{ from: new mongoose.Types.ObjectId(me) }, { to: new mongoose.Types.ObjectId(me) }],
        },
      },
      { $sort: { createdAt: -1, timestamp: -1 } }, // support either timestamps
      {
        $addFields: {
          partnerId: {
            $cond: [{ $eq: ["$from", new mongoose.Types.ObjectId(me)] }, "$to", "$from"],
          },
        },
      },
      {
        $group: {
          _id: "$partnerId",
          lastMessage: { $first: "$content" },
          lastTimestamp: { $first: { $ifNull: ["$createdAt", "$timestamp"] } },
        },
      },
      {
        $lookup: {
          from: "people", // collection name for Person model
          localField: "_id",
          foreignField: "_id",
          as: "partner",
        },
      },
      { $unwind: "$partner" },
      ...(q
        ? [
            {
              $match: {
                "partner.fullName": { $regex: new RegExp(q, "i") },
              },
            },
          ]
        : []),
      {
        $project: {
          _id: 1,
          fullName: "$partner.fullName",
          lastMessage: 1,
          lastTimestamp: 1,
        },
      },
      { $sort: { lastTimestamp: -1 } },
      { $limit: limit },
    ]);

    return res.json(items);
  } catch (err) {
    console.error("DirectMessage LIST error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

/**
 * GET /api/direct-messages/:memberId
 * Returns paginated 1-on-1 history between the current user and :memberId
 * Query:
 *   ?page=1&limit=50       (default page=1, limit=50, max 200)
 *   ?order=asc|desc        (default asc for UI-friendly)
 */
router.get("/:memberId", async (req, res) => {
  try {
    const me = req.user.id;
    const them = req.params.memberId;

    if (!mongoose.isValidObjectId(them)) {
      return res.status(400).json({ error: "Invalid memberId" });
    }

    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 200);
    const sortOrder = (req.query.order || "asc").toLowerCase() === "desc" ? -1 : 1;
    const skip = (page - 1) * limit;

    const filter = {
      $or: [
        { from: me, to: them },
        { from: them, to: me },
      ],
    };

    const [items, total] = await Promise.all([
      DirectMessage.find(filter)
        .sort({ createdAt: sortOrder, timestamp: sortOrder })
        .skip(skip)
        .limit(limit)
        .lean(),
      DirectMessage.countDocuments(filter),
    ]);

    return res.json({
      items,
      page,
      limit,
      total,
      pages: Math.ceil(total / limit) || 1,
    });
  } catch (err) {
    console.error("DirectMessage GET error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

/**
 * POST /api/direct-messages
 * Body: { to: "<recipientId>", content: "...", attachments?: [{ url, type, name, size }] }
 * Creates a new DM from req.user.id → req.body.to
 */
router.post("/", async (req, res) => {
  try {
    const from = req.user.id;
    const { to, content = "", attachments = [] } = req.body || {};

    if (!to) {
      return res.status(400).json({ error: "Recipient (to) is required" });
    }
    if (!mongoose.isValidObjectId(to)) {
      return res.status(400).json({ error: "Invalid recipient id" });
    }

    const text = String(content || "").trim();
    const hasText = text.length > 0;
    const hasAttachments = Array.isArray(attachments) && attachments.length > 0;

    if (!hasText && !hasAttachments) {
      return res.status(400).json({ error: "Message content or attachments required" });
    }
    if (text.length > 2000) {
      return res.status(400).json({ error: "Message exceeds 2000 characters" });
    }

    // Verify recipient exists
    const recipient = await Person.findById(to).select("_id").lean();
    if (!recipient) {
      return res.status(404).json({ error: "Recipient not found" });
    }

    // Save to DB
    const dm = await DirectMessage.create({
      from,
      to,
      content: text,
      attachments: hasAttachments
        ? attachments.map((a) => ({
            url: a.url,
            type: a.type,
            name: a.name,
            size: a.size,
          }))
        : [],
      status: "sent",
    });

    // Lookup sender’s fullName for payload nicety
    const sender = await Person.findById(from).select("fullName").lean();

    // Build enriched payload consistent with frontend expectations
    const payload = {
      _id: dm._id,
      from: dm.from,
      to: dm.to,
      content: dm.content,
      attachments: dm.attachments || [],
      timestamp: dm.createdAt || dm.timestamp,
      senderName: sender?.fullName || "Someone",
      status: dm.status,
    };

    // Emit to recipient and sender rooms
    req.io.to(String(to)).emit("receive_direct_message", payload);
    req.io.to(String(from)).emit("receive_direct_message", payload);

    return res.status(201).json(payload);
  } catch (err) {
    console.error("DirectMessage POST error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

/**
 * PATCH /api/direct-messages/:memberId/read
 * Mark all messages from :memberId → me as 'read'
 */
router.patch("/:memberId/read", async (req, res) => {
  try {
    const me = req.user.id;
    const them = req.params.memberId;

    if (!mongoose.isValidObjectId(them)) {
      return res.status(400).json({ error: "Invalid memberId" });
    }

    const result = await DirectMessage.updateMany(
      { from: them, to: me, status: { $ne: "read" } },
      { $set: { status: "read", editedAt: new Date() } }
    );

    // Optional: notify sender that their messages were read
    req.io.to(String(them)).emit("dm_read", { by: me });

    return res.json({ updated: result.modifiedCount || 0 });
  } catch (err) {
    console.error("DirectMessage READ error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;