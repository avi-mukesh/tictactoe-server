const User = require("../models/User");

const getUser = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  return res.status(200).json({ message: `Here is your user with id ${id}` });
});

module.exports = { getUser, createNewUser };
