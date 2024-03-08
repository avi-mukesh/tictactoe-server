const express = require("express");
const router = express.Router();
const usersController = require("../controllers/userController");
const verifyJWT = require("../middleware/verifyJWT");

// router.use(verifyJWT);
router.route("/:id").get(usersController.getUser);

module.exports = router;
