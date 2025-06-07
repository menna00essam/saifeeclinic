require('dotenv').config();

module.exports = {
  // Database
  MONGODB_URI: process.env.MONGODB_URI,
  
  // JWT
//   JWT_SECRET: process.env.JWT_SECRET,
//   JWT_EXPIRE: process.env.JWT_EXPIRE || '7d',
  
  // Server
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // Cloudinary
//   CLOUDINARY: {
//     CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
//     API_KEY: process.env.CLOUDINARY_API_KEY,
//     API_SECRET: process.env.CLOUDINARY_API_SECRET
//   },
  
//   // Email
//   EMAIL: {
//     HOST: process.env.EMAIL_HOST,
//     PORT: process.env.EMAIL_PORT,
//     USER: process.env.EMAIL_USER,
//     PASS: process.env.EMAIL_PASS
//   },
  
  // Twilio
//   TWILIO: {
//     ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
//     AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
//     PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER
//   },
  
  // Frontend
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000'
};
