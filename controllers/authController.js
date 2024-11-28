const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const asyncHandler = require("express-async-handler");

// @desc Login
// @route POST /auth
// @access Public
const login = asyncHandler(async (req, res) => {
  const { username, password } = req.body;

  console.log(`${username} is trying to log in...`);

  if (!username || !password) {
    return res.status(400).json({ message: "All fields are required" });
  }

  const foundUser = await User.findOne({ username }).exec();

  if (!foundUser)
    return res
      .status(401)
      .json({ message: "Invalid details. Please try again." });

  const match = await bcrypt.compare(password, foundUser.password);
  if (!match)
    return res
      .status(401)
      .json({ message: "Invalid details. Please try again." });

  const accessToken = jwt.sign(
    { username, id: foundUser.id, elo: foundUser.elo },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: "60m",
    }
  );

  res.json({ accessToken });
});

const register = asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;

  console.log(`trying to register ${username} with email ${email}`);

  if (!username || !email || !password) {
    return res.status(400).json({ message: "All fields are required" });
  }

  let duplicate = await User.findOne({ username }).lean().exec();
  if (duplicate) return res.status(409).json({ message: "Duplicate username" });

  duplicate = await User.findOne({ email }).lean().exec();
  if (duplicate) return res.status(409).json({ message: "Duplicate email" });

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const user = await User.create({ username, email, password: hashedPassword });
  if (user) {
    console.log("created user", username, email);
    res.status(201).json({ message: `New user ${username} created` });
  } else {
    res.status(400).json({ message: "Invalid user data received" });
  }
});

// @desc logout
// @route POST /auth/logout
// @access Public - just to clear cookie if exists
const logout = (req, res) => {
  console.log(`logging out`);

  const cookies = req.cookies;
  if (cookies.accessToken) return res.sendStatus(200); // No Conten
  res.clearCookie("accessToken", {
    httpOnly: true,
    sameSite: "none",
    secure: true,
  });
};

module.exports = { login, logout, register };
