const mongoose = require('mongoose');

const sharedPhotoSchema = new mongoose.Schema({
  image: {
    type: String, // Base64 encoded final canvas image
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 86400 // Optional: automatically delete after 24 hours (86400 seconds) to save space
  }
});

module.exports = mongoose.model('SharedPhoto', sharedPhotoSchema);
