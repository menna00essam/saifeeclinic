// routes/doctorRoutes.js
const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth"); // <--- السطر ده مهم جداً تضيفيه هنا
const upload = require("../middleware/upload"); // استدعي Multer هنا
const blogController = require("../controllers/doctor/blogController"); // استدعي Blog Controller
const { check } = require("express-validator"); // <--- السطر ده
const prescriptionController = require("../controllers/doctor/prescriptionController");

// routes/doctorRoutes.js
const appointmentController = require("../controllers/doctor/appointmentController"); // استدعاء الـ controller الجديد

const doctorProfileController = require("../controllers/doctor/profile.Controller"); // ده صح
const doctorScheduleController = require("../controllers/doctor/scheduleController"); // ده صح

// ...

// --- Doctor Profile Routes (Requires Auth) ---

// @route   GET /api/doctors/profile
// @desc    Get logged-in doctor's profile
// @access  Private (Doctor only)
router.get("/profile", auth, doctorProfileController.getDoctorProfile);

// @route   PUT /api/doctors/profile
// @desc    Edit doctor's profile information
// @access  Private (Doctor only)
router.put("/profile", auth, doctorProfileController.editDoctorProfile);

// @route   PUT /api/doctors/profile/password
// @desc    Update doctor's password
// @access  Private (Doctor only)
router.put(
  "/profile/password",
  auth,

  doctorProfileController.updateDoctorPassword
);

// @route   POST /api/doctors/profile/image
// @desc    Add doctor's profile image
// @access  Private (Doctor only)
router.post(
  "/profile/image",
  auth,

  doctorProfileController.uploadProfileImage, // <--- **هنا التعديل المهم**
  doctorProfileController.addDoctorProfileImage
);
// APPOINTMENTS Routes

router.post("/appointments", auth, appointmentController.createAppointment);

// @route   GET /api/appointments
// @desc    Get all appointments for the logged-in doctor
// @access  Private (Doctor Only)
router.get("/appointments", auth, appointmentController.getAppointments);

// @route   GET /api/appointments/:id
// @desc    Get a single appointment by ID for the logged-in doctor
// @access  Private (Doctor Only)
router.get("/appointments/:id", auth, appointmentController.getAppointmentById);

// @route   PUT /api/appointments/:id
// @desc    Update an appointment by the logged-in doctor
// @access  Private (Doctor Only)
router.put("/appointments/:id", auth, appointmentController.updateAppointment);

// @route   DELETE /api/appointments/:id
// @desc    Soft Delete an appointment by the logged-in doctor
// @access  Private (Doctor Only)
router.delete(
  "/appointments/:id",
  auth,
  appointmentController.deleteAppointment
);
// --- Endpoints للـ Blog Posts (خاصة بالدكتور) ---
// لإنشاء بوست جديد مع upload للصورة
router.post(
  "/blog",
  auth,
  upload.single("image"),
  blogController.createBlogPost
);
// لجلب بوستات الدكتور
router.get("/blog", auth, blogController.getDoctorBlogPosts);
router.put(
  "/schedule",
  auth,
  [
    // Validate available_slots if provided
    check("available_slots")
      .optional()
      .isArray()
      .withMessage("Available slots must be an array"),
    check("available_slots.*.weekday")
      .optional()
      .isIn([
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ])
      .withMessage("Invalid weekday"),
    check("available_slots.*.start_time")
      .optional()
      .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
      .withMessage("Start time must be in HH:MM format"),
    check("available_slots.*.end_time")
      .optional()
      .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
      .withMessage("End time must be in HH:MM format"),
  ],
  doctorScheduleController.updateDoctorSchedule
);

// @route   GET /api/doctors/schedule
// @desc    Get doctor's schedule
// @access  Private (Doctor only)
router.get("/schedule", auth, doctorScheduleController.getDoctorSchedule);
router.post(
  "/prescriptions",
  auth,
  [
    check("appointment_id", "Appointment ID is required")
      .not()
      .isEmpty()
      .isMongoId(),
    check("patient_id", "Patient ID is required").not().isEmpty().isMongoId(),
    check("prescription_text", "Prescription text is required").not().isEmpty(),
  ],
  prescriptionController.createPrescription
);

// @route   GET /api/doctors/prescriptions
// @desc    Get all prescriptions written by the logged-in doctor
// @access  Private (Doctor only)
router.get(
  "/prescriptions",
  auth,
  prescriptionController.getDoctorPrescriptions
);
router.patch(
  "/prescriptions/:id",
  auth,
  [
    // Validation for fields that can be updated
    check("prescription_text")
      .optional()
      .not()
      .isEmpty()
      .withMessage("Prescription text cannot be empty."),
    // If you had a 'notes' field:
    // check('notes').optional().not().isEmpty().withMessage('Notes cannot be empty.'),
  ],
  prescriptionController.updatePrescription
);

module.exports = router;
