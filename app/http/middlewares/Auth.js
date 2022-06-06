const jwt = require("jsonwebtoken");
const config = require("config");
require("cookie-parser")

module.exports = function (req, res, next) {
  const token = req.cookies.token;
  if (!token) return res.status(401).send({message: "Please Login First!"});

  try {
    const user = jwt.verify(token, config.get("jwtPrivateKey"));
    req.user = user;
    next();
  } catch (ex) {
    return res.status(401).send({message: "Please Login First!"});
  }
};
