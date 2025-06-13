// src/controllers/appointment/appointment.controller.js
const Appointment = require("../../models/Appointment");
const User = require("../../models/User");

// @desc    Create a new appointment by a doctor for a patient
// @route   POST /api/doctors/appointments
// @access  Private (Doctor Only)
exports.createAppointment = async (req, res) => {
  try {
    const doctorId = req.user.id; // ID الدكتور اللي عامل login

    // البيانات المطلوبة من الـ request body بالأسماء الجديدة
    const {
      patient_id,
      appointment_date,
      status,
      payment_status,
      patient_info,
      doctor_info,
    } = req.body;

    // التحقق من أن البيانات الأساسية موجودة
    if (!patient_id || !appointment_date) {
      return res
        .status(400)
        .json({ message: "Please provide patient ID and appointment date." });
    }

    // التحقق من أن المريض موجود و Role بتاعه Patient
    const existingPatient = await User.findById(patient_id);
    if (!existingPatient || existingPatient.role !== "Patient") {
      return res
        .status(404)
        .json({ message: "Patient not found or invalid patient ID." });
    }

    // بناء الـ patient_info من بيانات المريض لو لم يتم توفيرها بالكامل في الـ body
    const finalPatientInfo = patient_info || {
      name: `${existingPatient.first_name || ""} ${
        existingPatient.last_name || ""
      }`.trim(),
      phone: existingPatient.phone || "",
      email: existingPatient.email || "",
    };

    // بناء الـ doctor_info من بيانات الدكتور الذي قام بالدخول
    const existingDoctor = await User.findById(doctorId);
    if (!existingDoctor || existingDoctor.role !== "Doctor") {
      // هذا الشرط يجب ألا يتم الوصول إليه غالباً لأن الـ token بيضمن أنه دكتور
      return res
        .status(403)
        .json({ message: "Logged-in user is not a valid doctor." });
    }
    const finalDoctorInfo = doctor_info || {
      name: `${existingDoctor.first_name || ""} ${
        existingDoctor.last_name || ""
      }`.trim(),
      specialty: existingDoctor.specialty || "", // Assuming doctor model has specialty
      phone: existingDoctor.phone || "",
    };

    // إنشاء كائن موعد جديد بالأسماء الجديدة للحقول
    const newAppointment = new Appointment({
      doctor_id: doctorId,
      patient_id,
      appointment_date,
      status: status || "booked", // الحالة الافتراضية 'booked'
      payment_status: payment_status || "unpaid", // الحالة الافتراضية 'unpaid'
      patient_info: finalPatientInfo,
      doctor_info: finalDoctorInfo,
    });

    const savedAppointment = await newAppointment.save();

    // لجلب تفاصيل الدكتور والمريض كاملة في الـ response باستخدام populate
    const populatedAppointment = await Appointment.findById(
      savedAppointment._id
    )
      .populate("doctor_id", "first_name last_name email specialty phone")
      .populate("patient_id", "first_name last_name email phone");

    res.status(201).json({
      message: "Appointment created successfully",
      appointment: populatedAppointment,
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server Error");
  }
};

// @desc    Get all appointments for the logged-in doctor (Excluding soft deleted ones)
// @route   GET /api/doctors/appointments
// @access  Private (Doctor Only)
exports.getAppointments = async (req, res) => {
  try {
    const doctorId = req.user.id;

    // 1. استخراج الـ Query Parameters: page و limit
    const page = parseInt(req.query.page) || 1; //   : 1
    const limit = parseInt(req.query.limit) || 10; //  

    // 2. حساب عدد العناصر اللي هيتم تخطيها (skip)
    const skipIndex = (page - 1) * limit;

    // 3. جلب المواعيد باستخدام skip و limit
    const appointments = await Appointment.find({
      doctor_id: doctorId,
      is_deleted: false,
    })
      .sort({ appointment_date: -1 }) // 
      .skip(skipIndex) // 
      .limit(limit) // 
      .populate("doctor_id", "first_name last_name email specialty phone")
      .populate("patient_id", "first_name last_name email phone");

    const totalAppointments = await Appointment.countDocuments({
      doctor_id: doctorId,
      is_deleted: false,
    });

     
    const totalPages = Math.ceil(totalAppointments / limit);

    // 6. إرجاع الـ Response مع بيانات الـ Pagination
    res.json({
      currentPage: page,
      totalPages: totalPages,
      totalAppointments: totalAppointments,
      appointments: appointments,
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server Error");
  }
};
// @desc    Get a single appointment by ID for the logged-in doctor (Excluding soft deleted ones)
// @route   GET /api/doctors/appointments/:id
// @access  Private (Doctor Only)
exports.getAppointmentById = async (req, res) => {
  try {
    const doctorId = req.user.id;
    const appointment = await Appointment.findOne({
      _id: req.params.id,
      is_deleted: false,
    }) // <--- تعديل
      .populate("doctor_id", "first_name last_name specialty") // <--- تعديل
      .populate("patient_id", "first_name last_name"); // <--- تعديل

    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found." });
    }

    if (appointment.doctor_id._id.toString() !== doctorId) {
      // <--- أضفنا ._id قبل .toString()
      // <--- تعديل
      return res.status(403).json({
        message:
          "Access denied: You are not authorized to view this appointment.",
      });
    }

    res.json(appointment);
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server Error");
  }
};

// @desc    Update an appointment by the logged-in doctor
// @route   PUT /api/doctors/appointments/:id
// @access  Private (Doctor Only)
exports.updateAppointment = async (req, res) => {
  try {
    const doctorId = req.user.id;
    // حقول التحديث بالأسماء الجديدة
    const {
      patient_id,
      appointment_date,
      status,
      payment_status,
      patient_info,
      doctor_info,
    } = req.body;

    let appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found." });
    }

    if (appointment.doctor_id._id.toString() !== doctorId) {
      // <--- تعديل
      return res.status(403).json({
        message:
          "Access denied: You are not authorized to update this appointment.",
      });
    }

    // تحديث البيانات المتاحة
    if (patient_id) appointment.patient_id = patient_id; // <--- تعديل
    if (appointment_date) appointment.appointment_date = appointment_date; // <--- تعديل
    if (status) appointment.status = status;
    if (payment_status) appointment.payment_status = payment_status; // <--- تعديل
    if (patient_info) appointment.patient_info = patient_info; // <--- تعديل
    if (doctor_info) appointment.doctor_info = doctor_info; // <--- تعديل

    await appointment.save();
    res.json({ message: "Appointment updated successfully", appointment });
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server Error");
  }
};

// @desc    Soft Delete an appointment by the logged-in doctor
// @route   DELETE /api/doctors/appointments/:id
// @access  Private (Doctor Only)
exports.deleteAppointment = async (req, res) => {
  try {
    const doctorId = req.user.id;
    let appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found." });
    }

    if (appointment.doctor_id.toString() !== doctorId) {
      //  
      return res.status(403).json({
        message:
          "Access denied: You are not authorized to delete this appointment.",
      });
    }

    // تنفيذ الـ Soft Delete
    appointment.is_deleted = true; // 
    // No need for deletedAt as timestamps will handle updatedAt
    await appointment.save();

    res.json({ message: "Appointment soft-deleted successfully." });
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server Error");
  }
};
