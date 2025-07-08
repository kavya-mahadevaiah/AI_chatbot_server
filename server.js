const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
dotenv.config();
const chatRoutes = require('./routes/chatRoutes');
const userRoutes = require("./routes/userRoutes");
const aiRoutes = require("./routes/aiRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

// ✅ Middleware
app.use(cors());                
app.use(express.json());       

// ✅ Routes setup
app.use("/api/chat", aiRoutes);     
app.use("/api/users", userRoutes);
app.use("/api/chats", chatRoutes); 

// ✅ MongoDB Connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {                                   // enable your server only after connecting to your DB
  console.log('Connected to MongoDB');
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
})
.catch((err) => {
  console.error('MongoDB connection error:', err);
});
