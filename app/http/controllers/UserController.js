const UserModel = require("../../models/UserModel");
const _ = require("lodash");
const argon2 = require("argon2");


class UserController {
  async getUserProfile(req, res) {
    const user = await UserModel.findById(req.user._id);
    res.send(_.pick(user, ["name", "emailAddress", "mobileNumber", "role"]));
  }

  logout(req, res) {
    res.cookie("token", "", { maxAge: 1 });
    res.sendStatus(200);
  }

  async getUsersList(req, res) {
    const q = req.query.q ? req.query.q : undefined;
    const userCount = await UserModel.find({
      $and: [
        {
          $or: [
            {
              emailAddress: {
                $regex: new RegExp(q),
                $options: "i",
              },
            },
            {
              mobileNumber: {
                $regex: new RegExp(q),
                $options: "i",
              },
            },
          ],
        },
        // { role: "user" },
      ],
    }).countDocuments();
    const pageNumber = req.query.page ? req.query.page : 1;
    const usersList = await UserModel.find({
      $and: [
        {
          $or: [
            {
              emailAddress: {
                $regex: new RegExp(q),
                $options: "i",
              },
            },
            {
              mobileNumber: {
                $regex: new RegExp(q),
                $options: "i",
              },
            },
          ],
        },
        // { role: "user" },
      ],
    })
      .select("name mobileNumber emailAddress role")
      .skip((pageNumber - 1) * 20)
      .limit(20);
    res.render("UsersList", {
      usersList,
      pageCount: Math.ceil(userCount / 20),
    });
  }

  async deleteAccount(req, res) {
    const user = await UserModel.findById(req.user._id);
    if (await argon2.verify(user.password, req.body.password)) {
      await user.delete();
      res.cookie("token", "", { maxAge: 1 });
      res.sendStatus(200);
    } else return res.status(409).send({message: "Wrong Password"});
  }

  async promoteUser(req, res) {
    const user = await UserModel.findById(req.body.userId);
    if (!user) return res.status(404).send({message: "User not found"});
    user.role = 'admin';
    user.verifiedEmailAddress = undefined;
    user.createdAt = undefined;
    await user.save();
    res.sendStatus(200);
  }

  async deleteUser(req, res) {
    const result = await UserModel.deleteOne({ _id: req.params.userId });
    if (result.n == 0) return res.status(404).send({message: "User not found"});
    res.sendStatus(200);
  }
}

module.exports = new UserController();
