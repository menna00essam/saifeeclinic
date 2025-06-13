const User = require("../../models/User");
const { responseHandler } = require("../../utils/responseHandler");
const bcrypt = require("bcryptjs");

const getAllPatients = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "" } = req.query;
    const skip = (page - 1) * limit;

    const query = {
      role: "Patient",
      is_deleted: false,
      $or: [
        { first_name: { $regex: search, $options: "i" } },
        { last_name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ],
    };

    const [patients, total] = await Promise.all([
      User.find(query)
        .select("-password -__v")
        .skip(skip)
        .limit(parseInt(limit)),
      User.countDocuments(query),
    ]);

    return responseHandler.success(
      res,
      {
        data: patients,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: parseInt(limit),
        },
      },
      "Patients retrieved successfully"
    );
  } catch (error) {
    return responseHandler.error(
      res,
      "Failed to retrieve patients",
      500,
      error
    );
  }
};
// Get all doctors
const getAllDoctors = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "", specialization } = req.query;
    const skip = (page - 1) * limit;

    const query = {
      role: "Doctor",
      is_deleted: false,
      $or: [
        { first_name: { $regex: search, $options: "i" } },
        { last_name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        {
          "doctor_profile.specialization": { $regex: search, $options: "i" },
        },
      ],
    };

    if (specialization) {
      query["doctor_profile.specialization"] = {
        $regex: specialization,
        $options: "i",
      };
    }

    const [doctors, total] = await Promise.all([
      User.find(query)
        .select(
          "first_name last_name email avatar doctor_profile.specialization  doctor_profile.appointments"
        )
        .lean()
        .skip(skip)
        .limit(parseInt(limit)),
      User.countDocuments(query),
    ]);
    const formattedDoctors = doctors.map((doctor) => ({
      full_name: `${doctor.first_name} ${doctor.last_name}`,
      email: doctor.email,
      avatar: doctor.avatar,
      specialization: doctor.doctor_profile.specialization,
      total_appointments: doctor.doctor_profile.appointments?.length || 0,
    }));
    return responseHandler.success(
      res,
      {
        data: formattedDoctors,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: parseInt(limit),
        },
      },
      "Doctors retrieved successfully"
    );
  } catch (error) {
    return responseHandler.error(res, "Failed to retrieve doctors", 500, error);
  }
};

const addDoctor = async (req, res) => {
  try {
    const {
      first_name,
      last_name,
      email,
      phone,
      password,
      specialization,
      license_number,
      experience,
      qualifications,
      consultation_fee,
      biography,
      is_available = true,
    } = req.body;

    // Check for existing doctor
    const existingDoctor = await User.findOne({
      $or: [{ email }, { "doctor_profile.license_number": license_number }],
    });

    if (existingDoctor) {
      return responseHandler.error(
        res,
        "Doctor with this email or license number already exists",
        400
      );
    }

    // Handle avatar (from file upload or default)
    let avatarUrl = req.file?.path
      ? `/uploads/${req.file.filename}`
      : undefined;

    // Create new doctor
    const newDoctor = new User({
      first_name,
      last_name,
      email,
      phone,
      password: bcrypt.hashSync(password, 10),
      role: "Doctor",
      avatar: avatarUrl, // Will fall back to schema default if undefined
      doctor_profile: {
        specialization,
        license_number,
        experience: parseInt(experience) || 0,
        qualifications: Array.isArray(qualifications) ? qualifications : [],
        consultation_fee: parseFloat(consultation_fee) || 0,
        biography,
        is_available,
        schedule: [],
        appointments: [],
        blogs: [],
      },
    });

    await newDoctor.save();

    // Prepare response data (exclude sensitive fields)
    const doctorData = {
      _id: newDoctor._id,
      first_name: newDoctor.first_name,
      last_name: newDoctor.last_name,
      email: newDoctor.email,
      phone: newDoctor.phone,
      avatar: newDoctor.avatar,
      role: newDoctor.role,
      doctor_profile: {
        specialization: newDoctor.doctor_profile.specialization,
        license_number: newDoctor.doctor_profile.license_number,
        experience: newDoctor.doctor_profile.experience,
        consultation_fee: newDoctor.doctor_profile.consultation_fee,
        is_available: newDoctor.doctor_profile.is_available,
      },
      createdAt: newDoctor.createdAt,
    };

    return responseHandler.success(
      res,
      doctorData,
      "Doctor added successfully",
      201
    );
  } catch (error) {
    return responseHandler.error(
      res,
      "Failed to add doctor: " + error.message,
      500,
      process.env.NODE_ENV === "development" ? error.stack : undefined
    );
  }
};

const deleteDoctor = async (req, res) => {
  try {
    const { doctorId } = req.params;

    const doctor = await User.findOne({
      _id: doctorId,
      role: "Doctor",
      is_deleted: false,
    });

    if (!doctor) {
      return responseHandler.error(res, "Doctor not found", 404);
    }

    doctor.is_deleted = true;
    await doctor.save();

    return responseHandler.success(res, null, "Doctor deleted successfully");
  } catch (error) {
    return responseHandler.error(res, "Failed to delete doctor", 500, error);
  }
};

module.exports = {
  getAllPatients,
  getAllDoctors,
  addDoctor,
  deleteDoctor,
};
