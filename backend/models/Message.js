const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: { type: String, required: true },
  avatar: { type: String, default: '/default-avatar.png' },
  content: { type: String, required: true },
  timestamp: { type: String, required: true },
  communityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Community', required: true }
});

const Message = mongoose.model('Message', messageSchema);

module.exports = Message;
