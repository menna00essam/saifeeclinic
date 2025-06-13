
const Joi = require("joi");

const signupSchema = Joi.object({
  first_name: Joi.string().trim().min(2).max(50).required().messages({
    "string.empty": "First name is required",
    "string.min": "First name must be at least 2 characters long",
    "string.max": "First name must be at most 50 characters long",
    "any.required": "First name is required",
  }),

  last_name: Joi.string().trim().min(2).max(50).required().messages({
    "string.empty": "Last name is required",
    "string.min": "Last name must be at least 2 characters long",
    "string.max": "Last name must be at most 50 characters long",
    "any.required": "Last name is required",
  }),

  email: Joi.string().trim().email().required().messages({
    "string.empty": "Email is required",
    "string.email": "Invalid email address",
    "any.required": "Email is required",
  }),

  phone: Joi.string()
    .trim()
    .pattern(/^(01)(0|1|2|5)[0-9]{8}$/) 
    .required()
    .messages({
      "string.empty": "Phone number is required",
      "string.pattern.base": "Invalid phone number format",
      "any.required": "Phone number is required",
    }),

  password: Joi.string().trim().min(6).required().messages({
    "string.empty": "Password is required",
    "string.min": "Password must be at least 6 characters long",
    "any.required": "Password is required",
  }),

  role: Joi.string()
    .valid("Admin", "Doctor", "Patient")
    .optional() 
    .default("Patient") 
    .messages({
      "any.only": "Invalid role. Must be Admin, Doctor, or Patient",
    }),

  doctor_profile: Joi.object({
    specialization: Joi.string().optional(),
    license_number: Joi.string().optional(),
    experience: Joi.number().min(0).optional(),
    qualifications: Joi.array()
      .items(
        Joi.object({
          degree: Joi.string().required(),
          institution: Joi.string().required(),
          year: Joi.number()
            .integer()
            .min(1900)
            .max(new Date().getFullYear())
            .required(),
        })
      )
      .optional(),
    biography: Joi.string().optional(),
    consultation_fee: Joi.number().min(0).optional(),
    is_available: Joi.boolean().optional().default(true),
  }).when("role", {
    is: "Doctor",
    then: Joi.object({
      specialization: Joi.string()
        .required()
        .messages({ "any.required": "Specialization is required for doctors" }),
      license_number: Joi.string()
        .required()
        .messages({ "any.required": "License number is required for doctors" }),
    }).unknown(true), 
    otherwise: Joi.forbidden(),
  }),

  patient_profile: Joi.object({
    date_of_birth: Joi.date().iso().optional(),
    gender: Joi.string().valid("male", "female", "other").optional(),
    blood_type: Joi.string().optional(),
    allergies: Joi.array().items(Joi.string()).optional(),
    chronic_diseases: Joi.array().items(Joi.string()).optional(),
    emergency_contact: Joi.object({
      name: Joi.string().required(),
      phone: Joi.string().required(),
      relationship: Joi.string().optional(),
    }).optional(),
  }).when("role", {
    is: "Patient",
    then: Joi.object().unknown(true), 
    otherwise: Joi.forbidden(), 
  }),
}).unknown(false); 

const loginSchema = Joi.object({
  email: Joi.string().trim().email().required().messages({
    "string.empty": "Email is required",
    "string.email": "Invalid email address",
    "any.required": "Email is required",
  }),
  password: Joi.string().trim().required().messages({
    "string.empty": "Password is required",
    "any.required": "Password is required",
  }),
}).unknown(false); 

module.exports = {
  signupSchema,
  loginSchema,
};
