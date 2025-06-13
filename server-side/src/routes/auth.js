
const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth/authController');
const validationMW = require('../middleware/validationMW'); 
const { signupSchema, loginSchema } = require('../utils/authSchemas'); 

router.post('/signup', validationMW(signupSchema), authController.signup);
router.post('/login', validationMW(loginSchema), authController.login);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);
router.get("/google", (req, res) => res.send("Google Auth Init Placeholder"));
router.get('/google/callback', authController.google);

module.exports = router;
