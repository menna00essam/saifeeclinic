const User = require("../../models/User");
const bcrypt = require("bcryptjs");

// **********************************************

exports.editDoctorProfile = async (req, res) => {
  const doctorId = req.user._id;

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
  const doctorId = req.user._id;
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

// في ملف profile.Controller.js
exports.addDoctorProfileImage = async (req, res) => {
  try {
    const doctorId = req.user._id;
    console.log("Doctor ID from token:", doctorId); // <--- أضيفي هذا السطر

    // هنا بتستلمي معلومات الصورة من req.file بعد ما Multer عمل شغله
    if (!req.file) {
      return res.status(400).json({ message: "No image file provided." });
    }

    const imageUrl = req.file.path; // الـ URL بتاع الصورة من Cloudinary
    const imagePublicId = req.file.filename; // الـ Public ID بتاع الصورة من Cloudinary

    // Find the doctor profile and update it
    let doctor = await User.findById(doctorId); // Assuming Doctor is a User model with role 'Doctor'

    if (!doctor) {
      return res.status(404).json({ message: "Doctor profile not found." });
    }

    // هنا بتعدلي الـ profile_image في الـ user model
    doctor.profile_image = {
      url: imageUrl,
      public_id: imagePublicId,
    };

    await doctor.save();

    res.status(200).json({
      message: "Profile image uploaded successfully.",
      profileImage: doctor.profile_image,
    });
  } catch (error) {
    console.error("Error adding profile image:", error);
    res.status(500).send("Server Error");
  }
};

exports.getDoctorProfile = async (req, res) => {
  const doctorId = req.user._id;

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
