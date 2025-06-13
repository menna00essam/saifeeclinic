// const userModel = require("../models/user.model");
// const bcrypt = require("bcrypt");
// const jwt = require("jsonwebtoken");

// const transporter = require("../utils/emailTransporter");
// const userValidation = require("../utils/userValidation");
// const asyncWrapper = require("../middlewares/asyncWrapper.middleware");
// const AppError = require("../utils/appError");
// const httpStatusText = require("../utils/httpStatusText");

// // Helper: Token Generator
// const generateToken = (payload, expiresIn = null) => {
//   const options = expiresIn ? { expiresIn } : undefined;
//   console.log(`[TOKEN] Generating token for user: ${payload.email}`);
//   return jwt.sign(payload, process.env.JWT_SECRET, options);
// };

// // POST /signup
// const signup = asyncWrapper(async (req, res, next) => {
//   const userData = req.body;
//   console.log("[SIGNUP] Received signup data:", userData.email); // Assuming userValidation is updated to check for first_name, last_name, and phone

//   if (!userValidation(userData)) {
//     console.warn("[SIGNUP] Invalid user data");
//     return next(new AppError("Invalid user data.", 400, httpStatusText.FAIL));
//   } // No username check needed as it's removed

//   if (userData.phone) {
//     // Changed from userData.mobile to userData.phone
//     const existingUserByPhone = await userModel.findOne({
//       phone: userData.phone, // Changed from mobile to phone
//     });
//     if (existingUserByPhone) {
//       return next(
//         new AppError("existing phone number", 400, httpStatusText.FAIL)
//       );
//     }
//   }

//   const existingUser = await userModel.findOne({ email: userData.email });
//   if (existingUser) {
//     console.warn("[SIGNUP] Email already exists:", userData.email);
//     return next(
//       new AppError(
//         "User with this email already exists.",
//         400,
//         httpStatusText.FAIL
//       )
//     );
//   }

//   const salt = await bcrypt.genSalt(10);
//   userData.password = await bcrypt.hash(userData.password, salt); // Set default role to 'Patient' if not provided in the request, matching enum in user.model.js

//   if (!userData.role) {
//     userData.role = "Patient";
//   } // Ensure userData contains first_name, last_name, phone, and the assigned role

//   await userModel.create(userData);
//   console.log("[SIGNUP] User created successfully:", userData.email);

//   res.status(201).json({
//     status: httpStatusText.SUCCESS,
//     message: "User signed up successfully",
//   });
// });

// // POST /login
// const login = asyncWrapper(async (req, res, next) => {
//   const { email, password } = req.body;

//   console.log("[LOGIN] Attempted login with email:", email);
//   console.log("[LOGIN] Password from request:", password); // Ensure that first_name, last_name, phone, and role are not excluded in the user model's schema

//   const user = await userModel.findOne({ email }).select("+password");
//   if (!user) {
//     console.warn("[LOGIN] Email not found:", email);
//     return next(
//       new AppError("Invalid email or password.", 400, httpStatusText.FAIL)
//     );
//   }

//   console.log(
//     "[LOGIN] User password from DB (Hashed) - Before Full Object:",
//     user.password
//   );
//   console.log("[LOGIN] Full user object from DB:", user);
//   console.log(
//     "[LOGIN] User password from DB (Hashed) - After Full Object:",
//     user.password
//   );

//   const isPasswordValid = await bcrypt.compare(password, user.password);
//   if (!isPasswordValid) {
//     console.warn("[LOGIN] Invalid password for:", email);
//     return next(
//       new AppError("Invalid email or password.", 400, httpStatusText.FAIL)
//     );
//   } // Add first_name, last_name, and phone to the token payload

//   const token = generateToken({
//     _id: user._id,
//     email: user.email,
//     first_name: user.first_name, // Changed from firstname to first_name
//     last_name: user.last_name, // Changed from lastname to last_name
//     phone: user.phone, // Added phone to token payload
//     role: user.role, // Role is now guaranteed to be 'Admin', 'Doctor', or 'Patient'
//     thumbnail: user.thumbnail,
//   });

//   console.log("[LOGIN] User logged in:", email);

//   res.status(200).json({
//     status: httpStatusText.SUCCESS,
//     message: "Logged in successfully",
//     data: { token },
//   });
// });

// // GET /auth/google/callback
// const google = (req, res) => {
//   console.log("[GOOGLE AUTH] Google login callback for:", req.user.email); // Add first_name, last_name, phone, and role to the token payload from req.user

//   const token = generateToken({
//     _id: req.user._id,
//     email: req.user.email,
//     first_name: req.user.first_name, // Changed from firstname to first_name
//     last_name: req.user.last_name, // Changed from lastname to last_name
//     phone: req.user.phone, // Added phone to token payload
//     role: req.user.role, // Ensure your Google authentication strategy populates this with 'Admin', 'Doctor', or 'Patient'
//     thumbnail: req.user.thumbnail,
//   });

//   console.log("[GOOGLE AUTH] Redirecting with token");
//   res.redirect(`http://localhost:4200/auth/login?token=${token}`);
// };

// // POST /forgot-password
// const forgotPassword = asyncWrapper(async (req, res, next) => {
//   const { email } = req.body;
//   console.log("[FORGOT PASSWORD] Request for:", email);

//   const user = await userModel.findOne({ email });
//   if (!user) {
//     console.warn("[FORGOT PASSWORD] Email not found:", email);
//     return next(
//       new AppError(
//         "User with this email doesn't exist.",
//         400,
//         httpStatusText.FAIL
//       )
//     );
//   }

//   const resetToken = generateToken({ email: user.email }, "10m");
//   user.resetToken = resetToken;
//   user.resetTokenExpiry = Date.now() + 10 * 60 * 1000;

//   await user.save();

//   const resetLink = `http://localhost:4200/auth/reset-password?token=${user.resetToken}`;

//   const mailOptions = {
//     from: process.env.EMAIL_USER,
//     to: user.email,
//     subject: "Reset Password", // Update the greeting to use first_name and last_name
//     text: `Dear ${user.first_name || ""} ${
//       user.last_name || ""
//     },\n\nClick the link to reset your password: ${resetLink}`,
//   };

//   transporter.sendMail(mailOptions, (error, info) => {
//     if (error) {
//       console.error("[EMAIL] Failed to send reset email:", error);
//       return next(
//         new AppError("Error sending email.", 500, httpStatusText.ERROR)
//       );
//     }

//     console.log("[EMAIL] Reset email sent to:", user.email);
//     res.status(200).json({
//       status: httpStatusText.SUCCESS,
//       message: "Email sent successfully.",
//     });
//   });
// });

// // POST /reset-password
// const resetPassword = asyncWrapper(async (req, res, next) => {
//   const { token, password } = req.body;
//   console.log("[RESET PASSWORD] Token received:", token);

//   const user = await userModel.findOne({ resetToken: token });
//   if (!user || user.resetTokenExpiry < Date.now()) {
//     console.warn("[RESET PASSWORD] Invalid or expired token.");
//     return next(
//       new AppError("Invalid or expired token.", 400, httpStatusText.FAIL)
//     );
//   }

//   const salt = await bcrypt.genSalt(10);
//   user.password = await bcrypt.hash(password, salt);
//   user.resetToken = null;
//   user.resetTokenExpiry = null;

//   await user.save();

//   console.log("[RESET PASSWORD] Password reset for:", user.email);

//   res.status(200).json({
//     status: httpStatusText.SUCCESS,
//     message: "Password reset successfully.",
//   });
// });

// // POST /logout
// const logout = asyncWrapper(async (req, res, next) => {
//   const token = req.headers.authorization?.split(" ")[1];

//   if (!token) {
//     console.warn("[LOGOUT] No token provided");
//     return next(new AppError("Token is required", 400, httpStatusText.FAIL));
//   }

//   res.status(200).json({
//     status: httpStatusText.SUCCESS,
//     message: "Logged out successfully.",
//   });
// });

// module.exports = {
//   signup,
//   login,
//   google,
//   forgotPassword,
//   resetPassword,
//   logout,
// };

const userModel = require("../../models/User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const transporter = require("../../utils/emailTransporter");
// REMOVED: const userValidation = require("../utils/userValidation"); // لم نعد نستخدمه
const asyncWrapper = require("../../middleware/asyncWrapper.middleware");
const AppError = require("../../utils/errors/APIError"); // هذا هو الـ AppError القديم، تأكد من استخدام APIError إذا تم استبداله
const httpStatusText = require("../../utils/httpStatusText");

// Helper: Token Generator
const generateToken = (payload, expiresIn = null) => {
  const options = expiresIn ? { expiresIn } : undefined;
  console.log(`[TOKEN] Generating token for user: ${payload.email}`);
  return jwt.sign(payload, process.env.JWT_SECRET, options);
};

// POST /signup
const signup = asyncWrapper(async (req, res, next) => {
  const userData = req.body;
  console.log("[SIGNUP] Received signup data:", userData.email); // الـ Validation بيتم دلوقتي بواسطة validationMW في الـ routes // Check for existing phone number

  if (userData.phone) {
    const existingUserByPhone = await userModel.findOne({
      phone: userData.phone,
    });
    if (existingUserByPhone) {
      return next(
        new AppError("existing phone number", 400, httpStatusText.FAIL)
      );
    }
  } // Check for existing email

  const existingUser = await userModel.findOne({ email: userData.email });
  if (existingUser) {
    console.warn("[SIGNUP] Email already exists:", userData.email);
    return next(
      new AppError(
        "User with this email already exists.",
        400,
        httpStatusText.FAIL
      )
    );
  }

  const salt = await bcrypt.genSalt(10);
  userData.password = await bcrypt.hash(userData.password, salt); // تحديد الدور الافتراضي لو لم يتم إرساله

  if (!userData.role) {
    userData.role = "Patient";
  }

  await userModel.create(userData);
  console.log("[SIGNUP] User created successfully:", userData.email);

  res.status(201).json({
    status: httpStatusText.SUCCESS,
    message: "User signed up successfully",
  });
});

// POST /login
const login = asyncWrapper(async (req, res, next) => {
  const { email, password } = req.body;

  console.log("[LOGIN] Attempted login with email:", email);
  console.log("[LOGIN] Password from request:", password);

  const user = await userModel.findOne({ email }).select("+password");
  if (!user) {
    console.warn("[LOGIN] Email not found:", email);
    return next(
      new AppError("Invalid email or password.", 400, httpStatusText.FAIL)
    );
  }

  console.log(
    "[LOGIN] User password from DB (Hashed) - Before Full Object:",
    user.password
  );
  console.log("[LOGIN] Full user object from DB:", user);
  console.log(
    "[LOGIN] User password from DB (Hashed) - After Full Object:",
    user.password
  );

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    console.warn("[LOGIN] Invalid password for:", email);
    return next(
      new AppError("Invalid email or password.", 400, httpStatusText.FAIL)
    );
  }

  const token = generateToken({
    _id: user._id,
    email: user.email,
    first_name: user.first_name,
    last_name: user.last_name,
    phone: user.phone,
    role: user.role,
    thumbnail: user.thumbnail, // تأكد إن ده موجود في الـ user model لو لسه بتستخدمه
  });

  console.log("[LOGIN] User logged in:", email);

  res.status(200).json({
    status: httpStatusText.SUCCESS,
    message: "Logged in successfully",
    data: { token },
  });
});

// GET /auth/google/callback
const google = (req, res) => {
  console.log("[GOOGLE AUTH] Google login callback for:", req.user.email);

  const token = generateToken({
    _id: req.user._id,
    email: req.user.email,
    first_name: req.user.first_name,
    last_name: req.user.last_name,
    phone: req.user.phone,
    role: req.user.role,
    thumbnail: req.user.thumbnail,
  });

  console.log("[GOOGLE AUTH] Redirecting with token");
  res.redirect(`http://localhost:4200/auth/login?token=${token}`);
};

// POST /forgot-password
const forgotPassword = asyncWrapper(async (req, res, next) => {
  const { email } = req.body;
  console.log("[FORGOT PASSWORD] Request for:", email);

  const user = await userModel.findOne({ email });
  if (!user) {
    console.warn("[FORGOT PASSWORD] Email not found:", email);
    return next(
      new AppError(
        "User with this email doesn't exist.",
        400,
        httpStatusText.FAIL
      )
    );
  }

  const resetToken = generateToken({ email: user.email }, "10m");
  user.resetToken = resetToken;
  user.resetTokenExpiry = Date.now() + 10 * 60 * 1000;

  await user.save();

  const resetLink = `http://localhost:4200/auth/reset-password?token=${user.resetToken}`;

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: user.email,
    subject: "Reset Password",
    text: `Dear ${user.first_name || ""} ${
      user.last_name || ""
    },\n\nClick the link to reset your password: ${resetLink}`,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error("[EMAIL] Failed to send reset email:", error);
      return next(
        new AppError("Error sending email.", 500, httpStatusText.ERROR)
      );
    }

    console.log("[EMAIL] Reset email sent to:", user.email);
    res.status(200).json({
      status: httpStatusText.SUCCESS,
      message: "Email sent successfully.",
    });
  });
});

// POST /reset-password
const resetPassword = asyncWrapper(async (req, res, next) => {
  const { token, password } = req.body;
  console.log("[RESET PASSWORD] Token received:", token);

  const user = await userModel.findOne({ resetToken: token });
  if (!user || user.resetTokenExpiry < Date.now()) {
    console.warn("[RESET PASSWORD] Invalid or expired token.");
    return next(
      new AppError("Invalid or expired token.", 400, httpStatusText.FAIL)
    );
  }

  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(password, salt);
  user.resetToken = null;
  user.resetTokenExpiry = null;

  await user.save();

  console.log("[RESET PASSWORD] Password reset for:", user.email);

  res.status(200).json({
    status: httpStatusText.SUCCESS,
    message: "Password reset successfully.",
  });
});

// POST /logout
const logout = asyncWrapper(async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    console.warn("[LOGOUT] No token provided");
    return next(new AppError("Token is required", 400, httpStatusText.FAIL));
  }

  res.status(200).json({
    status: httpStatusText.SUCCESS,
    message: "Logged out successfully.",
  });
});

module.exports = {
  signup,
  login,
  google,
  forgotPassword,
  resetPassword,
  logout,
};
