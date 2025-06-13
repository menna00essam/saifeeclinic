const jwt = require("jsonwebtoken");
const APIError = require("../utils/errors/APIError"); // تأكد من المسار ده صح

function protectMW(req, res, next) {
  try {
    let token = req.headers.authorization; // تم التعديل من res.headers إلى req.headers
    if (!token || !token.startsWith("Bearer ")) {
      // استخدم next(new APIError(...)) عشان الخطأ يروح للـ error handler العام
      return next(
        new APIError("No token provided or invalid token format", 401)
      );
    }
    token = token.split(" ")[1];
    let decodedData = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decodedData; // بنحط بيانات المستخدم في الـ request عشان نقدر نستخدمها في الـ controllers اللي بعد كده
    next(); // بنكمل للـ middleware اللي بعده أو للـ controller
  } catch (err) {
    // بنحول أخطاء الـ JWT العادية لـ APIError عشان يتم التعامل معاها بشكل موحد
    if (err.name === "TokenExpiredError") {
      return next(new APIError("Token has expired. Please login again", 401));
    } else if (err.name === "JsonWebTokenError") {
      return next(new APIError("Token is invalid", 401));
    } else {
      return next(new APIError("Authentication failed.", 401)); // خطأ غير متوقع
    }
  }
}

module.exports = protectMW;
