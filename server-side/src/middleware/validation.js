const { body, query, param, validationResult } = require('express-validator');
const { responseHandler } = require('../utils/responseHandler');

/**
 * Middleware to handle validation errors
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(error => ({
      field: error.path || error.param,
      message: error.msg,
      value: error.value
    }));
    
    return responseHandler.error(res, 'Validation failed', 400, formattedErrors);
  }
  next();
};

/**
 * Contact form validation
 */
const validateContactForm = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
    
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Invalid email address')
    .normalizeEmail(),
    
  body('phone')
    .optional()
    .trim()
    .isMobilePhone(['ar-EG', 'ar-SA', 'en-US'])
    .withMessage('Invalid phone number'),
    
  body('subject')
    .trim()
    .notEmpty()
    .withMessage('Subject is required')
    .isLength({ min: 5, max: 100 })
    .withMessage('Subject must be between 5 and 100 characters'),
    
  body('message')
    .trim()
    .notEmpty()
    .withMessage('Message is required')
    .isLength({ min: 10, max: 1000 })
    .withMessage('Message must be between 10 and 1000 characters'),
    
  handleValidationErrors
];

/**
 * Pagination validation
 */
const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be an integer greater than 0'),
    
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
    
  handleValidationErrors
];

/**
 * Search validation
 */
const validateSearch = [
  query('q')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search query must be between 1 and 100 characters'),
    
  handleValidationErrors
];

/**
 * Doctor ID validation
 */
const validateDoctorId = [
  param('id')
    .isMongoId()
    .withMessage('Invalid doctor ID'),
    
  handleValidationErrors
];

/**
 * Blog ID validation
 */
const validateBlogId = [
  param('id')
    .isMongoId()
    .withMessage('Invalid blog ID'),
    
  handleValidationErrors
];

/**
 * Author ID validation
 */
const validateAuthorId = [
  param('authorId')
    .isMongoId()
    .withMessage('Invalid author ID'),
    
  handleValidationErrors
];

/**
 * Tag validation
 */
const validateTag = [
  param('tag')
    .trim()
    .notEmpty()
    .withMessage('Tag name is required')
    .isLength({ min: 1, max: 50 })
    .withMessage('Tag name must be between 1 and 50 characters'),
    
  handleValidationErrors
];

/**
 * Date validation for schedule
 */
const validateScheduleDate = [
  query('date')
    .optional()
    .isISO8601()
    .withMessage('Invalid date format')
    .custom((value) => {
      const date = new Date(value);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (date < today) {
        throw new Error('Date must be today or in the future');
      }
      return true;
    }),
    
  query('days')
    .optional()
    .isInt({ min: 1, max: 30 })
    .withMessage('Days must be between 1 and 30'),
    
  handleValidationErrors
];

/**
 * Specialization filter validation
 */
const validateSpecializationFilter = [
  query('specialization')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Specialization must be between 2 and 50 characters'),
    
  handleValidationErrors
];

/**
 * Sort validation
 */
const validateSort = [
  query('sort')
    .optional()
    .isIn(['latest', 'oldest', 'title', 'name', 'experience'])
    .withMessage('Invalid sort option'),
    
  handleValidationErrors
];

/**
 * General text input validation
 */
const validateTextInput = (fieldName, minLength = 1, maxLength = 100) => [
  body(fieldName)
    .trim()
    .isLength({ min: minLength, max: maxLength })
    .withMessage(`${fieldName} must be between ${minLength} and ${maxLength} characters`),
    
  handleValidationErrors
];

/**
 * Email validation
 */
const validateEmail = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('Invalid email address')
    .normalizeEmail(),
    
  handleValidationErrors
];

/**
 * Phone validation
 */
const validatePhone = [
  body('phone')
    .optional()
    .trim()
    .isMobilePhone(['ar-EG', 'ar-SA', 'en-US'])
    .withMessage('Invalid phone number'),
    
  handleValidationErrors
];

/**
 * MongoDB ObjectId validation
 */
const validateObjectId = (paramName) => [
  param(paramName)
    .isMongoId()
    .withMessage(`Invalid ${paramName} ID`),
    
  handleValidationErrors
];

/**
 * URL validation
 */
const validateUrl = (fieldName) => [
  body(fieldName)
    .optional()
    .isURL()
    .withMessage(`${fieldName} must be a valid URL`),
    
  handleValidationErrors
];

/**
 * Number range validation
 */
const validateNumberRange = (fieldName, min = 0, max = 999999) => [
  body(fieldName)
    .optional()
    .isNumeric()
    .withMessage(`${fieldName} must be a number`)
    .custom((value) => {
      const num = parseFloat(value);
      if (num < min || num > max) {
        throw new Error(`${fieldName} must be between ${min} and ${max}`);
      }
      return true;
    }),
    
  handleValidationErrors
];

/**
 * Array validation
 */
const validateArray = (fieldName, minLength = 0, maxLength = 10) => [
  body(fieldName)
    .optional()
    .isArray({ min: minLength, max: maxLength })
    .withMessage(`${fieldName} must be an array of ${minLength} to ${maxLength} items`),
    
  handleValidationErrors
];

module.exports = {
  validateContactForm,
  validatePagination,
  validateSearch,
  validateDoctorId,
  validateBlogId,
  validateAuthorId,
  validateTag,
  validateScheduleDate,
  validateSpecializationFilter,
  validateSort,
  validateTextInput,
  validateEmail,
  validatePhone,
  validateObjectId,
  validateUrl,
  validateNumberRange,
  validateArray,
  handleValidationErrors
};


