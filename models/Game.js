const mongoose = require("mongoose");

const gameSchema = mongoose.Schema(
  {
    playerOne: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    playerTwo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    timeStarted: {
      type: Date,
      required: false,
    },
    timeFinished: {
      type: Date,
      required: false,
    },
    winner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    roomId: {
      type: String,
      required: false,
    },
    boardState: {
      type: [[String]],
      required: true,
      default: [
        ["", "", ""],
        ["", "", ""],
        ["", "", ""],
      ],
    },
    playerOneEloChange: {
      type: Number,
      required: false,
    },
    playerTwoEloChange: {
      type: Number,
      required: false,
    },
  },
  { timestamps: true }
);

const Game = mongoose.model("Game", gameSchema);

module.exports = Game;
