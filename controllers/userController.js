const bcrypt = require("bcrypt");
const User = require("../models/User");
const asyncHandler = require("express-async-handler");

const getUser = asyncHandler(async (req, res) => {
  const id = req.params.id;
  console.log("requesting user with id", id);
  const user = await User.findById(id).exec();
  return res.status(200).json(user);
});

const updateUserPassword = asyncHandler(async (req, res) => {
  const id = req.params.id;
  const { currentPassword, newPassword, confirmNewPassword } = req.body;
  console.log("currentPassword", currentPassword);
  console.log("newPassword", newPassword);
  console.log("confirmNewPassword", confirmNewPassword);

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

  user.password = newPassword;
  await user.save();

  return res.status(200).json({ message: "Password changed successfully." });
});

module.exports = { getUser, updateUserPassword };
