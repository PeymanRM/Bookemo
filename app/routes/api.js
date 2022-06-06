const router = require("express").Router();
const BookRoutes = require("./BookRoutes");
const HomeRoutes = require("./HomeRoutes");
const AuthRoutes = require("./AuthRoutes");
const UserRoutes = require("./UserRoutes");

router.use("/", HomeRoutes);
router.use("/books", BookRoutes);
router.use("/auth", AuthRoutes);
router.use("/users", UserRoutes);


module.exports = router;
