const UserModel = require("../../models/UserModel");

module.exports = async function (req, res, next) {
  const user = await UserModel.findOne({ _id: req.user._id });
  if (user.role === "admin") {
    next();
  } else if (req.user.role === "admin") {
    // TODO: Implement the necessary strategy in case of a JWT key leak
    return res.status(403).send({ message: "Access Denied!" });
  } else return res.status(403).send({ message: "Access Denied!" });
};
