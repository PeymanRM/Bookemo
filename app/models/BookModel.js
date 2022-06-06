const mongoose = require("mongoose");
const bookSchema = new mongoose.Schema({
  _id: {type: Number , required: true, unique: [true , "hey"] },
  title: { type: String, required: true },
  isbn: String,
  pageCount: { type: Number, required: true },
  publishedDate: mongoose.Schema.Types.Date,
  thumbnailUrl: String,
  shortDescription: { type: String, required: true },
  longDescription: { type: String, required: true },
  status: { type: String, enum: ["PUBLISH", "MEAP"], required: true },
  authors: { type: Array, required: true },
  categories: Array,
});

const BookModel = mongoose.model("books", bookSchema);

module.exports = BookModel;
