const Game = require("./models/Game");
const User = require("./models/User");

const { instrument } = require("@socket.io/admin-ui");
const crypto = require("crypto");

require("dotenv").config();
const express = require("express");
const app = express();
const cors = require("cors");
app.use(express.json());

app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "https://tictactoe.avimukesh.com",
      "https://tictactoe-5b035.web.app",
      "https://tictactoe-5b035.firebaseapp.com",
    ],
    // origin: "*",
  })
);
const connectDB = require("./config/dbConn");
const cookieParser = require("cookie-parser");

const { mongoose } = require("mongoose");
app.use(cookieParser());

const server = require("http").createServer(app);
const io = require("socket.io")(server, {
  cors: {
    origin: [
      "http://localhost:3000",
      "https://tictactoe.avimukesh.com",
      "https://tictactoe-5b035.web.app",
      "https://tictactoe-5b035.firebaseapp.com",
    ],
    // origin: "*",
    // credentials: true,
  },
});

const port = 3001;

connectDB();

app.get("/", (req, res) => {
  res.send({ message: "Hello world!" });
});

app.use("/auth", require("./routes/authRoutes"));
app.use("/user", require("./routes/userRoutes"));
app.use("/game", require("./routes/gameRoutes"));

const WAITING_ROOM = "waiting_room";

io.on("connection", (socket) => {
  console.log("Someone connected");
  socket.on("join_waiting_room", async (user) => {
    socket.join(WAITING_ROOM);
    console.log(`${user.username} joined waiting room`);
    const userRecord = await User.findOne({ username: user.username })
      .lean()
      .exec();
    let notStartedGame = await Game.findOne({ playerTwo: null }).exec();
    // if there is a game with playerOne, then join that game and start it
    if (notStartedGame) {
      notStartedGame.roomId = crypto.randomBytes(20).toString("hex");
      notStartedGame.timeStarted = new Date();
      notStartedGame.playerTwo = userRecord;
      await notStartedGame.save();
      console.log("game exists");
    } else {
      // otherwise create a new game, with this user as playerOne
      console.log("creating new game");
      notStartedGame = await Game.create({ playerOne: userRecord });
    }

    if (io.sockets.adapter.rooms.get(WAITING_ROOM)?.size == 2) {
      const waiting_room = [...io.sockets.adapter.rooms.get(WAITING_ROOM)];

      let roomId = notStartedGame.roomId;

      const clientOneId = waiting_room[0];
      const clientTwoId = waiting_room[1];

      const symbols = {
        [clientOneId]: "NOUGHTS",
        [clientTwoId]: "CROSSES",
      };

      io.in(WAITING_ROOM).emit("matched_with_opponent", { symbols, roomId });
      io.in(WAITING_ROOM).emit("request_player_info", { gameRoomId: roomId });
      // private game room
      io.in(WAITING_ROOM).socketsJoin(roomId);
      io.in(WAITING_ROOM).socketsLeave(WAITING_ROOM);
    }
  });

  socket.on("receive_player_info", (data) => {
    console.log("sending player info", data.user);
    // forward player info to the opponent
    socket.to(data.gameRoomId).emit("set_opponent_info", data.user);
  });

  socket.on("leave_waiting_room", async (user) => {
    socket.leave(WAITING_ROOM);
    // delete the game object created in database
    const playerOne = await User.findOne({
      username: user.username,
    }).exec();

    const notStartedGame = await Game.findOne({
      playerOne,
      playerTwo: null,
    }).exec();

    if (notStartedGame) {
      await notStartedGame.deleteOne();
    }

    console.log(`${user.username} left the waiting room`);
    // } has left the waiting room. Waiting room geezas = ${io.sockets.adapter.rooms.get(
  });

  socket.on("made_move", async (data) => {
    console.log(data.username, "made a move in room", data.gameRoomId);
    const game = await Game.findOne({ roomId: data.gameRoomId });
    console.log("game is", game);
    const playerOne = await User.findById(game.playerOne);

    let symbol;

    if (playerOne.username === data.username) {
      symbol = "O";
    } else {
      symbol = "X";
    }
    const newBoardState = [...game.boardState];
    newBoardState[data.coordinates.y][data.coordinates.x] = symbol;
    game.boardState = newBoardState;
    await game.save();

    socket
      .to(data.gameRoomId)
      .to(`${data.gameRoomId}-spectators`)
      .emit("made_move", data);
  });

  socket.on("request_rematch", (gameRoomId) => {
    console.log(`rematch requested in game room ${gameRoomId}`);
    socket.to(gameRoomId).emit("rematch_requested");
  });

  socket.on("accept_rematch_request", async ({ gameRoomId }) => {
    console.log(`rematch accepted in game room ${gameRoomId}`);
    const prevGame = await Game.findOne({ roomId: gameRoomId }).exec();

    // swapping the players
    const playerOne = prevGame.playerTwo;
    const playerTwo = prevGame.playerOne;

    const newGameRoomId = crypto.randomBytes(20).toString("hex");

    io.in(gameRoomId).socketsJoin(newGameRoomId);
    io.in(gameRoomId).socketsLeave(gameRoomId);

    socket.to(newGameRoomId).emit("accepted_rematch_request", newGameRoomId);
    socket.emit("new_game_room_id", newGameRoomId);

    const newGame = await Game.create({
      playerOne,
      playerTwo,
      roomId: newGameRoomId,
      timeStarted: new Date(),
    });
  });

  socket.on("game_ended", async (data) => {
    console.log(`game in room ${data.gameRoomId} ended`);

    const game = await Game.findOne({ roomId: data.gameRoomId }).exec();
    game.timeFinished = new Date();

    const playerOne = await User.findById(game.playerOne).lean().exec();
    const playerTwo = await User.findById(game.playerTwo).lean().exec();
    const c = 400;
    const K = 32;

    let eloChangeOne;
    let eloChangeTwo;

    if (data.winner) {
      const winner = await User.findOne({ username: data.winner }).exec();
      game.winner = winner;

      const loserUsername =
        playerOne.username === data.winner
          ? playerTwo.username
          : playerOne.username;
      const loser = await User.findOne({ username: loserUsername }).exec();

      const qWinner = Math.pow(10, winner.elo / c);
      const qLoser = Math.pow(10, loser.elo / c);
      const expectedOutcomeWinner = qWinner / (qWinner + qLoser);
      const expectedOutcomeLoser = qLoser / (qWinner + qLoser);

      const eloChangeWinner = Math.round(K * (1 - expectedOutcomeWinner));
      const eloChangeLoser = Math.round(K * (0 - expectedOutcomeLoser));

      winner.elo = winner.elo + eloChangeWinner;
      loser.elo = loser.elo + eloChangeLoser;

      const playerOneRecord = await User.findById(game.playerOne).lean().exec();
      const playerTwoRecord = await User.findById(game.playerTwo).lean().exec();
      if (playerOneRecord.username === data.winner) {
        game.playerOneEloChange = eloChangeWinner;
        game.playerTwoEloChange = eloChangeLoser;
      } else {
        game.playerOneEloChange = eloChangeLoser;
        game.playerTwoEloChange = eloChangeWinner;
      }

      await winner.save();
      await loser.save();
    } else {
      const qOne = Math.pow(10, playerOne.elo / c);
      const qTwo = Math.pow(10, playerTwo.elo / c);
      const expectedOutcomeOne = qOne / (qOne + qTwo);
      const expectedOutcomeTwo = qTwo / (qOne + qTwo);
      const eloChangeOne = Math.round(K * (0.5 - expectedOutcomeOne));
      const eloChangeTwo = Math.round(K * (0.5 - expectedOutcomeTwo));

      const playerOneRecord = await User.findById(game.playerOne).exec();
      const playerTwoRecord = await User.findById(game.playerTwo).exec();

      playerOneRecord.elo = playerOneRecord.elo + eloChangeOne;
      playerTwoRecord.elo = playerTwoRecord.elo + eloChangeTwo;

      game.playerOneEloChange = eloChangeOne;
      game.playerTwoEloChange = eloChangeTwo;

      await playerOneRecord.save();
      await playerTwoRecord.save();
    }
    await game.save();
    socket
      .to(data.gameRoomId)
      .to(`${data.gameRoomId}-spectators`)
      .emit("game_ended", data);
  });

  socket.on("spectate_game", async (data) => {
    console.log(`someone wants to spectate ${data.gameRoomId}`);

    const ongoingGame = await Game.findOne({ roomId: data.gameRoomId })
      .lean()
      .exec();

    if (ongoingGame) {
      const {
        boardState: ongoingGameBoardState,
        playerOne: playerOneId,
        playerTwo: playerTwoId,
      } = ongoingGame;

      const playerOne = await User.findById(playerOneId).lean().exec();
      const playerTwo = await User.findById(playerTwoId).lean().exec();

      const ongoingGamePlayerInfo = {
        playerOne: { username: playerOne.username, symbol: "NOUGHTS" },
        playerTwo: { username: playerTwo.username, symbol: "CROSSES" },
      };

      socket.join(`${data.gameRoomId}-spectators`);
      socket.emit("receive_ongoing_game_player_info", {
        ongoingGamePlayerInfo,
      });
      socket.emit("receive_ongoing_game_boardstate", {
        ongoingGameBoardState,
      });
    } else {
      socket.emit("invalid_game_room");
    }
  });

  socket.on("create_custom_game_room", async (username) => {
    console.log(`${username} creating a custom game room`);

    const userRecord = await User.findOne({ username }).exec();
    const existingGame = await Game.findOne({
      playerOne: userRecord,
      playerTwo: null,
      roomId: { $ne: null },
    });

    let roomId;

    if (existingGame) {
      roomId = existingGame.roomId;
    } else {
      roomId = crypto.randomBytes(20).toString("hex");
      await Game.create({ playerOne: userRecord, roomId });
    }

    socket.emit("custom_game_room_created", roomId);
    socket.join(roomId);
  });

  socket.on("join_custom_game_room", async ({ username, roomId }) => {
    console.log(`${username} joining custom game room ${roomId}`);

    socket.join(roomId);
    const gameRoom = [...io.sockets.adapter.rooms.get(roomId)];
    console.log("gameroom:", gameRoom);

    const clientOneId = gameRoom[0];
    const clientTwoId = gameRoom[1];

    const symbols = {
      [clientOneId]: "NOUGHTS",
      [clientTwoId]: "CROSSES",
    };

    io.in(gameRoom).emit("matched_with_opponent", { symbols, roomId });
    io.in(gameRoom).emit("request_player_info", { gameRoomId: roomId });

    const playerTwo = await User.findOne({ username }).exec();
    const notStartedGame = await Game.findOne({ roomId }).exec();
    notStartedGame.timeStarted = new Date();
    notStartedGame.playerTwo = playerTwo;
    await notStartedGame.save();
  });

  socket.on("delete_incomplete_games", async (username) => {
    console.log(
      `deleting unfinished games where ${username} is the only player in an unfinished game`
    );
    const user = await User.findOne({ username });
    await Game.deleteMany({
      $or: [
        { $and: [{ playerOne: user }, { playerTwo: null }] },
        { $and: [{ playerTwo: user }, { playerOne: null }] },
      ],
      // $or: [{ playerOne: user }, { playerTwo: user }],
      timeFinished: null,
    });
  });
});

mongoose.connection.once("open", () => {
  console.log("Connected to MongoDB");

  server.listen(port, () => console.log(`Server listening on port ${port}`));
});

instrument(io, { auth: false, mode: "development" });
