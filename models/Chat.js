const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
  title: {
    type: String,
    default: 'Untitled Chat',
  },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

module.exports = mongoose.model('Chat', chatSchema);