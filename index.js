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
    // origin: ["http://localhost:3000", "https://admin.socket.io"],
    origin: "*",
  })
);
const connectDB = require("./config/dbConn");
const cookieParser = require("cookie-parser");

const { mongoose } = require("mongoose");
app.use(cookieParser());

const server = require("http").createServer(app);
const io = require("socket.io")(server, {
  cors: {
    origin: "*",
    // origin: ["http://localhost:3000", "https://admin.socket.io"],
    credentials: true,
  },
});

const port = process.env.PORT || 3001;

// connectDB();

app.get("/", (req, res) => {
  res.send({ message: "Hello world!" });
});

app.use("/auth", require("./routes/authRoutes"));
app.use("/user", require("./routes/userRoutes"));

const WAITING_ROOM = "waiting_room";
const GAME_ROOM = "game_room";

io.on("connection", (socket) => {
  // console.log(`User connected: ${socket.id}`);

  socket.on("join_waiting_room", async (user) => {
    socket.join(WAITING_ROOM);

    // const userRecord = await User.findOne({ user: user.username })
    //   .lean()
    //   .exec();
    // let unjoinedGame = await Game.findOne({ playerTwo: null }).lean().exec();
    // // if there is a game with playerOne, then join that game and start it
    // if (unjoinedGame) {
    //   notstartedGame.playerTwo = userRecord;
    //   notstartedGame.timeStarted = new Date();
    //   notStartedGame.roomId = crypto.randomBytes(20).toString('hex')
    //   await notStartedGame.save();
    // } else {
    //   // otherwise create a new game, with this user as playerOne
    //   notStartedGame = await Game.create({ playerOne: userRecord });
    // }

    if (io.sockets.adapter.rooms.get(WAITING_ROOM).size == 2) {
      const waiting_room = [...io.sockets.adapter.rooms.get(WAITING_ROOM)];

      // let roomId = notStartedGame.roomId;
      let roomId = "testroomid";

      const clientOneId = waiting_room[0];
      const clientTwoId = waiting_room[1];

      const symbols = {
        [clientOneId]: "NOUGHTS",
        [clientTwoId]: "CROSSES",
      };

      // TODO: send the room id here as well
      io.in(WAITING_ROOM).emit("matched_with_opponent", { symbols, roomId });
      io.in(WAITING_ROOM).emit("request_player_info");
      // private game room
      io.in(WAITING_ROOM).socketsJoin(GAME_ROOM);
      io.in(WAITING_ROOM).socketsLeave(WAITING_ROOM);
    }
  });

  socket.on("receive_player_info", (user) => {
    // forward player info to the opponent
    socket.to(GAME_ROOM).emit("set_opponent_info", user);
  });

  socket.on("leave_waiting_room", (user) => {
    socket.leave(WAITING_ROOM);

    console.log(
      `${user.username} has left the waiting room. Total waiting now = ${
        io.sockets.adapter.rooms.get(WAITING_ROOM)?.size
      }`
    );
  });

  socket.on("made_move", (data) => {
    console.log(`${data.username} made move in ${data.gameRoomId}`);
    socket.to(GAME_ROOM).to(`${GAME_ROOM}-spectators`).emit("made_move", data);
  });

  socket.on("request_rematch", (gameRoomId) => {
    console.log("rematch requested in", gameRoomId);
    socket.to(GAME_ROOM).emit("rematch_requested");
  });

  socket.on("accept_rematch_request", (gameRoomId) => {
    console.log("accepting rematch request in", gameRoomId);
    socket.to(GAME_ROOM).emit("accepted_rematch_request");
  });

  socket.on("game_ended", async (data) => {
    // const game = await Game.findOne({ roomId: data.roomId }).exec().lean();
    // game.timeFinished = new Date();
    // if (data.winner) {
    //   const winner = await User.findOne({ username: winner }).exec().lean();
    //   game.winner = winner;
    //   await game.save();
    // }
    console.log(
      `game with id ${data.gameRoomId} ended. winner is ${data.winner}`
    );
  });

  socket.on("spectate_game", async (data) => {
    console.log(`someone wants to spectate game with room ${data.gameRoomId}`);

    // const ongoingGame = await Game.findOne({ roomId: gameRoomId })
    //   .lean()
    //   .exec();
    const ongoingGamePlayerInfo = {
      playerOne: { username: "a", symbol: "NOUGHTS" },
      playerTwo: { username: "b", symbol: "CROSSES" },
    };

    socket.join(`${data.gameRoomId}-spectators`);
    socket.emit("receive_ongoing_game_player_info", ongoingGamePlayerInfo);
  });
});

// mongoose.connection.once("open", () => {
console.log("Connected to MongoDB");

server.listen(port, () => console.log(`Server listening on port ${port}`));
// });

instrument(io, { auth: false, mode: "development" });
