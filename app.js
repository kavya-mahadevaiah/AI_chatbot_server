const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
dotenv.config();

const chatRoutes = require("./routes/chatRoutes");
const userRoutes = require("./routes/userRoutes");
const aiRoutes = require("./routes/aiRoutes");

const app = express();

app.use(cors());               // simple for dev; tighten later in prod
app.use(express.json());       // default size limit is fine here

app.use("/api/chats", chatRoutes);
app.use("/api/users", userRoutes);
app.use("/api/chat", aiRoutes);


app.get("/healthz", (req, res) => res.json({ ok: true }));

module.exports = app;
