const BookModel = require("../../models/BookModel");
const validateBook = require("../validators/BookValidator");
const fs = require("fs");

class BookController {
  async getBooksList(req, res) {
    const q = req.query.q ? req.query.q : undefined;
    const bookCount = await BookModel.find({
      title: {
        $regex: new RegExp(q),
        $options: "i",
      },
    }).countDocuments();
    const pageNumber = req.query.page ? req.query.page : 1;
    const booksList = await BookModel.find({
      title: {
        $regex: new RegExp(q),
        $options: "i",
      },
    })
      .skip((pageNumber - 1) * 20)
      .limit(20);
    res.render("BooksList", {
      booksList,
      pageCount: Math.ceil(bookCount / 20),
    });
  }

  getCreateForm(req, res) {
    res.render("BookCreateForm");
  }

  async getBook(req, res) {
    BookModel.findById(req.params.id)
      .then((book) => {
        if (!book) return res.status(404).send("not found");
        res.render("Book", { book, role: req.user.role });
      })
      .catch((err) => {
        if (
          err.message ==
          "Operation `books.findOne()` buffering timed out after 10000ms"
        )
          return res.status(504).send(err.message);
        res.status(400).send(err.message);
      });
  }

  async getEditForm(req, res) {
    const book = await BookModel.findById(req.params.id);
    if (!book) return res.status(404).send("Book not found");
    res.render("BookEditForm", { book });
  }

  async createBook(req, res) {
    // TODO: CHECK req.file FORMAT (415 ERROR)
    for (const field in req.body) {
      if (req.body[field] == "") delete req.body[field];
    }
    if (req.body.publishedDate)
      req.body.publishedDate = new Date(req.body.publishedDate);
    if (req.body.authors) req.body.authors = req.body.authors.split(", ");
    if (req.body.categories)
      req.body.categories = req.body.categories.split(", ");
    if (req.file) {
      req.body.thumbnailUrl = `http://localhost:3000/thumbnails/${req.file.filename}`;
    }
    delete req.body.thumbnail;
    delete req.body.undefined;
    const { error } = validateBook({ ...req.body });
    if (error) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.log(err);
      });
      return res.status(400).send(error.message);
    }
    try {
      let book = await BookModel.findById(req.body._id);
      if (book) return res.status(400).send("id must be unique");
      book = new BookModel(req.body);
      book = await book.save();
      res.status(201).render("Book", { book, role:req.user.role });
    } catch (ex) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.log(err);
      });
      let errorMessages = "";
      for (const field in ex.errors) {
        errorMessages += `${ex.errors[field].message} <br>`;
      }
      res.status(400).send(errorMessages);
    }
  }

  async updateBook(req, res) {
    req.body._id = parseInt(req.body._id);
    let oldVersionBook = await BookModel.findById(req.params.id);
    if (!oldVersionBook)
      return res.status(404).send({ message: "book not found" });
    if (!req.body.thumbnailUrl &&  oldVersionBook.thumbnailUrl) {
      const path = `public\\thumbnails\\${oldVersionBook.thumbnailUrl.slice(33)}`;
      fs.unlink(path, (err) => {
        if (err) console.log(err);
      });
    }
    for (const field in req.body) {
      if (req.body[field] == "") {
        oldVersionBook[field] = undefined;
        delete req.body[field];
      }
    }
    if (req.body.publishedDate)
      req.body.publishedDate = new Date(req.body.publishedDate);
    if (req.body.authors) req.body.authors = req.body.authors.split(", ");
    if (req.body.categories)
      req.body.categories = req.body.categories.split(", ");
    const { error } = validateBook(req.body);
    if (error) return res.status(400).send({ message: error.message });

    // let result = await BookModel.findByIdAndUpdate(req.params.id, {
    //   $set: {...req.body}
    // },{new: true});

    if (req.body._id && req.body._id != req.params.id) {
      let book = await BookModel.findById(req.body._id);
      if (book) return res.status(400).send({ message: "id must be unique" });

      book = new BookModel({ ...oldVersionBook._doc, ...req.body });
      await oldVersionBook.remove();
      book = await book.save();
      res.status(200).send({ id: book._id });
    } else {
      delete req.body._id;
      await oldVersionBook.save();
      let result = await BookModel.updateOne({ _id: req.params.id }, req.body);
      res.send({ id: req.params.id });
    }
  }

  async deleteBook(req, res) {
    //const result = await BookModel.findByIdAndDelete(req.params.id);
    const result = await BookModel.deleteOne({ _id: req.params.id });
    if (result.n == 0) return res.status(404).send("book not found");
    res.send(result);
  }
}

module.exports = new BookController();
