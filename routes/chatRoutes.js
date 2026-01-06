const express = require("express");
const Chat = require("../models/Chat");
const Message = require("../models/Message");
const { protect } = require("../middleware/authMiddleware");
const mongoose = require("mongoose");


const router = express.Router();

// List chats (sidebar)
router.get("/", protect, async (req, res) => {
  try {
    const chats = await Chat.find({ user: req.user._id })
      .sort({ updatedAt: -1 })
      .select("_id title createdAt");
    res.json(chats);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch chats." });
  }
});

// Create a chat
router.post("/", protect, async (req, res) => {
  try {
    const title = (req.body && req.body.title) ? String(req.body.title).trim() : undefined;
    const chat = await Chat.create({ user: req.user._id, title });
    res.status(201).json(chat);
  } catch (err) {
    res.status(500).json({ error: "Failed to create chat." });
  }
});

// Get chat + messages
router.get("/:id", protect, async (req, res) => {
  try {
    const id = req.params.id;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: "Invalid chat id." });
    }

    const chat = await Chat.findOne({ _id: id, user: req.user._id });
    if (!chat) {
      return res.status(404).json({ error: "Chat not found." });
    }

    const messages = await Message.find({ chatId: chat._id, user: req.user._id })
      .sort({ createdAt: 1 })
      .select("role text createdAt");

    res.json({ _id: chat._id, title: chat.title, messages });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch chat." });
  }
});

// Rename chat
router.put("/:id", protect, async (req, res) => {
  try {
    const id = req.params.id;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: "Invalid chat id." });
    }

    const title = (req.body && req.body.title) ? String(req.body.title).trim() : "Untitled Chat";
    const chat = await Chat.findOneAndUpdate(
      { _id: id, user: req.user._id },
      { title: title || "Untitled Chat" },
      { new: true }
    );

    if (!chat) {
      return res.status(404).json({ error: "Chat not found." });
    }

    res.json(chat);
  } catch (err) {
    res.status(500).json({ error: "Failed to update title." });
  }
});

// Delete chat and its messages
// DELETE /api/chats/:id
router.delete("/:id", protect, async (req, res) => {
  try {
    const id = String(req.params.id || "");
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: "Invalid chat id." });
    }

    // Only delete a chat that belongs to the logged-in user
    const chat = await Chat.findOneAndDelete({ _id: id, user: req.user._id });
    if (!chat) {
      return res.status(404).json({ error: "Chat not found." });
    }

    // Cascade delete its messages
    await Message.deleteMany({ chatId: chat._id, user: req.user._id });

    return res.json({ success: true });
  } catch (e) {
    console.error("DELETE /api/chats/:id failed:", e);
  return res.status(500).json({
    error: "Failed to delete chat.",
    details: e.message,
    name: e.name,
    code: e.code,
  });
  }
});


module.exports = router;
