// backend/models/Member.js
const mongoose = require("mongoose");

const memberSchema = new mongoose.Schema(
  {
    // Optional pointer to the Person collection (preferred)
    person: { type: mongoose.Schema.Types.ObjectId, ref: "Person", default: null },

    // Display name we show in the UI; we keep it denormalized for speed
    fullName: { type: String, default: "", trim: true },

    // Email (legacy rows may rely on this); we also keep a normalized copy for indexing
    email: { type: String, default: "", trim: true },
    emailLower: { type: String, default: "", select: false }, // internal normalized field

    // Live presence is computed at request time; this is just a fallback
    status: { type: String, enum: ["online", "offline"], default: "offline" },

    // Avatar URL (can be Person.avatar or a custom one)
    avatar: { type: String, default: "/default-avatar.png" },

    // Community this membership belongs to
    community: { type: mongoose.Schema.Types.ObjectId, ref: "Community", required: true },
  },
  { timestamps: true }
);

/* ───────────────────────── Indexes ─────────────────────────
 * - Fast lookups by community
 * - Enforce one membership per (community, person) when person is present
 * - Enforce one membership per (community, email) for legacy rows
 */
memberSchema.index({ community: 1 });

// Unique when 'person' is set
memberSchema.index(
  { community: 1, person: 1 },
  { unique: true, partialFilterExpression: { person: { $type: "objectId" } } }
);

// Unique when using email (legacy rows). We index on normalized lowercased email.
memberSchema.index(
  { community: 1, emailLower: 1 },
  {
    unique: true,
    partialFilterExpression: { emailLower: { $exists: true, $type: "string" } },
  }
);

/* ───────────────────── Normalization Hooks ───────────────────── */
function normalize(doc) {
  if (typeof doc.fullName === "string") {
    doc.fullName = doc.fullName.trim();
  }
  if (typeof doc.email === "string") {
    const trimmed = doc.email.trim();
    doc.email = trimmed;
    doc.emailLower = trimmed ? trimmed.toLowerCase() : "";
  }
}

// Ensure emailLower stays in sync on save()
memberSchema.pre("save", function (next) {
  normalize(this);
  next();
});

// Ensure emailLower stays in sync on findOneAndUpdate()
memberSchema.pre("findOneAndUpdate", function (next) {
  const update = this.getUpdate() || {};
  const $set = update.$set || update;
  if ($set) normalize($set);
  next();
});

/* ───────────────────── Serialization Cleanup ───────────────────── */
memberSchema.set("toJSON", {
  virtuals: true,
  transform: (_doc, ret) => {
    delete ret.emailLower; // internal only
    return ret;
  },
});

module.exports = mongoose.model("Member", memberSchema);