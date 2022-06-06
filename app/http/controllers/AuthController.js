const UserModel = require("../../models/UserModel");
const {
  registerValidator,
  loginValidator,
  passwordValidator,
} = require("../validators/UserValidator");
const _ = require("lodash");
const argon2 = require("argon2");
const NodeCache = require("node-cache");
const myCache = new NodeCache({ stdTTL: 5 * 60, cacheperiod: 60 });
const Kavenegar = require("kavenegar");
const config = require("config") 

const api = Kavenegar.KavenegarApi({
  apikey: config.get("kavenegarApiKey"),
});
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const transport = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: "testmailfortestpurposes",
    pass: config.get("emailPass"),
  },
});

function sendConfirmationCode(mobileNumber, loginLink = undefined) {
  let textMessage = "";
  if (!loginLink) {
    const code = Math.floor(Math.random() * 900000 + 100000);
    myCache.set(mobileNumber, code);
    textMessage = `کد ورود به بوکمو: ${code}`;
  } else {
    textMessage = `لینک ورود به اکانت بوکمو: ${loginLink}`;
  }
  console.log(textMessage);
  api.Send(
    {
      message: textMessage,
      sender: "10004346",
      receptor: mobileNumber,
    },
    function (response, status) {
      if (status != 200) {
        console.log(response);
        return response;
      }
    }
  );
}

async function sendConfirmationEmail(userId, loginLink = undefined) {
  const user = await UserModel.findById(userId);
  let mailOptions = {};

  if (!loginLink) {
    const emailVerificationToken = crypto.randomBytes(16).toString("hex");
    user.emailVerificationToken = emailVerificationToken;
    await user.save();
    mailOptions = {
      from: "Bookemo <testmailfortestpurposes>",
      to: user.emailAddress,
      subject: "Confirm your Bookemo account",
      html: `<div style="font-family: sans-serif; background-color: #1f2833; color: #66fcf1; padding: 10px">
    Hello,<br>There's been an attempt to sign up on Bookemo with this email address. If it was you, click on confirm to verify your email.<br>
    <a href="http://localhost:3000/auth/verification/verify-email/${userId}/${emailVerificationToken}"><button style="color: #66fcf1; border: 2px solid #66fcf1; border-radius: 24px; margin: 10px; padding: 7px 10px; background-color: #1f2833; cursor: pointer;">Confirm</button></a>
    </div>`,
    };
  } else {
    mailOptions = {
      from: "Bookemo <testmailfortestpurposes>",
      to: user.emailAddress,
      subject: "Log into your Bookemo account",
      html: `<body style="font-family: sans-serif; background-color: #1f2833; color: #66fcf1; padding: 10px">
    Hello ${user.name},<br> 
    Sorry to hear you're having trouble logging into Bookemo. We can help you get straight back into your account.<br>
    <a href="${loginLink}"><button style="color: #66fcf1; border: 2px solid #66fcf1; border-radius: 24px; margin: 10px; padding: 7px 10px; background-color: #1f2833; cursor: pointer;">Log In</button></a>
    </body>`,
    };
  }
  transport.sendMail(mailOptions, function (error, response) {
    if (error && error != null) {
      console.log(error);
      return error.response;
    }
  });
}

class AuthController {
  async register(req, res) {
    if (req.body.password !== req.body.passwordReEntry)
      return res.status(400).send({ message: "Passwords doesn't match" });
    const userData = _.pick(req.body, [
      "name",
      "mobileNumber",
      "emailAddress",
      "password",
    ]);
    userData.emailAddress = userData.emailAddress.toLocaleLowerCase();
    const { error } = registerValidator(userData);
    if (error) return res.status(400).send({ message: error.message });
    for (const field in userData) {
      if (field != "password") {
        userData[field] = _.trim(userData[field]);
      }
    }

    let user = await UserModel.findOne({
      $or: [
        { emailAddress: userData.emailAddress },
        { mobileNumber: userData.mobileNumber },
      ],
    });
    if (user) {
      if (user.isVerified === false) {
        myCache.del(user.mobileNumber);
        await user.remove();
      } else
        return res.status(400).send({
          message: "Mobile number or email address already been used",
        });
    }
    userData.password = await argon2.hash(userData.password, {
      type: argon2.argon2id,
      memoryCost: 15360,
      timeCost: 2,
    });
    user = new UserModel({...userData, role: 'user'});
    await user.save();
    const sendCodeError = sendConfirmationCode(user.mobileNumber);
    // console.log(sendCodeError);
    // if (sendCodeError) return res.status(400).send({ message: sendCodeError });
    const sendEmailError = sendConfirmationEmail(user._id);
    // console.log(sendEmailError);
    // if (sendEmailError) return res.status(400).send({ message: error.message });
    res.render("VerificationPage", {
      emailAddress: user.emailAddress,
      mobileNumber: user.mobileNumber,
      userId: user._id,
    });
  }

  async login(req, res) {
    req.body.identifier = req.body.identifier.trim().toLocaleLowerCase();
    let emailAddress, mobileNumber;
    // ! regexes are not fully trustable
    if (
      req.body.identifier.match(
        /^([a-z\d\.-]+)@([a-z\d-]+)\.([a-z]{2,8})(\.[a-z]{2,8})?$/
      )
    ) {
      emailAddress = req.body.identifier;
    } else if (
      req.body.identifier.match(
        /^[0-9]+$/
      ) /* && req.body.identifier.length(11) */
    ) {
      mobileNumber = req.body.identifier;
    } else
      return res
        .status(400)
        .send({ message: "Invalid Email address/Mobile number" });
    const { error } = loginValidator({
      emailAddress,
      mobileNumber,
      password: req.body.password,
    });
    if (error)
      return res
        .status(400)
        .send({ message: "Invalid Email address/Mobile number or password" });
    let user;
    if (emailAddress) user = await UserModel.findOne({ emailAddress });
    else if (mobileNumber) user = await UserModel.findOne({ mobileNumber });
    if (!user)
      return res
        .status(400)
        .send({ message: "Wrong Email address/Mobile number or password" });
    if (await argon2.verify(user.password, req.body.password)) {
      if (user.isVerified) {
        const token = user.generateAuthToken();
        res.cookie("token", token, {
          httpOnly: true,
          maxAge: 24 * 60 * 60 * 1000,
          sameSite: "strict",
        });
        res
          // .header("Access-Control-Expose-headers", "X-Auth-Token")
          // .header("X-Auth-Token", token)
          .status(200)
          .send({ success: true });
      } else {
        res.render("VerificationPage", {
          method: "both",
          emailAddress: user.emailAddress,
          mobileNumber: user.mobileNumber,
          userId: user._id,
        });
      }
    } else {
      res
        .status(400)
        .send({ message: "Wrong Email address/Mobile number or password" });
    }
  }

  async verifyEmail(req, res) {
    const { userId, emailVerificationToken } = req.params;
    const user = await UserModel.findById(userId);
    // TODO: REQUEST VALIDATION NEEDED (especially 411)
    if (!user || !emailVerificationToken)
      return res.status(400).send({ message: "Invalid Request" });
    if (user.emailVerificationToken === emailVerificationToken) {
      user.emailVerificationToken = undefined;
      user.verifiedEmailAddress = true;
      await user.save();
      res.send(
        `<link rel="stylesheet" href="/css/styles.css"> <div align="center"><b>Your email is verified. Thanks for the confirmation. Dont forget to verify your mobile number as well.</b></div>`
      );
    } else return res.status(400).send({ message: "Invalid Request" });
  }

  async verifyAccount(req, res) {
    const userId = req.params.userId;
    const sendedConfirmationCode = req.body.confirmationCode;
    const user = await UserModel.findById(userId);
    if (!user)
      return res.status(410).send({ message: "The verification time expired" });
    if (user.isVerified === false) {
      if (user.verifiedEmailAddress === false) {
        return res
          .status(401)
          .send({ message: "Please verify your email first" });
      } else if (user.verifiedEmailAddress === true) {
        const confirmationCode = myCache.get(user.mobileNumber);

        if (confirmationCode != sendedConfirmationCode)
          return res
            .status(400)
            .send({ message: "The entered confirmation code is not valid" });
        else if (confirmationCode == sendedConfirmationCode) {
          myCache.del(user.mobileNumber);
          user.verifiedEmailAddress = undefined;
          user.createdAt = undefined;
          user.isVerified = true;
          await user.save();
          const token = user.generateAuthToken();
          res.cookie("token", token, {
            httpOnly: true,
            maxAge: 24 * 60 * 60 * 1000,
            sameSite: "strict",
          });
          res
            // .header("Access-Control-Expose-headers", "X-Auth-Token")
            // .header("X-Auth-Token", token)
            .status(200)
            .send({ success: true });
        }
      }
    }
  }

  async forgotPassword(req, res) {
    req.body.identifier = req.body.identifier.trim().toLocaleLowerCase();
    if (req.body.identifier == "")
      return res
        .status(400)
        .send({ message: "Plese enter your email or mobile number" });
    let emailAddress, mobileNumber;
    // ! regexes are not fully trustable
    if (
      req.body.identifier.match(
        /^([a-z\d\.-]+)@([a-z\d-]+)\.([a-z]{2,8})(\.[a-z]{2,8})?$/
      )
    ) {
      emailAddress = req.body.identifier;
    } else if (req.body.identifier.match(/^[0-9]+$/)) {
      mobileNumber = req.body.identifier;
    } else
      return res
        .status(400)
        .send({ message: "Invalid Email address/Mobile number" });
    // * Validation because of untrustable regexes
    const { error } = loginValidator({
      emailAddress,
      mobileNumber,
      password: ".",
    });
    if (error)
      return res
        .status(400)
        .send({ message: "Invalid Email address/Mobile number" });
    if (emailAddress) {
      const user = await UserModel.findOne({ emailAddress });
      if (user && user.isVerified === true) {
        const verificationToken = crypto.randomBytes(16).toString("hex");
        const loginLink = `http://localhost:3000/auth/forgot-password/login/${user._id}/${verificationToken}`;
        myCache.set(user._id.toString(), verificationToken);
        sendConfirmationEmail(user._id, loginLink);
      }
    } else if (mobileNumber) {
      console.log("2.2");
      const user = await UserModel.findOne({ mobileNumber });
      if (user && user.isVerified === true) {
        const verificationToken = crypto.randomBytes(16).toString("hex");
        const loginLink = `http://localhost:3000/auth/forgot-password/login/${user._id}/${verificationToken}`;
        myCache.set(user._id.toString(), verificationToken);
        sendConfirmationCode(user.mobileNumber, loginLink);
      }
    }
    res.sendStatus(200);
  }

  async forgotPasswordLogin(req, res) {
    const { userId, sendedVerificationToken } = req.params;
    if (!userId || !sendedVerificationToken)
      return res.status(400).send({ message: "Invalid Request" });
    const verificationToken = myCache.get(userId);
    if (verificationToken === sendedVerificationToken) {
      const user = await UserModel.findById(userId);
      const token = user.generateAuthToken();
      res.cookie("token", token, {
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000,
        sameSite: "strict",
      });
      res.render("PasswordResetPage");
    } else return res.status(400).send({ message: "Invalid Request" });
  }

  async resetPassword(req, res) {
    if (req.body.password !== req.body.passwordReEntry)
      return res.status(400).send({ message: "Passwords doesn't match" });
    const { error } = passwordValidator({ password: req.body.password });
    if (error) return res.status(400).send({ message: error.message });
    const userId = req.body.path.slice(28).split("/")[0];
    const sendedVerificationToken = req.body.path.slice(28).split("/")[1];
    const user = await UserModel.findById(userId);
    if (!user || !sendedVerificationToken || req.user._id.toString() != userId)
      return res.status(400).send({ message: "Invalid Request" });
    const verificationToken = myCache.get(userId);
    if (verificationToken === sendedVerificationToken) {
      myCache.del(userId);
      req.body.password = await argon2.hash(req.body.password, {
        type: argon2.argon2id,
        memoryCost: 15360,
        timeCost: 2,
      });
      user.password = req.body.password;
      user.verifiedEmailAddress = undefined;
      user.createdAt = undefined;
      await user.save();
      res.sendStatus(200);
    } else return res.status(400).send({ message: "Invalid Request" });
  }
}

module.exports = new AuthController();
