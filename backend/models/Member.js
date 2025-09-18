const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema(
  {
    // optional pointer to Person
    person: { type: mongoose.Schema.Types.ObjectId, ref: 'Person', default: null },
    // fallbacks that frontend uses today
    name: { type: String, required: true, trim: true },
    email: { type: String, default: '', trim: true, index: true },
    status: { type: String, enum: ['online', 'offline'], default: 'online' },
    avatar: { type: String, default: '/default-avatar.png' },
    communityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Community', required: true },
  },
  { timestamps: true }
);

memberSchema.index({ communityId: 1 });

module.exports = mongoose.model('Member', memberSchema);