const router = require("express").Router();
const controller = require("../http/controllers/UserController");
const Auth = require('../http/middlewares/Auth');
const Admin = require('../http/middlewares/Admin');


router.get("/profile", Auth, controller.getUserProfile);

router.get("/logout", Auth, controller.logout);

router.get("/", [Auth, Admin], controller.getUsersList);

router.post("/delete-account", Auth, controller.deleteAccount);

router.put("/promote", [Auth, Admin], controller.promoteUser);

router.delete("/delete/:userId", [Auth, Admin], controller.deleteUser);

module.exports = router;