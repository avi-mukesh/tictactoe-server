const bcrypt = require("bcrypt");
const User = require("../models/User");
const asyncHandler = require("express-async-handler");

const getUser = asyncHandler(async (req, res) => {
  const id = req.params.id;

  if (id !== "undefined") {
    // console.log("requesting user with id", id);
    const user = await User.findById(id).exec();
    return res.status(200).json(user);
  } else {
    // return res.status(200).json({ username: "Computer", elo: 9999 });
  }
});

const getUsers = asyncHandler(async (req, res) => {
  const users = await User.find({}).exec();
  return res.status(200).json(users);
});

const updateUserPassword = asyncHandler(async (req, res) => {
  const id = req.params.id;
  const { currentPassword, newPassword, confirmNewPassword } = req.body;

  const user = await User.findById(id).exec();
  const match = await bcrypt.compare(currentPassword, user.password);

  if (!match)
    return res
      .status(401)
      .json({ message: "Current password is incorrect. Please try again." });

  if (newPassword !== confirmNewPassword)
    return res
      .status(401)
      .json({ message: "Passwords must match. Please try again." });

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(newPassword, salt);

  user.password = hashedPassword;
  await user.save();

  return res.status(200).json({ message: "Password changed successfully." });
});

module.exports = { getUser, getUsers, updateUserPassword };
