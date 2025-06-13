require('dotenv').config();

const emailConfig = {
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT) || 587,
  secure: process.env.EMAIL_SECURE === 'true', 
  user: process.env.EMAIL_USER,
  password: process.env.EMAIL_PASS,
  fromName: process.env.EMAIL_FROM_NAME || 'Medical Clinic',
  fromEmail: process.env.EMAIL_FROM_EMAIL || process.env.EMAIL_USER
};

module.exports = { emailConfig };
