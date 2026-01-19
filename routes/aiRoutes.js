// backend/routes/aiRoutes.js
const express = require("express");
const axios = require("axios");
const mongoose = require("mongoose");
const Chat = require("../models/Chat");
const Message = require("../models/Message");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

/* ENV (DO NOT hardcode secrets in code) */
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "";
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || "deepseek/deepseek-chat-v3-0324";
const OPENROUTER_URL =
  process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1/chat/completions";

// Set this to your FRONTEND origin ideally (e.g., https://yourapp.vercel.app)
const OPENROUTER_REFERER =
  process.env.OPENROUTER_REFERER || "http://localhost:3000";

const OPENROUTER_TITLE = process.env.OPENROUTER_TITLE || "Chatbot";

const HISTORY_LIMIT = 12;

/* helper: get plain string reply from provider data */
function extractReply(data) {
  if (!data || !Array.isArray(data.choices) || !data.choices[0]) return "";

  const choice = data.choices[0];

  // Standard OpenAI/OpenRouter style
  if (choice.message && typeof choice.message.content === "string") {
    return choice.message.content.trim();
  }

  // Some models respond with .text
  if (typeof choice.text === "string") return choice.text.trim();

  // Some respond with delta objects (stream-like)
  if (choice.delta && typeof choice.delta.content === "string") {
    return choice.delta.content.trim();
  }

  return "";
}

console.log("OPENROUTER ENV CHECK", {
  hasKey: !!process.env.OPENROUTER_API_KEY,
  prefix: process.env.OPENROUTER_API_KEY?.slice(0, 8),
  len: process.env.OPENROUTER_API_KEY?.length,
});

/* POST /api/chat  — send message, call model, save both messages, return reply */
router.post("/", protect, async (req, res) => {
  const rid = Math.random().toString(16).slice(2); // correlation id for logs

  try {
    if (!OPENROUTER_API_KEY) {
      return res.status(500).json({ error: "Missing OPENROUTER_API_KEY" });
    }

    const message = req.body?.message ? String(req.body.message).trim() : "";
    const chatId = req.body?.chatId ? String(req.body.chatId).trim() : "";

    if (!message) return res.status(400).json({ error: "Message is required." });
    if (message.length > 5000)
      return res.status(400).json({ error: "Message too long (max 5000 chars)." });

    if (!mongoose.isValidObjectId(chatId))
      return res.status(400).json({ error: "Invalid chat id." });

    const chat = await Chat.findOne({ _id: chatId, user: req.user._id }).lean();
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
      // optional knobs (safe defaults):
      temperature: 0.7,
      max_tokens: 512,
    };

    const headers = {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": OPENROUTER_REFERER,
      "X-Title": OPENROUTER_TITLE,
    };

    // Safe debug (no secrets)
    console.log(`[${rid}] OpenRouter request`, {
      model: OPENROUTER_MODEL,
      referer: OPENROUTER_REFERER,
      title: OPENROUTER_TITLE,
      historyCount: tail.length,
    });

    const r = await axios.post(OPENROUTER_URL, payload, {
      headers,
      timeout: 90000,
      // You can also add: validateStatus: () => true, and handle non-2xx yourself
    });

    // Handle OpenRouter-style error response
    if (r.data?.error) {
      console.log(`[${rid}] OpenRouter error payload`, {
        status: r.status,
        code: r.data.error?.code,
        message: r.data.error?.message,
      });
      return res.status(502).json({
        error: "AI provider error",
        details: r.data.error?.message || "Unknown provider error",
      });
    }

    const botReply = extractReply(r.data);

    if (!botReply) {
      // Log shape for debugging
      console.log(`[${rid}] EMPTY_REPLY`, {
        status: r.status,
        hasChoices: Array.isArray(r.data?.choices),
        firstChoice: r.data?.choices?.[0],
        rawKeys: r.data ? Object.keys(r.data) : null,
      });

      return res.status(502).json({ error: "AI returned empty response" });
    }

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
    // Axios errors have useful info in err.response
    const status = err.response?.status;
    const data = err.response?.data;

    console.log(`[${rid}] AI request failed`, {
      status,
      code: err.code,
      message: err.message,
      providerError: data?.error,
    });

    // More informative status mapping
    if (status === 401 || status === 403) {
      return res.status(502).json({ error: "AI auth failed (check API key)" });
    }
    if (status === 429) {
      return res.status(502).json({ error: "AI rate limited (try again soon)" });
    }

    return res.status(502).json({ error: "AI request failed" });
  }
});

module.exports = router;
