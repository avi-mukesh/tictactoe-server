const { instrument } = require("@socket.io/admin-ui");

require("dotenv").config();

const express = require("express");
const app = express();
const cors = require("cors");
app.use(express.json());

app.use(
  cors({
    origin: "http://localhost:3000",
  })
);
const connectDB = require("./config/dbConn");
const cookieParser = require("cookie-parser");

const { mongoose } = require("mongoose");
app.use(cookieParser());

const server = require("http").createServer(app);
const io = require("socket.io")(server, {
  cors: {
    origin: ["http://localhost:3000", "https://admin.socket.io"],
  },
});

const port = process.env.PORT || 3001;

connectDB();

app.get("/", (req, res) => {
  res.send({ message: "Hello world!" });
});

app.use("/auth", require("./routes/authRoutes"));
app.use("/user", require("./routes/userRoutes"));

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);
  // socket.on("send-message", (data) => {
  //   socket.to(data.room).emit("receive-message", data.message);
  // });

  // socket.on("join-room", (room) => {
  //   socket.join(room);
  // });

  const WAITING_ROOM = "waiting_room";

  socket.on("join_waiting_room", (user) => {
    socket.join(WAITING_ROOM);

    console.log(
      `${user.username} is in the waiting room. Total waiting now = ${
        io.sockets.adapter.rooms.get(WAITING_ROOM).size
      }`
    );

    if (io.sockets.adapter.rooms.get(WAITING_ROOM).size == 2) {
      console.log("game started!");
      socket.to(WAITING_ROOM).emit("game_started");
    }
  });

  socket.on("leave_waiting_room", (user) => {
    socket.leave(WAITING_ROOM);
    console.log(
      `${user.username} has left the waiting room. Total waiting now = ${
        io.sockets.adapter.rooms.get(WAITING_ROOM)?.size
      }`
    );
  });
});

mongoose.connection.once("open", () => {
  console.log("Connected to MongoDB");

  server.listen(port, () => console.log(`Server listening on port ${port}`));
});

instrument(io, { auth: false, mode: "development" });
