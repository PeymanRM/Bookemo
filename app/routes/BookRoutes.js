const router = require("express").Router();
const controller = require("../http/controllers/BookController");
const bodyParser = require("body-parser");
const urlencodedParser = bodyParser.urlencoded({ extended: false });
const multer  = require('multer');
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, 'public/thumbnails');
    },
    filename: function (req, file, cb) {
      cb(null, Date.now() + '-' + file.originalname);
    }
  })
  
const upload = multer({ storage: storage });
const Auth = require('../http/middlewares/Auth');
const Admin = require('../http/middlewares/Admin');

router.get("/", Auth, controller.getBooksList);

router.get("/create", [Auth, Admin], controller.getCreateForm);

router.get("/:id", Auth, controller.getBook);

router.get("/:id/edit", [Auth, Admin], controller.getEditForm);

router.post("/", [urlencodedParser, upload.single("thumbnail"), Auth, Admin], controller.createBook);

router.put("/:id/edit", [Auth, Admin], controller.updateBook);

router.delete("/:id", [Auth, Admin], controller.deleteBook);

module.exports = router;
