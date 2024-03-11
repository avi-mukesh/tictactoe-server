const Game = require("./models/Game");

const { instrument } = require("@socket.io/admin-ui");

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

    console.log(
      `${user.username} is in the waiting room. Total waiting now = ${
        io.sockets.adapter.rooms.get(WAITING_ROOM).size
      }`
    );

    if (io.sockets.adapter.rooms.get(WAITING_ROOM).size == 2) {
      const waiting_room = [...io.sockets.adapter.rooms.get(WAITING_ROOM)];

      const clientOneId = waiting_room[0];
      const clientTwoId = waiting_room[1];

      const symbols = {
        [clientOneId]: "NOUGHTS",
        [clientTwoId]: "CROSSES",
      };

      // TODO: send the room id here as well
      io.in(WAITING_ROOM).emit("matched_with_opponent", symbols);
      io.in(WAITING_ROOM).emit("request_player_info");
      // private game room
      io.in(WAITING_ROOM).socketsJoin(GAME_ROOM);
      io.in(WAITING_ROOM).socketsLeave(WAITING_ROOM);

      // const game = await Game.create({ username, email, password });
      // if (game) {
      //   console.log("created user", username, email);
      //   res.status(201).json({ message: `New user ${username} created` });
      // } else {
      //   res.status(400).json({ message: "Invalid user data received" });
      // }
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
    socket.to(GAME_ROOM).emit("made_move", data);
  });

  socket.on("request_rematch", () => {
    socket.to(GAME_ROOM).emit("rematch_requested");
  });
});

// mongoose.connection.once("open", () => {
console.log("Connected to MongoDB");

server.listen(port, () => console.log(`Server listening on port ${port}`));
// });

instrument(io, { auth: false, mode: "development" });
