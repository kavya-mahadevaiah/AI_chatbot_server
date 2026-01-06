// backend/routes/aiRoutes.js
const express = require("express");
const axios = require("axios");
const mongoose = require("mongoose");
const Chat = require("../models/Chat");
const Message = require("../models/Message");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

/* ENV */
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "";
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || "deepseek/deepseek-chat-v3-0324";
const OPENROUTER_URL = process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_REFERER = process.env.OPENROUTER_REFERER || "http://localhost:3000";
const OPENROUTER_TITLE = process.env.OPENROUTER_TITLE || "Chatbot";

const HISTORY_LIMIT = 12;

/* helper: get plain string reply from provider data */
function extractReply(data) {
  if (!data || !Array.isArray(data.choices) || !data.choices[0]) return "";

  const choice = data.choices[0];

  // Standard OpenRouter / OpenAI style
  if (choice.message && choice.message.content) {
    return String(choice.message.content).trim();
  }

  // Some models respond with .text
  if (choice.text) return String(choice.text).trim();

  // Some respond with delta objects
  if (choice.delta && choice.delta.content) {
    return String(choice.delta.content).trim();
  }

  return "";
}


/* POST /api/chat  — send message, call model, save both messages, return reply */
router.post("/", protect, async (req, res) => {
  try {
    if (!OPENROUTER_API_KEY) {
      return res.status(500).json({ error: "Missing OPENROUTER_API_KEY" });
    }

    const message = req.body && req.body.message ? String(req.body.message) : "";
    const chatId = req.body && req.body.chatId ? String(req.body.chatId) : "";

    if (!message) return res.status(400).json({ error: "Message is required." });
    if (!mongoose.isValidObjectId(chatId)) return res.status(400).json({ error: "Invalid chat id." });

    const chat = await Chat.findOne({ _id: chatId, user: req.user._id });
    if (!chat) return res.status(404).json({ error: "Chat not found." });

    // history (oldest → newest), keep last N
    const docs = await Message.find({ chatId, user: req.user._id })
      .sort({ createdAt: 1 })
      .select("role text")
      .lean();

    const tail = docs.slice(-HISTORY_LIMIT).map((m) => ({
      role: m.role === "bot" ? "assistant" : "user",
      content: m.text,
    }));

    const payload = {
      model: OPENROUTER_MODEL,
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        ...tail,
        { role: "user", content: message },
      ],
    };

    const headers = {
      Authorization: "Bearer " + OPENROUTER_API_KEY,
      "Content-Type": "application/json",
      "HTTP-Referer": OPENROUTER_REFERER,
      "X-Title": OPENROUTER_TITLE,
    };

    const r = await axios.post(OPENROUTER_URL, payload, { headers, timeout: 90000 });

    const botReply = extractReply(r.data);
    if (!botReply) return res.status(502).json({ error: "AI returned empty response" });

    // persist both messages
    const userMsg = await Message.create({
      chatId,
      user: req.user._id,
      role: "user",
      text: message,
    });

    await Message.create({
      chatId,
      user: req.user._id,
      role: "bot",
      text: botReply,
      pairId: userMsg._id,
    });

    await Chat.updateOne({ _id: chatId }, { $set: { updatedAt: new Date() } });

    return res.json({ reply: botReply });
  } catch (err) {
    return res.status(502).json({ error: "AI request failed" });
  }
});

module.exports = router;
