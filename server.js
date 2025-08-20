const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
dotenv.config();

const chatRoutes = require("./routes/chatRoutes");
const userRoutes = require("./routes/userRoutes");
const aiRoutes = require("./routes/aiRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());               // simple for dev; tighten later in prod
app.use(express.json());       // default size limit is fine here

app.use("/api/chats", chatRoutes);
app.use("/api/users", userRoutes);
app.use("/api/chat", aiRoutes);

app.get("/healthz", (req, res) => res.json({ ok: true }));

mongoose
  .connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log("Connected to MongoDB");
    app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
  });
