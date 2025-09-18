const mongoose = require('mongoose');

const communitySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    // keep createdBy optional; when present it MUST reference Person
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Person', default: null },
  },
  { timestamps: true }
);

communitySchema.index({ name: 1 }, { unique: true });

module.exports = mongoose.model('Community', communitySchema);