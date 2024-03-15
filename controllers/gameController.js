const Game = require("../models/Game");
const asyncHandler = require("express-async-handler");

const getOngoingGames = asyncHandler(async (req, res) => {
  console.log("requested ongoing games");
  const ongoingGames = await Game.find({
    timeFinished: null,
    playerTwo: { $ne: null },
  });
  return res.status(200).json(ongoingGames);
});

module.exports = { getOngoingGames };
