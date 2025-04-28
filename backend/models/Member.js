const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema({
  name: { type: String, required: true },
  status: { type: String, enum: ['online', 'offline'], default: 'online' },
  avatar: { type: String, default: '/default-avatar.png' },
  communityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Community', required: true }
});

const Member = mongoose.model('Member', memberSchema);

module.exports = Member;
