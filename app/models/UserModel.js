const mongoose = require('mongoose');
const jwt = require("jsonwebtoken");
const config = require("config");

const userSchema = new mongoose.Schema({
    name: {type: String, required: true},
    mobileNumber: {type: String, required: true , length: 11, unique: true},
    emailAddress: {type: String, required: true, lowrcase: true, unique: true},
    role: {type: String, enum:["user","admin"]},
    isVerified: {type: Boolean, default: false},
    password: {type: String, required: true},
    emailVerificationToken: String,
    verifiedEmailAddress: {type: Boolean, default: false},
    // ! EXPIRE DOESN'T WORK PROPERLY
    createdAt: {type: Date, default: Date.now, expires: 600},
});

userSchema.methods.generateAuthToken = function () {
    const data = {
      _id: this._id,
      name: this.name,
      role: this.role,
    };
  
    return jwt.sign(data, config.get("jwtPrivateKey"), {expiresIn: 24 * 60 * 60});
  };

const UserModel = mongoose.model("users", userSchema);

module.exports = UserModel;