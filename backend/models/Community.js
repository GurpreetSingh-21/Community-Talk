const mongoose = require('mongoose');

const communitySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true }
});

const Community = mongoose.model('Community', communitySchema);

module.exports = Community;
