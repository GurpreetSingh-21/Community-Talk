const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    sender:   { type: String, required: true, trim: true },
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Person', required: true },
    avatar:   { type: String, default: '/default-avatar.png' },
    content:  { type: String, required: true, trim: true },
    timestamp:{ type: Date, default: Date.now },
    communityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Community', required: true },
  },
  { timestamps: true }
);

messageSchema.index({ communityId: 1, timestamp: 1 });

module.exports = mongoose.model('Message', messageSchema);