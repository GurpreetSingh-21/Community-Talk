const mongoose = require("mongoose");

const directMessageSchema = new mongoose.Schema({
  from: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Person",
    required: true
  },
  to: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Person",
    required: true
  },
  content: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("DirectMessage", directMessageSchema);