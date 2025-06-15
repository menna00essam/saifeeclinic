const asyncWrapper = require("../../middleware/asyncWrapper.middleware");
const User = require("../../models/User");
const { responseHandler } = require("../../utils/responseHandler");
const bcrypt = require("bcryptjs");
const { signup } = require("../auth/authController");

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

const addDoctor = asyncWrapper(async (req, res, next) => {
  // Prepare user data
  const userData = {
    ...req.body,
    role: "Doctor", // Force role to Doctor
    doctor_profile: {
      specialization: req.body.specialization,
      license_number: req.body.license_number,
      experience: parseInt(req.body.experience) || 0,
      qualifications: Array.isArray(req.body.qualifications)
        ? req.body.qualifications
        : [],
      consultation_fee: parseFloat(req.body.consultation_fee) || 0,
      biography: req.body.biography,
      is_available: req.body.is_available !== false,
    },
  };

  // Handle avatar
  if (req.file?.path) {
    userData.avatar = `/uploads/${req.file.filename}`;
  }

  // Call the existing signup logic
  req.body = userData;
  await signup(req, res, next);
});

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
