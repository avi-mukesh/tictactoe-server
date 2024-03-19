const express = require("express");
const router = express.Router();
const gameController = require("../controllers/gameController");
const verifyJWT = require("../middleware/verifyJWT");

// router.use(verifyJWT);
router.route("/ongoing").get(gameController.getOngoingGames);
router.route("/previous").get(gameController.getPreviousGames);

module.exports = router;
