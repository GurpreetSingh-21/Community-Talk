// backend/routes/communityRoutes.js

const express = require("express");
const router = express.Router();

const authenticate = require("../middleware/authenticate");
const Community = require("../models/Community");
const Member = require("../models/Member");
const Person = require("../person");

// All routes require a valid JWT (you also mount authenticate in server.js)
router.use(authenticate);

/**
 * POST /api/communities
 * Create a new community and make the creator the owner member.
 * Body: { name, description?, isPrivate?, tags?[] }
 */
router.post("/", async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { name, description = "", isPrivate = false, tags = [] } = req.body || {};

    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Community name is required" });
    }

    // Case-insensitive duplicate check to be friendly even if unique index differs
    const dup = await Community.findOne({
      name: { $regex: new RegExp(`^${name.trim()}$`, "i") },
    }).lean();

    if (dup) {
      return res.status(400).json({ error: "Community name already exists" });
    }

    // Ensure creator exists (optional but nice)
    const creator = await Person.findById(userId).select("fullName email").lean();
    if (!creator) {
      return res.status(404).json({ error: "Creator not found" });
    }

    // Create community
    const community = await Community.create({
      name: name.trim(),
      description: description?.trim() || "",
      createdBy: userId,
      isPrivate: !!isPrivate,
      tags: Array.isArray(tags) ? tags.slice(0, 10) : [],
      // members: we’ll track membership in Member collection
    });

    // Add creator as owner member
    await Member.create({
      user: userId,
      community: community._id,
      role: "owner",
      status: "online",
      permissions: { canPost: true, canDelete: true, canInvite: true },
    });

    // Minimal payload for compatibility + useful extras
    return res.status(201).json({
      _id: community._id,
      name: community.name,
      description: community.description,
      isPrivate: community.isPrivate,
      tags: community.tags || [],
      createdBy: community.createdBy,
      createdAt: community.createdAt,
      updatedAt: community.updatedAt,
    });
  } catch (error) {
    console.error("POST /api/communities error:", error);
    if (error?.code === 11000) {
      return res.status(400).json({ error: "Community name already exists" });
    }
    return res.status(500).json({ error: "Server Error" });
  }
});

/**
 * GET /api/communities
 * List communities with optional search and pagination
 * Query: ?q=term&page=1&limit=20
 */
router.get("/", async (req, res) => {
  try {
    // ── Query params ──────────────────────────────────────────────────────────
    const qRaw = (req.query.q || "").trim();
    const wantPaginated =
      String(req.query.paginated || "").toLowerCase() === "1" ||
      String(req.query.paginated || "").toLowerCase() === "true";

    // cap & sanitize pagination inputs
    const page  = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 100);
    const skip  = (page - 1) * limit;

    // ── Filter (only fields that actually exist on the schema) ───────────────
    // Community has: name, createdBy?, timestamps
    const filter = qRaw
      ? { name: { $regex: new RegExp(qRaw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") } }
      : {};

    // ── Paginated mode (opt-in) ──────────────────────────────────────────────
    if (wantPaginated) {
      const [items, total] = await Promise.all([
        Community.find(filter)
          .select("_id name createdBy createdAt updatedAt") // keep payload lean
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Community.countDocuments(filter),
      ]);

      return res.status(200).json({
        items,
        page,
        limit,
        total,
        pages: Math.max(Math.ceil(total / limit), 1),
      });
    }

    // ── Simple mode (default) ────────────────────────────────────────────────
    const items = await Community.find(filter)
      .select("_id name createdBy createdAt updatedAt")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json(items);
  } catch (error) {
    console.error("GET /api/communities error:", error);
    return res.status(500).json({ error: "Server Error" });
  }
});

/**
 * GET /api/communities/:id
 * Fetch one community
 */
router.get("/:id", async (req, res) => {
  try {
    const community = await Community.findById(req.params.id).lean();
    if (!community) {
      return res.status(404).json({ error: "Community not found" });
    }
    return res.status(200).json(community);
  } catch (error) {
    console.error("GET /api/communities/:id error:", error);
    return res.status(500).json({ error: "Server Error" });
  }
});

/**
 * PATCH /api/communities/:id
 * Update community (owner or admin)
 * Body: { name?, description?, isPrivate?, tags?[] }
 */
router.patch("/:id", async (req, res) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    const community = await Community.findById(id);
    if (!community) return res.status(404).json({ error: "Community not found" });

    // Must be owner or admin member
    const membership = await Member.findOne({ user: userId, community: id }).lean();
    const isOwnerOrAdmin = membership && ["owner", "admin"].includes(membership.role);
    if (!isOwnerOrAdmin) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }

    const updates = {};
    if (typeof req.body.name === "string" && req.body.name.trim()) {
      // Check duplicates
      const dup = await Community.findOne({
        _id: { $ne: id },
        name: { $regex: new RegExp(`^${req.body.name.trim()}$`, "i") },
      }).lean();
      if (dup) return res.status(400).json({ error: "Community name already exists" });
      updates.name = req.body.name.trim();
    }
    if (typeof req.body.description === "string") updates.description = req.body.description.trim();
    if (typeof req.body.isPrivate === "boolean") updates.isPrivate = req.body.isPrivate;
    if (Array.isArray(req.body.tags)) updates.tags = req.body.tags.slice(0, 10);

    const saved = await Community.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    }).lean();

    return res.status(200).json(saved);
  } catch (error) {
    console.error("PATCH /api/communities/:id error:", error);
    return res.status(500).json({ error: "Server Error" });
  }
});

/**
 * DELETE /api/communities/:id
 * Delete a community (owner only).
 * Also removes Member rows for that community. (Messages left as-is, or you can cascade elsewhere)
 */
router.delete("/:id", async (req, res) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    const community = await Community.findById(id);
    if (!community) return res.status(404).json({ error: "Community not found" });

    // Must be owner
    const membership = await Member.findOne({ user: userId, community: id }).lean();
    if (!membership || membership.role !== "owner") {
      return res.status(403).json({ error: "Only the owner can delete this community" });
    }

    await Promise.all([
      Community.findByIdAndDelete(id),
      Member.deleteMany({ community: id }),
      // Optionally: Message.deleteMany({ community: id }),
    ]);

    return res.status(200).json({ message: "Community deleted" });
  } catch (error) {
    console.error("DELETE /api/communities/:id error:", error);
    return res.status(500).json({ error: "Server error" });
  }
});

/**
 * POST /api/communities/:id/join
 * Join a community (idempotent)
 */
router.post("/:id/join", async (req, res) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    const community = await Community.findById(id).lean();
    if (!community) return res.status(404).json({ error: "Community not found" });

    // If private, you could require an invite/approval – omitted here
    const existing = await Member.findOne({ user: userId, community: id }).lean();
    if (existing) {
      return res.status(200).json({ message: "Already a member" });
    }

    const created = await Member.create({
      user: userId,
      community: id,
      role: "member",
      status: "online",
    });

    return res.status(201).json(created);
  } catch (error) {
    console.error("POST /api/communities/:id/join error:", error);
    return res.status(500).json({ error: "Server Error" });
  }
});

/**
 * POST /api/communities/:id/leave
 * Leave a community (owner cannot leave; they must transfer ownership or delete)
 */
router.post("/:id/leave", async (req, res) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    const membership = await Member.findOne({ user: userId, community: id });
    if (!membership) {
      return res.status(404).json({ error: "Not a member of this community" });
    }
    if (membership.role === "owner") {
      return res
        .status(400)
        .json({ error: "Owner cannot leave. Transfer ownership or delete the community." });
    }

    await membership.deleteOne();
    return res.status(200).json({ message: "Left community" });
  } catch (error) {
    console.error("POST /api/communities/:id/leave error:", error);
    return res.status(500).json({ error: "Server Error" });
  }
});

module.exports = router;