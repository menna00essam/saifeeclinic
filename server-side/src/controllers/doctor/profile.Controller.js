// controllers/doctorProfileController.js
const User = require("../../models/User");
const bcrypt = require("bcryptjs");
const multer = require("multer");
const path = require("path");
const cloudinary = require("../../config/cloudinary");
const storage = multer.memoryStorage(); 

const checkFileType = (req, file, cb) => {
  // <--- أضفنا `req` هنا
  console.log("-----------------------------------------");
  console.log("Inside checkFileType:");
  console.log("Req object in checkFileType:", req.body); // Check if req.body has anything
  console.log(
    "File object received by checkFileType (should have originalname):",
    file
  );
  console.log("-----------------------------------------");


  if (!file || !file.originalname) {
    // <--- أضيفي هذا التحقق أيضاً
    console.error("File or originalname is missing in checkFileType.");
    return cb(new Error("No file or invalid file name provided."), false); // False indicates rejection
  }

  const filetypes = /jpeg|jpg|png|gif/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = filetypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(
      new Error("Error: Images Only! Allowed types: jpeg, jpg, png, gif"),
      false
    ); 
  }
};

const profileImageUploader = multer({
  // <--- غيرنا الاسم عشان يكون أوضح
  storage: storage, // <--- استخدمي الـ storage الجديد
  limits: { fileSize: 5 * 1024 * 1024 }, // <--- زيادة الحجم لـ 5MB (تقدري تغيريه)
  fileFilter: checkFileType,
}).single("profile_image");
exports.uploadProfileImage = profileImageUploader; // <--- هنا بنعمل export
// **********************************************

exports.editDoctorProfile = async (req, res) => {
  const doctorId = req.user.id;

  const {
    first_name,
    last_name,
    email,
    phone,
    specialization,
    experience,
    biography,
    consultation_fee,
  } = req.body;

  try {
    const doctor = await User.findById(doctorId);

    if (!doctor || doctor.role !== "Doctor") {
      return res.status(404).json({ message: "Doctor not found" });
    }

    doctor.first_name = first_name || doctor.first_name;
    doctor.last_name = last_name || doctor.last_name;
    doctor.phone = phone || doctor.phone;

    if (email && email !== doctor.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ message: "Email already in use" });
      }
      doctor.email = email;
    }

    if (doctor.doctor_profile) {
      doctor.doctor_profile.specialization =
        specialization || doctor.doctor_profile.specialization;

      doctor.doctor_profile.experience =
        experience !== undefined
          ? experience
          : doctor.doctor_profile.experience;
      doctor.doctor_profile.biography =
        biography || doctor.doctor_profile.biography;
      doctor.doctor_profile.consultation_fee =
        consultation_fee !== undefined
          ? consultation_fee
          : doctor.doctor_profile.consultation_fee;
    } else {
      doctor.doctor_profile = {
        specialization,
        experience,
        biography,
        consultation_fee,
      };
    }

    await doctor.save();
    res.json({ message: "Profile updated successfully", doctor });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};

exports.updateDoctorPassword = async (req, res) => {
  const doctorId = req.user.id;
  const { currentPassword, newPassword } = req.body;

  try {
    const doctor = await User.findById(doctorId);

    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found" });
    }

    const isMatch = await bcrypt.compare(currentPassword, doctor.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid current password" });
    }

    const salt = await bcrypt.genSalt(10);
    doctor.password = await bcrypt.hash(newPassword, salt);
    await doctor.save();

    res.json({ message: "Password updated successfully" });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};


exports.addDoctorProfileImage = async (req, res) => {
  // هنا مفيش حاجة اسمها `err` بتيجي مباشرة للـ controller function من Multer،
  // Multer بيتعامل مع أخطائه بنفسه كـ middleware، أو بيحط الـ error في req.file.error لو انتي عاملة custom handling.
  // لكن الـ `if (err)` ده هو اللي كان بيعمل Multer callback، وإحنا شيلنا الـ callback خلاص.
  // Multer دلوقتي بيشتغل قبل ما الـ function دي تتنفذ.

  // لو فيه خطأ في الـ upload بتاع Multer، المفروض إن الـ middleware اللي في الـ route هو اللي هيتولاه
  // أو هيوقفه قبل ما يوصل لهنا.
  // لكن احتياطياً، ممكن نعمل check على req.file.error لو الـ middleware بيحطها.
  if (req.file && req.file.error) {
    console.error("Multer error from req.file:", req.file.error);
    return res.status(400).json({ message: req.file.error });
  }

  if (!req.file) {
    return res.status(400).json({ message: "No file selected." });
  }

  try {
    const doctor = await User.findById(req.user.id);
    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found." });
    }

    // رفع الصورة لـ Cloudinary
    const result = await cloudinary.uploader.upload(
      `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`,
      {
        folder: "doctor_profiles",
        public_id: `doctor-${req.user.id}`,
        overwrite: true,
      }
    );

    // حفظ الـ URL بتاع الصورة من Cloudinary في الـ doctor_profile
    if (!doctor.doctor_profile) {
      doctor.doctor_profile = {};
    }
    doctor.doctor_profile.profile_image = result.secure_url;
    await doctor.save();

    res.json({
      message: "Profile image uploaded successfully",
      filePath: doctor.doctor_profile.profile_image,
    });
  } catch (err) {
    console.error("Cloudinary upload or DB save error:", err.message);
    res.status(500).send("Server Error");
  }
};



exports.getDoctorProfile = async (req, res) => {
  const doctorId = req.user.id;

  try {
    const doctor = await User.findById(doctorId).select(
      "-password -__v -is_deleted"
    );

    if (!doctor || doctor.role !== "Doctor") {
      return res.status(404).json({ message: "Doctor profile not found" });
    }
    res.json(doctor);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};
