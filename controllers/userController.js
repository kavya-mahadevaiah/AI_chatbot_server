const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const registerUser = async (req, res) => {
  const { userId, password } = req.body;

  const existingUser = await User.findOne({ userId });
  if (existingUser) return res.status(400).json({ message: "User already exists" });

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await User.create({ userId, password: hashedPassword });

  res.status(201).json({ userId: user.userId });
};

const loginUser = async (req, res) => {
  const { userId, password } = req.body;

  const user = await User.findOne({ userId });
  if (!user) return res.status(401).json({ message: "Invalid credentials" });

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return res.status(401).json({ message: "Invalid credentials" });

  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });

  res.json({ userId: user.userId, token });
};

module.exports = { registerUser, loginUser };
