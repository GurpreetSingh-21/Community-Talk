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
 * Returns a plain array of members for the selected community.
 * Query:
 *   ?q=term                (search by name/email)
 *   ?status=online|offline (filter by presence)
 */
router.get("/:communityId", async (req, res) => {
  try {
    const { communityId } = req.params;
    if (!mongoose.isValidObjectId(communityId)) {
      return res.status(400).json({ error: "Invalid communityId" });
    }

    const q = (req.query.q || "").trim();
    const statusFilter = (req.query.status || "").toLowerCase();

// 1) Find members for just this community and populate Person
const membersRaw = await Member.find({ communityId })
  .select("_id person name email status avatar communityId")
  .populate({
    path: "person",
    model: "Person",
    select: "_id fullName email avatar",
  })
  .sort({ name: 1, _id: 1 })
  .lean();

// 2) Build quick map for presence
const onlineUsers = new Set(req.presence.listOnlineInCommunity(communityId));

// 3) Normalize member objects
const normalized = membersRaw.map((m) => {
  const p = m.person || null;

  const displayName =
    (m.name || (p && p.fullName) || "").trim() ||
    (m.email || (p && p.email) || "").trim() ||
    "User";

  const email = (m.email || (p && p.email) || "").trim() || undefined;
  const avatar = m.avatar || (p && p.avatar) || "/default-avatar.png";

  const personId = String(p?._id || m.person || "");
  const isOnline = personId && onlineUsers.has(personId);
  const liveStatus = isOnline ? "online" : "offline";

  return {
    _id: m._id,
    person: personId || null,
    community: m.communityId,
    fullName: displayName,
    email,
    avatar,
    status: liveStatus,
    isYou: personId === String(req.user.id),
  };
});

    // 4) Filter by presence if requested
    const byPresence =
      statusFilter === "online" || statusFilter === "offline"
        ? normalized.filter((x) => x.status === statusFilter)
        : normalized;

    // 5) Filter by search term
    const rx = q ? new RegExp(q, "i") : null;
    const finalList = rx
      ? byPresence.filter(
          (x) => rx.test(x.fullName || "") || rx.test(x.email || "")
        )
      : byPresence;

    return res.json(finalList);
  } catch (error) {
    console.error("GET /api/members/:communityId error:", error);
    return res.status(500).json({ error: "Server Error" });
  }
});

/**
 * POST /api/members
 * Join (or upsert) the current user into a community.
 * Body: { communityId, name?, avatar? }
 */
router.post("/", async (req, res) => {
  try {
    const { communityId, name, avatar } = req.body || {};
    if (!communityId || !mongoose.isValidObjectId(communityId)) {
      return res.status(400).json({ error: "Valid communityId is required" });
    }

    const community = await Community.findById(communityId)
      .select("_id")
      .lean();
    if (!community) {
      return res.status(404).json({ error: "Community not found" });
    }

    const me = await Person.findById(req.user.id)
      .select("_id fullName email avatar")
      .lean();
    if (!me) {
      return res.status(401).json({ error: "User not found" });
    }

    const updated = await Member.findOneAndUpdate(
      { person: me._id, communityId },
      {
        $setOnInsert: { person: me._id, communityId },
        $set: {
          name: (name || me.fullName || me.email || "User").trim(),
          email: me.email,
          avatar: avatar || me.avatar || "/default-avatar.png",
        },
      },
      { new: true, upsert: true }
    )
      .select("_id person name email status avatar communityId")
      .lean();

    return res.status(201).json(updated);
  } catch (error) {
    console.error("POST /api/members error:", error);
    return res.status(500).json({ error: "Server Error" });
  }
});

/**
 * PATCH /api/members/:memberId
 * Update your own membership record (name, avatar, optional manual status).
 * Body: { name?, avatar?, status? }
 */
router.patch("/:memberId", async (req, res) => {
  try {
    const { memberId } = req.params;
    if (!mongoose.isValidObjectId(memberId)) {
      return res.status(400).json({ error: "Invalid memberId" });
    }

    const { name, avatar, status } = req.body || {};
    const $set = {};
    if (typeof name === "string") $set.name = name.trim();
    if (typeof avatar === "string") $set.avatar = avatar.trim();
    if (typeof status === "string" && ["online", "offline"].includes(status)) {
      $set.status = status;
    }

    if (!Object.keys($set).length) {
      return res.status(400).json({ error: "No valid fields to update" });
    }

    const member = await Member.findOneAndUpdate(
      { _id: memberId, person: req.user.id },
      { $set },
      { new: true }
    )
      .select("_id person name email status avatar communityId")
      .lean();

    if (!member) {
      return res
        .status(404)
        .json({ error: "Member not found or not owned by you" });
    }

    return res.json(member);
  } catch (error) {
    console.error("PATCH /api/members/:memberId error:", error);
    return res.status(500).json({ error: "Server Error" });
  }
});

/**
 * DELETE /api/members/:memberId
 * Remove your membership.
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
      return res
        .status(404)
        .json({ error: "Member not found or not owned by you" });
    }

    return res.json({ message: "Member removed" });
  } catch (error) {
    console.error("DELETE /api/members/:memberId error:", error);
    return res.status(500).json({ error: "Server Error" });
  }
});

module.exports = router;