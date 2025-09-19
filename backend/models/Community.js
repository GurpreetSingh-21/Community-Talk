// backend/models/Community.js

const mongoose = require("mongoose");

const communitySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Community name is required"],
      unique: true,
      trim: true,
      minlength: [2, "Community name must be at least 2 characters"],
      maxlength: [100, "Community name must be under 100 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Person",
      default: null,
    },
  },
  { timestamps: true }
);

// 🔎 Indexes
communitySchema.index({ name: 1 }, { unique: true });
communitySchema.index({ createdBy: 1 });

// 🛠️ Optional helper method
communitySchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.__v; // Hide internal version field
  return obj;
};

module.exports = mongoose.model("Community", communitySchema);