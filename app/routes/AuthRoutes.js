const router = require("express").Router();
const controller = require("../http/controllers/AuthController");
const bodyParser = require("body-parser");
const urlencodedParser = bodyParser.urlencoded({ extended: false });
const Auth = require('../http/middlewares/Auth');

router.post("/register",urlencodedParser, controller.register);

router.post("/login", controller.login);

router.get("/verification/verify-email/:userId/:emailVerificationToken", controller.verifyEmail);

router.post("/verification/verify-account/:userId", controller.verifyAccount);

router.post("/forgot-password", controller.forgotPassword);

router.get("/forgot-password/login/:userId/:sendedVerificationToken", controller.forgotPasswordLogin);

router.put("/reset-password", Auth, controller.resetPassword);

module.exports = router;