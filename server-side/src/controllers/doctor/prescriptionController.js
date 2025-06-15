const { validationResult } = require("express-validator");
const Prescription = require("../../models/Prescription");
const Appointment = require("../../models/Appointment");
const User = require("../../models/User");
const notificationService = require("../../services/notificationService");

// @desc    Create a new prescription
// @route   POST /api/doctors/prescriptions
//          OR POST /api/doctors/my-patients/:patientId/prescriptions (if you add this route later)
// @access  Private (Doctor)
exports.createPrescription = async (req, res) => {
  try {
    const doctorId = req.user._id; // ID الدكتور من التوكن
    const doctorRole = req.user.role;

    // تأكد إن اللي بيعمل الروشتة هو دكتور
    if (doctorRole !== "Doctor") {
      return res.status(403).json({
        message: "Access denied: Only doctors can create prescriptions.",
      });
    }

    // patientId ممكن يجي من الـ URL params (لو الـ route فيه :patientId)
    // أو من الـ body (لو جاي من form عام)
    let patientId = req.params.patientId || req.body.patient_id;
    let appointmentId = req.body.appointment_id; // بما إنه إجباري في الموديل، لازم يجي من الـ body

    const { prescription_text } = req.body;

    // بما إن appointment_id إجباري في الموديل:
    if (!appointmentId) {
      return res.status(400).json({ message: "Appointment ID is required." });
    }
    // بما إن patient_id إجباري في الـ validation بتاع الـ route:
    if (!patientId) {
      return res.status(400).json({ message: "Patient ID is required." });
    }
    if (!prescription_text) {
      return res
        .status(400)
        .json({ message: "Prescription text is required." });
    }

    // التأكد من وجود الدكتور في الـ DB
    const doctor = await User.findById(doctorId);
    if (!doctor || doctor.role !== "Doctor") {
      return res.status(404).json({ message: "Doctor not found." });
    }

    // التأكد من وجود المريض في الـ DB
    const patient = await User.findById(patientId);
    if (!patient || patient.role !== "Patient") {
      return res.status(404).json({ message: "Patient not found." });
    }

    // التأكد من وجود الـ appointment وربطه بالدكتور والمريض دول
    const appointment = await Appointment.findOne({
      _id: appointmentId,
      doctor_id: doctorId,
      patient_id: patientId, // مهم جداً نتأكد إن الميعاد ده فعلاً بين الدكتور والمريض ده
      is_deleted: false,
    });

    if (!appointment) {
      return res.status(404).json({
        message:
          "Associated appointment not found or not linked to this doctor/patient.",
      });
    }

    // ناخد snapshot من بيانات الميعاد لو عايزين نحفظها مع الروشتة
    const appointmentSnapshot = {
      appointment_date: appointment.appointment_date,
      patient_name: patient.first_name + " " + patient.last_name,
      doctor_name: doctor.first_name + " " + doctor.last_name,
    };

    const newPrescription = new Prescription({
      appointment_id: appointmentId, // هنا لازم نمرره بما إنه إجباري
      doctor_id: doctorId,
      patient_id: patientId,
      prescription_text: prescription_text,
      appointment_snapshot: appointmentSnapshot,
    });

    const savedPrescription = await newPrescription.save();

    res.status(201).json({
      message: "Prescription created successfully.",
      prescription: savedPrescription,
    });
  } catch (error) {
    console.error("Error creating prescription:", error.message);
    res.status(500).send("Server Error");
  }
};

exports.getDoctorPrescriptions = async (req, res) => {
  const doctor_id = req.user._id;
  const { patientId } = req.query;

  try {
    let query = { doctor_id };

    if (patientId) {
      if (!patientId.match(/^[0-9a-fA-F]{24}$/)) {
        return res.status(400).json({ msg: "Invalid patient ID format." });
      }
      query.patient_id = patientId;
    }

    const prescriptions = await Prescription.find(query)
      .populate("patient_id", "first_name last_name email phone")
      .populate(
        "appointment_id",
        "appointment_date status patient_info doctor_info"
      )
      .sort({ createdAt: -1 });

    res.json(prescriptions);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};

exports.updatePrescription = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { prescriptionId } = req.params;
  const { prescription_text } = req.body;
  const doctor_id = req.user._id;

  try {
    let prescription = await Prescription.findById(prescriptionId )
      .populate("patient_id", "first_name last_name email")
      .populate("doctor_id", "first_name last_name");

    if (!prescription) {
      return res.status(404).json({ msg: "Prescription not found." });
    }

    if (prescription.doctor_id._id.toString() !== doctor_id) {
      return res
        .status(403)
        .json({ msg: "Not authorized to update this prescription." });
    }

    // Store old prescription text for comparison
    const oldPrescriptionText = prescription.prescription_text;

    if (prescription_text) {
      prescription.prescription_text = prescription_text;
    }

    await prescription.save();

    // Send notification to patient about prescription update (if text was changed)
    if (prescription_text && prescription_text !== oldPrescriptionText) {
      try {
        const patientName = `${prescription.patient_id.first_name} ${prescription.patient_id.last_name}`;
        const doctorName = `${prescription.doctor_id.first_name} ${prescription.doctor_id.last_name}`;

        // Create a custom notification for prescription update
        await notificationService.createNotification({
          user_id: prescription.patient_id._id,
          type: "email",
          category: "prescription_ready", // We can reuse this category
          title: "Prescription Updated",
          message: `
            <h2>Prescription Update</h2>
            <p>Dear ${patientName},</p>
            <p>Your prescription from Dr. ${doctorName} has been updated.</p>
            <p>Please review the updated prescription in your patient portal.</p>
            <p><strong>Updated on:</strong> ${new Date().toDateString()}</p>
          `,
          data: {
            prescriptionId: prescription._id,
            doctorName,
            patientName,
            updateDate: new Date().toISOString(),
          },
          priority: "medium",
        });

        // Also send in-app notification
        await notificationService.createNotification({
          user_id: prescription.patient_id._id,
          type: "in_app",
          category: "prescription_ready",
          title: "Prescription Updated",
          message: `Your prescription from Dr. ${doctorName} has been updated. Please review the changes.`,
          data: {
            prescriptionId: prescription._id,
            doctorName,
            patientName,
            updateDate: new Date().toISOString(),
          },
          priority: "medium",
        });

        console.log("Prescription update notification sent to patient");
      } catch (notificationError) {
        console.error(
          "Error sending prescription update notification:",
          notificationError
        );
      }
    }

    res.json({ message: "Prescription updated successfully", prescription });
  } catch (err) {
    console.error(err.message);
    if (err.kind === "ObjectId") {
      return res.status(400).json({ msg: "Invalid Prescription ID." });
    }
    res.status(500).send("Server Error");
  }
};

// New method to get patient prescriptions (for patient use)
exports.getPatientPrescriptions = async (req, res) => {
  try {
    const patient_id = req.user.id; // Assuming patient is authenticated
    const { page = 1, limit = 10 } = req.query;

    const skipIndex = (parseInt(page) - 1) * parseInt(limit);

    const prescriptions = await Prescription.find({ patient_id })
      .populate("doctor_id", "first_name last_name specialty")
      .populate("appointment_id", "appointment_date")
      .sort({ createdAt: -1 })
      .skip(skipIndex)
      .limit(parseInt(limit));

    const totalPrescriptions = await Prescription.countDocuments({
      patient_id,
    });
    const totalPages = Math.ceil(totalPrescriptions / parseInt(limit));

    res.json({
      currentPage: parseInt(page),
      totalPages,
      totalPrescriptions,
      prescriptions,
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server Error");
  }
};

// New method to delete prescription
exports.deletePrescription = async (req, res) => {
  try {
    const { id } = req.params;
    const doctor_id = req.user._id;

    const prescription = await Prescription.findById(id)
      .populate("patient_id", "first_name last_name email")
      .populate("doctor_id", "first_name last_name");

    if (!prescription) {
      return res.status(404).json({ msg: "Prescription not found." });
    }

    if (prescription.doctor_id._id.toString() !== doctor_id) {
      return res.status(403).json({
        msg: "Not authorized to delete this prescription.",
      });
    }

    await Prescription.findByIdAndDelete(id);

    // Send notification to patient about prescription deletion
    try {
      const patientName = `${prescription.patient_id.first_name} ${prescription.patient_id.last_name}`;
      const doctorName = `${prescription.doctor_id.first_name} ${prescription.doctor_id.last_name}`;

      await notificationService.createNotification({
        user_id: prescription.patient_id._id,
        type: "email",
        category: "prescription_ready", // Reusing category
        title: "Prescription Removed",
        message: `
          <h2>Prescription Removed</h2>
          <p>Dear ${patientName},</p>
          <p>A prescription from Dr. ${doctorName} has been removed from your records.</p>
          <p>If you have any questions, please contact your doctor.</p>
          <p><strong>Removed on:</strong> ${new Date().toDateString()}</p>
        `,
        data: {
          doctorName,
          patientName,
          removalDate: new Date().toISOString(),
        },
        priority: "medium",
      });

      console.log("Prescription deletion notification sent to patient");
    } catch (notificationError) {
      console.error(
        "Error sending prescription deletion notification:",
        notificationError
      );
    }

    res.json({ message: "Prescription deleted successfully" });
  } catch (error) {
    console.error(error.message);
    if (error.kind === "ObjectId") {
      return res.status(400).json({ msg: "Invalid Prescription ID." });
    }
    res.status(500).send("Server Error");
  }
};
