const mongoose = require("mongoose");

const directMessageSchema = new mongoose.Schema(
  {
    from:    { type: mongoose.Schema.Types.ObjectId, ref: "Person", required: true },
    to:      { type: mongoose.Schema.Types.ObjectId, ref: "Person", required: true },
    content: { type: String, required: true, trim: true },
    timestamp: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

directMessageSchema.index({ from: 1, to: 1, createdAt: -1 });

module.exports = mongoose.model("DirectMessage", directMessageSchema);