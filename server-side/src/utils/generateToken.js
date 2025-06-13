// generateToken.js
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");

// تأكدي إن المسار ده صح لملف .env بتاعك اللي فيه JWT_SECRET
// لو ملف .env في الـ server-side folder مباشرة
dotenv.config({ path: "./.env" });

// === الخطوة دي مهمة جداً: حطي الـ ID بتاع الدكتور اللي ضفتيه في MongoDB Compass هنا ===
const doctorId = "684b8a69ca154663ee555fc1"; // <--- غيري ده بالـ ID الحقيقي

const jwtSecret = process.env.JWT_SECRET; // ده هيجيب الـ secret من ملف .env
if (!jwtSecret) {
  console.error("❌ JWT_SECRET is not defined in your .env file!");
  process.exit(1);
}

const payload = {
  user: {
    id: doctorId,
    role: "Doctor", // تأكدي إن الـ role هنا Doctor عشان الـ auth middleware يشتغل صح
  },
};

// توليد الـ token بصلاحية ساعة واحدة
const token = jwt.sign(payload, jwtSecret, { expiresIn: "1h" });

console.log("✅ Your Doctor JWT Token (valid for 1 hour):");
console.log(token);
console.log("\nCopy this token and use it in Postman for x-auth-token header.");
