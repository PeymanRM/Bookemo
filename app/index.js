const express = require("express");
const app = express();
require("express-async-errors");
const winston = require('winston');
const mongoose = require("mongoose");
const api = require("./routes/api");
const errorHandler = require("./http/middlewares/ErrorHandler");
const cookieParser = require('cookie-parser')

class Application {
  constructor() {
    this.setupServer();
    this.setupDatabase();
    this.setupRoutesAndMiddlewares();
    this.setupConfig();
  }

  setupConfig() {
      app.set("view engine", "ejs");

      winston.add(new winston.transports.File({ filename: "error-log.log"}));
      process.on('uncaughtException', (err) => {
        console.log(err);
        winston.error(err.message, err);
      });
      process.on('unhandledRejection', (err) => {
        console.log(err);
        winston.error(err.message, err);
      });
  }

  setupRoutesAndMiddlewares() {
    app.use(express.json());
    app.use(express.static("./public"));
    app.use(cookieParser());

    app.use("/", api);
    
    app.use(errorHandler);
  }

  setupDatabase() {
    mongoose
      .connect("mongodb://localhost:27017/Bookemo", {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      })
      .then(() => {
        console.log("connected to the database");
      })
      .catch((err) => {
        console.log("Something went wrong: ", err.message);
      });
  }

  setupServer() {
    const port = process.env.myport || 3000;
    app.listen(port, (error) => {
      if (error) console.log(error);
      else console.log(`app is listening to ${port}`);
    });
  }
}

module.exports = Application;
