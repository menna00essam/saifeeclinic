// routes/doctorRoutes.js
const express = require("express");
const router = express.Router();
const upload = require("../middleware/upload");
const blogController = require("../controllers/doctor/blogController");
const { check } = require("express-validator");
const prescriptionController = require("../controllers/doctor/prescriptionController");
const auth = require("../middleware/protectMW.js");

// routes/doctorRoutes.js
const appointmentController = require("../controllers/doctor/appointmentController");

const doctorProfileController = require("../controllers/doctor/profile.Controller");
const doctorScheduleController = require("../controllers/doctor/scheduleController");

router.get("/profile", auth, doctorProfileController.getDoctorProfile);

router.put("/profile", auth, doctorProfileController.editDoctorProfile);

router.put(
  "/profile/password",
  auth,

  doctorProfileController.updateDoctorPassword
);

router.post(
  "/profile/image",
  auth,

  doctorProfileController.uploadProfileImage,
  doctorProfileController.addDoctorProfileImage
);

router.post("/appointments", auth, appointmentController.createAppointment);

router.get("/appointments", auth, appointmentController.getAppointments);

router.get("/appointments/:id", auth, appointmentController.getAppointmentById);

router.put("/appointments/:id", auth, appointmentController.updateAppointment);

router.delete(
  "/appointments/:id",
  auth,
  appointmentController.deleteAppointment
);

router.post(
  "/blog",
  auth,
  upload.single("image"),
  blogController.createBlogPost
);

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

router.get(
  "/prescriptions",
  auth,
  prescriptionController.getDoctorPrescriptions
);
router.patch(
  "/prescriptions/:id",
  auth,
  [
    check("prescription_text")
      .optional()
      .not()
      .isEmpty()
      .withMessage("Prescription text cannot be empty."),
  ],
  prescriptionController.updatePrescription
);

module.exports = router;
