// backend/routes/memberRoutes.js

const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

const Member = require("../models/Member");
const Community = require("../models/Community");
const Person = require("../person");
const authenticate = require("../middleware/authenticate");

// All member routes are protected
router.use(authenticate);

/**
 * GET /api/members/:communityId
 * List members in a community (paginated).
 * Query:
 *   ?q=term          (search by name/email)
 *   ?status=online|offline
 *   ?page=1&limit=50 (max 200)
 * Returns: { items, page, limit, total, pages }
 */
router.get("/:communityId", async (req, res) => {
  try {
    const { communityId } = req.params;
    if (!mongoose.isValidObjectId(communityId)) {
      return res.status(400).json({ error: "Invalid communityId" });
    }

    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 200);
    const skip = (page - 1) * limit;
    const q = (req.query.q || "").trim();
    const status = (req.query.status || "").toLowerCase();

    const filter = { community: communityId };
    if (q) {
      filter.$or = [
        { fullName: { $regex: new RegExp(q, "i") } },
        { email: { $regex: new RegExp(q, "i") } },
      ];
    }
    if (["online", "offline"].includes(status)) {
      filter.status = status;
    }

    const [items, total] = await Promise.all([
      Member.find(filter)
        .select("_id person fullName email status avatar community")
        .sort({ fullName: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Member.countDocuments(filter),
    ]);

    const myId = String(req.user.id);
    const enriched = items.map((m) => ({
      ...m,
      isYou: String(m.person) === myId,
    }));

    return res.json({
      items: enriched,
      page,
      limit,
      total,
      pages: Math.ceil(total / limit) || 1,
    });
  } catch (error) {
    console.error("GET /api/members/:communityId error:", error);
    return res.status(500).json({ error: "Server Error" });
  }
});

/**
 * POST /api/members
 * Join (or upsert) the current user into a community.
 * Body: { communityId, name?, avatar? }
 * - Idempotent: if membership exists, returns it.
 */
router.post("/", async (req, res) => {
  try {
    const { communityId, name, avatar } = req.body || {};
    if (!communityId || !mongoose.isValidObjectId(communityId)) {
      return res.status(400).json({ error: "Valid communityId is required" });
    }

    // Ensure community exists
    const community = await Community.findById(communityId).select("_id").lean();
    if (!community) {
      return res.status(404).json({ error: "Community not found" });
    }

    // Get current user
    const me = await Person.findById(req.user.id)
      .select("_id fullName email")
      .lean();
    if (!me) {
      return res.status(401).json({ error: "User not found" });
    }

    // Upsert membership (one per person per community)
    const updated = await Member.findOneAndUpdate(
      { person: me._id, community: communityId },
      {
        $setOnInsert: {
          person: me._id,
          community: communityId,
        },
        $set: {
          fullName: (name || me.fullName || "").trim() || me.email,
          email: me.email,
          avatar: avatar || undefined,
        },
      },
      { new: true, upsert: true }
    )
      .select("_id person fullName email status avatar community")
      .lean();

    return res.status(201).json(updated);
  } catch (error) {
    console.error("POST /api/members error:", error);
    return res.status(500).json({ error: "Server Error" });
  }
});

/**
 * PATCH /api/members/:memberId
 * Update your own membership record (name, avatar, status).
 * Body: { name?, avatar?, status? }
 */
router.patch("/:memberId", async (req, res) => {
  try {
    const { memberId } = req.params;
    if (!mongoose.isValidObjectId(memberId)) {
      return res.status(400).json({ error: "Invalid memberId" });
    }

    const { name, avatar, status } = req.body || {};
    const allowed = {};
    if (typeof name === "string") allowed.fullName = name.trim();
    if (typeof avatar === "string") allowed.avatar = avatar.trim();
    if (typeof status === "string" && ["online", "offline"].includes(status)) {
      allowed.status = status;
    }

    if (!Object.keys(allowed).length) {
      return res.status(400).json({ error: "No valid fields to update" });
    }

    // Ensure user can only update their own Member row
    const member = await Member.findOneAndUpdate(
      { _id: memberId, person: req.user.id },
      { $set: allowed },
      { new: true }
    )
      .select("_id person fullName email status avatar community")
      .lean();

    if (!member) {
      return res.status(404).json({ error: "Member not found or not owned by you" });
    }

    return res.json(member);
  } catch (error) {
    console.error("PATCH /api/members/:memberId error:", error);
    return res.status(500).json({ error: "Server Error" });
  }
});

/**
 * DELETE /api/members/:memberId
 * Remove a membership (self-remove). Admin logic could be added later.
 */
router.delete("/:memberId", async (req, res) => {
  try {
    const { memberId } = req.params;
    if (!mongoose.isValidObjectId(memberId)) {
      return res.status(400).json({ error: "Invalid memberId" });
    }

    const removed = await Member.findOneAndDelete({
      _id: memberId,
      person: req.user.id,
    }).lean();

    if (!removed) {
      return res.status(404).json({ error: "Member not found or not owned by you" });
    }

    return res.json({ message: "Member removed" });
  } catch (error) {
    console.error("DELETE /api/members/:memberId error:", error);
    return res.status(500).json({ error: "Server Error" });
  }
});

module.exports = router;