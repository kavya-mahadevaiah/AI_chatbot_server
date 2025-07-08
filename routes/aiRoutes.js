const express = require("express");
const router = express.Router();
const axios = require("axios");
const Chat = require("../models/Chat");
const Message = require("../models/Message");
const { protect } = require("../middleware/authMiddleware");

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_BASE_URL = process.env.OPENROUTER_BASE_URL;
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL;
const OPENROUTER_REFERER = process.env.OPENROUTER_REFERER;
const OPENROUTER_TITLE = process.env.OPENROUTER_TITLE;

// POST /api/chat
router.post("/", protect, async (req, res) => {
  const { message, chatId } = req.body;

  // 1. Validate input
  if (!message || !chatId) {
    return res.status(400).json({ error: "Message and chatId are required." });
  }

  // 2. Ensure user owns the chat
  const chat = await Chat.findById(chatId);
  if (!chat || chat.user.toString() !== req.user._id.toString()) {
    return res.status(403).json({ error: "Unauthorized or chat not found." });
  }

  try {
    // 3. Fetch existing message history for the chat
    const previousMessages = await Message.find({ chatId }).sort({ createdAt: 1 });

    // 4. Format the messages for OpenRouter
    const chatHistory = previousMessages.map((msg) => ({
      role: msg.role === "bot" ? "assistant" : "user",
      content: msg.text,
    }));

    // 5. Append the current user message
    chatHistory.push({ role: "user", content: message });

    // 6. Call OpenRouter API
    const response = await axios.post(
      `${OPENROUTER_BASE_URL}/chat/completions`,
      {
        model: OPENROUTER_MODEL,
        messages: [
          { role: "system", content: "You are a helpful assistant." },
          ...chatHistory,
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": OPENROUTER_REFERER,
          "X-Title": OPENROUTER_TITLE,
        },
      }
    );

    const botReply = response.data.choices?.[0]?.message?.content || "No reply.";

    // 7. Save user message and bot reply to Message collection
    const userMsg = new Message({
      chatId,
      user: req.user._id,
      role: "user",
      text: message,
    });

    const botMsg = new Message({
      chatId,
      user: req.user._id,
      role: "bot",
      text: botReply,
    });

    await userMsg.save();
    await botMsg.save();

    // 8. Update chat timestamp
    chat.updatedAt = new Date();
    await chat.save();

    // 9. Return reply to frontend
    return res.status(200).json({ reply: botReply });
  } catch (err) {
    console.error("❌ OpenRouter Error:", err.response?.data || err.message);
    return res.status(500).json({ error: "OpenRouter failed to respond." });
  }
});

module.exports = router;
