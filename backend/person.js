const mongoose = require('mongoose');

const personSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, unique: true, trim: true },
    email:    { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    password: { type: String, required: true },
    request:  { type: String, unique: true, sparse: true }, // make sparse to avoid dup issues if empty
    avatar:   { type: String, default: '/default-avatar.png' },
  },
  { timestamps: true }
);

// If you previously added schema.index({ email: 1 }, { unique: true })
// you don't need it because 'unique: true' on the path already creates it.

module.exports = mongoose.model('Person', personSchema);