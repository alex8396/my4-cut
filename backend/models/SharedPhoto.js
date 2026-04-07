const mongoose = require('mongoose');

const sharedPhotoSchema = new mongoose.Schema({
  image: {
    type: String, // Base64 encoded final canvas image
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 10800 // 3 hours (3 * 60 * 60 = 10800 seconds)
  }
});

module.exports = mongoose.model('SharedPhoto', sharedPhotoSchema);
