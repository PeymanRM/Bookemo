const Joi = require('joi');

function registerValidator(data) {
    const schema = Joi.object({
        name: Joi.string().alphanum().min(3).trim().required(),
        mobileNumber: Joi.string().pattern(/^[0-9]+$/).length(11).trim().required(),
        emailAddress: Joi.string().email().trim().lowercase().required(),
        role: Joi.string().default("user").valid("user"),
        password: Joi.string().min(6).max(64).required(),
    }); 
    return schema.validate(data);   
}
function loginValidator(data) {
    const schema = Joi.object({
        mobileNumber: Joi.string().pattern(/^[0-9]+$/).length(11).trim(),
        emailAddress: Joi.string().email().trim(),
        password: Joi.string().max(64).required(),
    });
    return schema.validate(data);
}
//* for password change and password reset
function passwordValidator(data) {
    const schema = Joi.object({
        password: Joi.string().min(6).max(64).required(),
    }); 
    return schema.validate(data);   
}

module.exports = {registerValidator, loginValidator, passwordValidator};