const User = require("../models/User");
const asyncHandler = require("express-async-handler");

const getUser = asyncHandler(async (req, res) => {
  const id = req.params.id;
  console.log("requesting user with id", id);
  const user = await User.findById(id).lean().exec();
  return res.status(200).json(user);
});

module.exports = { getUser };
