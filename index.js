require("dotenv").config();

const app = require("express")();

// app.use(cors());
const connectDB = require("./config/dbConn");
const cookieParser = require("cookie-parser");

const { default: mongoose } = require("mongoose");
app.use(cookieParser());

const server = require("http").createServer(app);
const io = require("socket.io")(server, {
  cors: {
    origin: "http://localhost:3000",
  },
});

const port = process.env.PORT || 3001;

connectDB();

app.get("/", (req, res) => {
  res.send({ message: "Hello world!" });
});

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);
  socket.on("send-message", (data) => {
    socket.to(data.room).emit("receive-message", data.message);
  });

  socket.on("join-room", (room) => {
    socket.join(room);
  });
});

mongoose.connection.once("open", () => {
  console.log("Connected to MongoDB");

  server.listen(port, () => console.log(`Server listening on port ${port}`));
});
