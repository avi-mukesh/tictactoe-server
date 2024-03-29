const express = require("express");
const router = express.Router();
const usersController = require("../controllers/userController");
const verifyJWT = require("../middleware/verifyJWT");

router.use(verifyJWT);
router.route("/").get(usersController.getUsers);
router.route("/:id").get(usersController.getUser);
router.route("/:id").put(usersController.updateUserPassword);

module.exports = router;
