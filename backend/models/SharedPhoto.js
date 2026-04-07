const mongoose = require('mongoose');

const sharedPhotoSchema = new mongoose.Schema({
  image: {
    type: String, // Base64 encoded final canvas image
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 600 // 10 minutes
  }
});

module.exports = mongoose.model('SharedPhoto', sharedPhotoSchema);
