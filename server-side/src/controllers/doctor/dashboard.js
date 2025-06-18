const mongoose = require("mongoose");
const Appointment = require("../../models/Appointment");
const User = require("../../models/User");

// Cache for doctor dashboard data
const doctorDashboardCache = new Map();

const getDoctorDashboard = async (req, res) => {
  try {
    const doctorId = req.user._id;

    // Validate doctorId format
    if (!mongoose.Types.ObjectId.isValid(doctorId)) {
      return res.status(400).json({ message: "Invalid doctor ID format" });
    }

    // Check cache first (cache for 2 minutes)
    const now = Date.now();
    const cachedData = doctorDashboardCache.get(doctorId);
    if (cachedData && now - cachedData.timestamp < 120000) {
      console.log("Returning cached doctor dashboard data");
      return res.json(cachedData.data);
    }

    // Convert to ObjectId
    const doctorObjectId = new mongoose.Types.ObjectId(doctorId);

    // Calculate date ranges
    const nowDate = new Date();
    const startOfToday = new Date(nowDate);
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date(nowDate);
    endOfToday.setHours(23, 59, 59, 999);

    // Run all queries in parallel
    const [doctor, statsAggregation, todaysAppointments] = await Promise.all([
      // Doctor details
      User.findById(doctorId).select("first_name last_name").lean(),

      // Appointment statistics
      Appointment.aggregate([
        {
          $match: {
            doctor_id: doctorObjectId, // Fixed: changed _id to doctor_id
            is_deleted: false,
          },
        },
        {
          $group: {
            _id: null,
            totalAppointments: { $sum: 1 },
            booked: { $sum: { $cond: [{ $eq: ["$status", "booked"] }, 1, 0] } },
            completed: {
              $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
            },
            cancelled: {
              $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] },
            },
            distinctPatients: { $addToSet: "$patient_id" },
          },
        },
        {
          $project: {
            _id: 0,
            totalAppointments: 1,
            booked: 1,
            completed: 1,
            cancelled: 1,
            totalPatients: { $size: "$distinctPatients" },
          },
        },
      ]),

      // Today's appointments
      Appointment.find({
        doctor_id: doctorObjectId,
        appointment_date: {
          $gte: startOfToday,
          $lte: endOfToday,
        },
        is_deleted: false,
      })
        .sort({ appointment_date: 1 })
        .select("appointment_date status patient_info")
        .lean(),
    ]);

    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found" });
    }

    // Handle empty aggregation result
    const stats = statsAggregation[0] || {
      totalAppointments: 0,
      booked: 0,
      completed: 0,
      cancelled: 0,
      totalPatients: 0,
    };

    // Prepare response
    const response = {
      doctor: { name: `${doctor.first_name} ${doctor.last_name}` },
      stats: {
        totalAppointments: stats.totalAppointments,
        totalPatients: stats.totalPatients,
        appointmentStatus: {
          booked: stats.booked,
          completed: stats.completed,
          cancelled: stats.cancelled,
        },
      },
      todaysAppointments: todaysAppointments.map((app) => ({
        time: app.appointment_date.toISOString(),
        patient: app.patient_info?.name || "Unknown Patient",
        status: app.status,
      })),
    };

    // Update cache
    doctorDashboardCache.set(doctorId, {
      data: response,
      timestamp: Date.now(),
    });

    res.json(response);
  } catch (error) {
    console.error("Doctor dashboard error:", error);

    let message = "Server error";
    if (error.name === "CastError") {
      message = "Data conversion error";
    } else if (error.name === "MongoServerError") {
      message = "Database operation failed";
    }

    res.status(500).json({
      message,
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

module.exports = { getDoctorDashboard };
