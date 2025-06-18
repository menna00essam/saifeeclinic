// routes/doctorRoutes.js
const express = require("express");
const router = express.Router();

const blogController = require("../controllers/doctor/blogController");
const { check } = require("express-validator");
const prescriptionController = require("../controllers/doctor/prescriptionController");
const auth = require("../middleware/protectMW.js");

const roleAuth = require("../middleware/roleAuth"); //
const { parser } = require("../config/cloudinary"); //

// routes/doctorRoutes.js
const appointmentController = require("../controllers/doctor/appointmentController");

const doctorProfileController = require("../controllers/doctor/profile.Controller");
const doctorScheduleController = require("../controllers/doctor/scheduleController");
const doctorPatientController = require("../controllers/doctor/patientController"); // <-- أضيفي هذا السطر

router.get(
  "/profile",
  auth,
  roleAuth("Doctor"),
  doctorProfileController.getDoctorProfile
);

router.put(
  "/profile",
  auth,
  roleAuth("Doctor"),
  doctorProfileController.editDoctorProfile
);

router.put(
  "/profile/password",
  auth,
  roleAuth("Doctor"),

  doctorProfileController.updateDoctorPassword
);

router.post(
  "/profile/image",
  auth,
  roleAuth("Doctor"),
  parser.single("image"),
  doctorProfileController.addDoctorProfileImage
);

router.post(
  "/appointments",
  auth,
  roleAuth("Doctor"),
  appointmentController.createAppointment
);

router.get(
  "/appointments",
  auth,
  roleAuth("Doctor"),
  appointmentController.getAppointments
);

router.get(
  "/appointments/:id",
  auth,
  roleAuth("Doctor"),
  appointmentController.getAppointmentById
);

router.put(
  "/appointments/:id",
  auth,
  roleAuth("Doctor"),
  appointmentController.updateAppointment
);

router.delete(
  "/appointments/:id",
  auth,
  roleAuth("Doctor"),
  appointmentController.deleteAppointment
);

router.post(
  "/blog",
  auth,
  roleAuth("Doctor"),

  parser.single("image"),
  blogController.createBlogPost
);

router.get(
  "/blog",
  auth,
  roleAuth("Doctor"),
  blogController.getDoctorBlogPosts
);
router.put(
  "/schedule",
  auth,
  roleAuth("Doctor"),
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

router.get(
  "/schedule",
  auth,
  roleAuth("Doctor"),
  doctorScheduleController.getDoctorSchedule
);
router.post(
  "/prescriptions",
  auth,
  roleAuth("Doctor"),
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
  roleAuth("Doctor"),
  prescriptionController.getDoctorPrescriptions
);
router.patch(
  "/prescriptions/:prescriptionId",
  auth,
  roleAuth("Doctor"),
  [
    check("prescription_text")
      .optional()
      .not()
      .isEmpty()
      .withMessage("Prescription text cannot be empty."),
  ],
  prescriptionController.updatePrescription
);
// --- Doctor's Patient Management Routes ---
router.get(
  "/my-patients",
  auth,
  roleAuth("Doctor"),
  doctorPatientController.getAllMyPatients
);
router.get(
  "/my-patients/:patientId",
  auth,
  roleAuth("Doctor"),
  doctorPatientController.getPatientDetails
);
router.put(
  
  "/my-patients/:patientId/profile",
  auth,
  roleAuth("Doctor"),
  doctorPatientController.updatePatientProfile
);
module.exports = router;
