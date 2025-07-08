const express = require('express');
const router = express.Router();
const Chat = require('../models/Chat');
const Message = require('../models/Message');
const { protect } = require("../middleware/authMiddleware");


// Get all chat sessions for this user
router.get('/', protect, async (req, res) => {
  try {
    const chats = await Chat.find({ user: req.user._id }).sort({ updatedAt: -1 });
    res.json(chats.map(({ _id, title, createdAt }) => ({ _id, title, createdAt })));
  } catch (err) {
    console.error("Failed to fetch chats:", err);
    res.status(500).json({ error: 'Failed to fetch chats.' });
  }
});


// Create a new chat session
router.post('/', protect, async (req, res) => {
  try {
    const { title } = req.body;
    const newChat = new Chat({
      title: title || "Untitled Chat",
      user: req.user._id,
    });
    const saved = await newChat.save();
    res.status(201).json(saved);
  } catch (err) {
    console.error("Failed to create chat:", err);
    res.status(500).json({ error: 'Failed to create chat.' });
  }
});



// Get one chat's full data (including messages)
router.get('/:id', protect, async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.id);
    if (!chat || chat.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Unauthorized access.' });
    }
    const messages = await Message.find({ chatId: chat._id }).sort({ createdAt: 1 });
    res.json({ ...chat.toObject(), messages });
  } catch (err) {
    console.error("Failed to load chat:", err);
    res.status(500).json({ error: 'Failed to fetch chat.' });
  }
});

// // Add a message to a chat
// router.post('/:id', protect, async (req, res) => {
//   try {
//     const { sender, text, pairId } = req.body;
//     const chat = await Chat.findById(req.params.id);
//     if (!chat || chat.user.toString() !== req.user._id.toString()) {
//       return res.status(403).json({ error: 'Unauthorized access.' });
//     }

//     const message = new Message({
//       chatId: chat._id,
//       user: req.user._id,
//       role: sender,
//       text,
//       pairId: pairId || null
//     });
//     const savedMsg = await message.save();
//     chat.updatedAt = new Date();
//     await chat.save();
//     res.status(201).json(savedMsg);
//   } catch (err) {
//     console.error("Failed to add message:", err);
//     res.status(500).json({ error: 'Failed to add message.' });
//   }
// });

// Update chat title
router.put('/:id', protect, async (req, res) => {
  try {
    const { title } = req.body;
    const chat = await Chat.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { title },
      { new: true }
    );
    if (!chat) return res.status(404).json({ error: 'Chat not found.' });
    res.json(chat);
  } catch (err) {
    console.error("Failed to update chat:", err);
    res.status(500).json({ error: 'Failed to update title.' });
  }
});

// Delete a chat session and its messages
router.delete('/:id', protect, async (req, res) => {
  try {
    const chat = await Chat.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id
    });
    if (!chat) return res.status(404).json({ error: 'Chat not found' });

    await Message.deleteMany({ chatId: chat._id });
    res.json({ message: 'Chat and messages deleted' });
  } catch (err) {
    console.error("Failed to delete chat:", err);
    res.status(500).json({ error: 'Failed to delete chat' });
  }
});

module.exports = router;
