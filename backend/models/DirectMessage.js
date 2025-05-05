const mongoose = require('mongoose');

const directMessageSchema = new mongoose.Schema({
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Person', required: true },
  receiverId: { type: mongoose.Schema.Types.ObjectId, ref: 'Person', required: true },
  content: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model('DirectMessage', directMessageSchema);
