const Joi = require("joi");
Joi.objectId = require("joi-objectid")(Joi);

function validateBook(data) {
  const schema = Joi.object({
    _id: Joi.number().required(),
    title: Joi.string().required(),
    isbn: Joi.string().allow(""),
    pageCount: Joi.number().required(),
    publishedDate: Joi.date().iso().allow(""),
    thumbnailUrl: Joi.string().allow(""),
    shortDescription: Joi.string().required(),
    longDescription: Joi.string().required(),
    status: Joi.string().custom((value, helpers) => {
      if (value != "PUBLISH" && value != "MEAP")
        return helpers.error("any.invalid");
      else return value;
    }),
    authors: Joi.array().items(Joi.string().min(3)).required(),
    categories: Joi.array().items(Joi.string()),
  });
  return schema.validate(data);
}

module.exports = validateBook;
