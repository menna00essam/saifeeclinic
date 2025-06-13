// src/middleware/auth.js
const jwt = require("jsonwebtoken"); // لاستخدام مكتبة JWT للتحقق من التوكن
const dotenv = require("dotenv"); // لقراءة الـ environment variables زي JWT_SECRET

// تأكدي ان المسار ده صح لملف .env بتاعك اللي فيه JWT_SECRET
// بما ان auth.js جوه src/middleware، وملف .env في الـ root directory بتاع server-side
// يبقى لازم نرجع خطوتين (../..)
dotenv.config({ path: "../../.env" });

module.exports = function (req, res, next) {
  // 1. محاولة استخراج التوكن من الـ Authorization Header
  // التوكن بيتبعت بالشكل ده: Authorization: Bearer <token_string>
  const authHeader = req.header("Authorization");

  // التحقق اذا كان الـ Header موجود وبادئ بـ 'Bearer '
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    // لو مفيش توكن أو الفورمات غلط، بنرجع خطأ 401 (غير مصرح بالوصول)
    return res.status(401).json({ message: "No token, authorization denied" });
  }

  // فصل كلمة 'Bearer' عن التوكن نفسه
  const token = authHeader.split(" ")[1];

  try {
    // 2. التحقق من صلاحية التوكن باستخدام الـ JWT_SECRET
    // jwt.verify() بتقوم بفك تشفير التوكن والتحقق من صلاحيته وتاريخ انتهاءه
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 3. إضافة بيانات المستخدم (الموجودة في التوكن) إلى الـ request object
    // ده بيخلي الـ controllers تقدر توصل لـ req.user.id و req.user.role
    req.user = decoded.user; // <--- ده السطر الأهم اللي كان ناقص

    // 4. استدعاء الـ middleware أو الـ controller التالي في الـ request pipeline
    next(); // بتسمح للطلب يكمل للوظيفة اللي بعدها
  } catch (err) {
    // لو حصل أي خطأ أثناء التحقق من التوكن (مثلاً التوكن غير صالح أو منتهي الصلاحية)
    res.status(401).json({ message: "Token is not valid" });
  }
};
