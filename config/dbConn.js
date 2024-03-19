const mongoose = require("mongoose");
const connectDB = async () => {
  try {
    console.log("trying to connect to ", process.env.DATABASE_URI);
    await mongoose.connect(process.env.DATABASE_URI);
  } catch (error) {
    console.log(error);
  }
};

module.exports = connectDB;
