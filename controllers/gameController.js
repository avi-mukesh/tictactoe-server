const Game = require("../models/Game");
const asyncHandler = require("express-async-handler");
const User = require("../models/User");

const getOngoingGames = asyncHandler(async (req, res) => {
  console.log("requested ongoing games");
  const ongoingGames = await Game.find({
    timeFinished: null,
    playerTwo: { $ne: null },
  });
  return res.status(200).json(ongoingGames);
});

const getPreviousGames = asyncHandler(async (req, res) => {
  const { username } = req.query;
  console.log("requested previous games for", username);

  const user = await User.findOne({ username }).exec();
  const previousGames = await Game.find({
    $or: [{ playerOne: user }, { playerTwo: user }],
  });

  return res.status(200).json(previousGames);
});

module.exports = { getOngoingGames, getPreviousGames };
