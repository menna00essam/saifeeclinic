const User = require("../../models/User");

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
          "first_name last_name email avatar doctor_profile.specialization"
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

const addDoctor = async (req, res) => {};
module.exports = {
  getAllPatients,
  getAllDoctors,
  addDoctor,
};
