// src/middleware/upload.js
const multer = require("multer");

// إعداد تخزين Multer: بنستخدم MemoryStorage عشان نرفع الصورة مباشرة لـ Cloudinary
// مش بنحفظها على السيرفر أولاً.
const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // حجم الملف الأقصى 5MB (تقدري تغيريه)
  },
  fileFilter: (req, file, cb) => {
    // التأكد إن الملف صورة (jpeg, jpg, png, gif)
    if (file.mimetype.startsWith("image/")) {
      cb(null, true); // اقبل الملف
    } else {
      cb(new Error("Only image files are allowed!"), false); // ارفض الملف
    }
  },
});

module.exports = upload;
