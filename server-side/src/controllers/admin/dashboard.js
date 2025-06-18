const mongoose = require("mongoose");
const User = require("../../models/User");
const Appointment = require("../../models/Appointment");

// Cache for frequently accessed data (simple in-memory cache)
const dashboardCache = {
  data: null,
  lastUpdated: null,
};

const getAdminDashboard = async (req, res) => {
  try {
    console.log(req.user);
    const adminId = req.user._id;

    // Validate adminId format
    if (!mongoose.Types.ObjectId.isValid(adminId)) {
      return res.status(400).json({ message: "Invalid admin ID format" });
    }

    // Check cache first (cache for 5 minutes)
    const now = Date.now();
    if (
      dashboardCache.data &&
      dashboardCache.lastUpdated &&
      now - dashboardCache.lastUpdated < 300000
    ) {
      // 5 minutes
      console.log("Returning cached dashboard data");
      return res.json(dashboardCache.data);
    }

    // 1. Calculate date ranges
    const nowDate = new Date();
    const startOfToday = new Date(nowDate);
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date(nowDate);
    endOfToday.setHours(23, 59, 59, 999);

    const startOfWeek = new Date(nowDate);
    startOfWeek.setDate(nowDate.getDate() - nowDate.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    // 2. Run all queries in parallel
    const [
      admin,
      patientsCount,
      doctorsCount,
      appointmentStats,
      weeklyAppointments,
      latestPatients,
      latestDoctors,
      todaysAppointments,
    ] = await Promise.all([
      // Admin details
      User.findById(adminId).select("first_name last_name").lean(),

      // Patient count
      User.countDocuments({ role: "Patient", is_deleted: false }),

      // Doctor count
      User.countDocuments({ role: "Doctor", is_deleted: false }),

      // Appointment statistics
      Appointment.aggregate([
        { $match: { is_deleted: false } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            booked: { $sum: { $cond: [{ $eq: ["$status", "booked"] }, 1, 0] } },
            completed: {
              $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
            },
            cancelled: {
              $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] },
            },
            revenue: { $sum: "$fee" },
          },
        },
        { $project: { _id: 0 } },
      ]),

      // Weekly appointments
      Appointment.aggregate([
        {
          $match: {
            appointment_date: { $gte: startOfWeek, $lte: endOfToday },
            is_deleted: false,
          },
        },
        {
          $group: {
            _id: { $dayOfWeek: "$appointment_date" },
            count: { $sum: 1 },
          },
        },
        {
          $project: {
            day: "$_id",
            count: 1,
            _id: 0,
          },
        },
      ]),

      // Latest patients
      User.find({
        role: "Patient",
        is_deleted: false,
      })
        .sort({ createdAt: -1 })
        .limit(10)
        .select("first_name last_name email phone createdAt")
        .lean(),

      // Latest doctors
      User.find({
        role: "Doctor",
        is_deleted: false,
      })
        .sort({ createdAt: -1 })
        .limit(5)
        .select(
          "first_name last_name email doctor_profile.specialization createdAt"
        )
        .lean(),

      // Today's appointments
      Appointment.find({
        appointment_date: { $gte: startOfToday, $lte: endOfToday },
        is_deleted: false,
      })
        .sort({ appointment_date: 1 })
        .select("appointment_date status patient_info doctor_info fee")
        .lean(),
    ]);

    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    // Map to day names
    const dayMap = {
      1: "Monday",
      2: "Tuesday",
      3: "Wednesday",
      4: "Thursday",
      5: "Friday",
      6: "Saturday",
      7: "Sunday",
    };

    const formattedWeeklyAppointments = weeklyAppointments.map((item) => ({
      day: dayMap[item.day],
      appointments: item.count,
    }));

    // Prepare response
    const stats = appointmentStats[0] || {
      total: 0,
      booked: 0,
      completed: 0,
      cancelled: 0,
      revenue: 0,
    };

    const response = {
      admin: { name: `${admin.first_name} ${admin.last_name}` },
      stats: {
        totalPatients: patientsCount,
        totalDoctors: doctorsCount,
        totalAppointments: stats.total,
        appointmentStatus: {
          booked: stats.booked,
          completed: stats.completed,
          cancelled: stats.cancelled,
        },
        totalRevenue: stats.revenue,
      },
      weeklyAppointments: formattedWeeklyAppointments,
      latestPatients: latestPatients.map((p) => ({
        name: `${p.first_name} ${p.last_name}`,
        email: p.email,
        phone: p.phone,
        joined: p.createdAt,
      })),
      latestDoctors: latestDoctors.map((d) => ({
        name: `${d.first_name} ${d.last_name}`,
        email: d.email,
        specialty: d.doctor_profile?.specialization || "General",
        joined: d.createdAt,
      })),
      todaysAppointments: todaysAppointments.map((a) => ({
        time: a.appointment_date,
        patient: a.patient_info?.name || "Unknown",
        doctor: a.doctor_info?.name || "Unknown",
        specialty: a.doctor_info?.specialty || "General",
        status: a.status,
        fee: a.fee || 0,
      })),
    };

    // Update cache
    dashboardCache.data = response;
    dashboardCache.lastUpdated = Date.now();

    res.json(response);
  } catch (error) {
    console.error("Admin dashboard error:", error);
    res.status(500).json({
      message: "Server error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

module.exports = { getAdminDashboard };
