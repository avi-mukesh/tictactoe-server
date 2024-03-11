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
      required: true,
    },
    timeStarted: {
      type: Date,
      required: true,
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
  },
  { timestamps: true }
);

const Game = mongoose.model("Game", gameSchema);

module.exports = Game;
