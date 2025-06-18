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
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const doctorId = req.user._id;
    const doctorRole = req.user.role;

    if (doctorRole !== "Doctor") {
      return res.status(403).json({
        message: "Access denied: Only doctors can create prescriptions.",
      });
    }

    let patientId = req.params.patientId || req.body.patient_id;
    let appointmentId = req.body.appointment_id;

    const { 
      diagnosis, 
      medications, 
      notes, 
      priority = 'normal',
      follow_up_date,
      prescription_text // Keep for backward compatibility
    } = req.body;

    // Validation
    if (!appointmentId) {
      return res.status(400).json({ message: "Appointment ID is required." });
    }
    if (!patientId) {
      return res.status(400).json({ message: "Patient ID is required." });
    }
    if (!diagnosis) {
      return res.status(400).json({ message: "Diagnosis is required." });
    }
    if (!medications || !Array.isArray(medications) || medications.length === 0) {
      return res.status(400).json({ message: "At least one medication is required." });
    }

    // Validate medications
    for (let i = 0; i < medications.length; i++) {
      const med = medications[i];
      if (!med.name || !med.dosage || !med.frequency) {
        return res.status(400).json({ 
          message: `Medication ${i + 1}: name, dosage, and frequency are required.` 
        });
      }
    }

    // Verify doctor exists
    const doctor = await User.findById(doctorId);
    if (!doctor || doctor.role !== "Doctor") {
      return res.status(404).json({ message: "Doctor not found." });
    }

    // Verify patient exists
    const patient = await User.findById(patientId);
    if (!patient || patient.role !== "Patient") {
      return res.status(404).json({ message: "Patient not found." });
    }

    // Verify appointment exists and belongs to this doctor and patient
    const appointment = await Appointment.findOne({
      _id: appointmentId,
      doctor_id: doctorId,
      patient_id: patientId,
      is_deleted: false,
    });

    if (!appointment) {
      return res.status(404).json({
        message: "Associated appointment not found or not linked to this doctor/patient.",
      });
    }

    // Create appointment snapshot
    const appointmentSnapshot = {
      appointment_date: appointment.appointment_date,
      patient_name: patient.first_name + " " + patient.last_name,
      doctor_name: doctor.first_name + " " + doctor.last_name,
    };

    const newPrescription = new Prescription({
      appointment_id: appointmentId,
      doctor_id: doctorId,
      patient_id: patientId,
      diagnosis,
      medications,
      notes,
      priority,
      follow_up_date: follow_up_date ? new Date(follow_up_date) : undefined,
      prescription_text, // Keep for backward compatibility
      appointment_snapshot: appointmentSnapshot,
    });

    const savedPrescription = await newPrescription.save();

    // Populate the response
    await savedPrescription.populate([
      { path: 'patient_id', select: 'first_name last_name email phone' },
      { path: 'doctor_id', select: 'first_name last_name specialty' },
      { path: 'appointment_id', select: 'appointment_date status' }
    ]);

    // Send notification to patient (uncomment if you have notification service)
    /*
    try {
      const patientName = `${patient.first_name} ${patient.last_name}`;
      const doctorName = `${doctor.first_name} ${doctor.last_name}`;

      await notificationService.createNotification({
        user_id: patientId,
        type: "email",
        category: "prescription_ready",
        title: "New Prescription Available",
        message: `
          <h2>New Prescription</h2>
          <p>Dear ${patientName},</p>
          <p>Dr. ${doctorName} has created a new prescription for you.</p>
          <p><strong>Diagnosis:</strong> ${diagnosis}</p>
          <p>Please review your prescription in your patient portal.</p>
        `,
        data: {
          prescriptionId: savedPrescription._id,
          doctorName,
          patientName,
        },
        priority: "medium",
      });
    } catch (notificationError) {
      console.error("Error sending prescription notification:", notificationError);
    }
    */

    res.status(201).json({
      message: "Prescription created successfully.",
      prescription: savedPrescription,
    });
  } catch (error) {
    console.error("Error creating prescription:", error.message);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

exports.getDoctorPrescriptions = async (req, res) => {
  try {
    const doctor_id = req.user._id;
    const { patientId, status, page = 1, limit = 10 } = req.query;

    let query = { doctor_id };

    if (patientId) {
      if (!patientId.match(/^[0-9a-fA-F]{24}$/)) {
        return res.status(400).json({ msg: "Invalid patient ID format." });
      }
      query.patient_id = patientId;
    }

    if (status) {
      query.status = status;
    }

    const skipIndex = (parseInt(page) - 1) * parseInt(limit);

    const prescriptions = await Prescription.find(query)
      .populate("patient_id", "first_name last_name email phone")
      .populate("doctor_id", "first_name last_name specialty")
      .populate("appointment_id", "appointment_date status")
      .sort({ createdAt: -1 })
      .skip(skipIndex)
      .limit(parseInt(limit));

    const totalPrescriptions = await Prescription.countDocuments(query);
    const totalPages = Math.ceil(totalPrescriptions / parseInt(limit));

    res.json({
      currentPage: parseInt(page),
      totalPages,
      totalPrescriptions,
      prescriptions,
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};

exports.updatePrescription = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { prescriptionId } = req.params;
    const { 
      diagnosis, 
      medications, 
      notes, 
      priority, 
      status, 
      follow_up_date,
      prescription_text 
    } = req.body;
    const doctor_id = req.user._id;

    let prescription = await Prescription.findById(prescriptionId)
      .populate("patient_id", "first_name last_name email")
      .populate("doctor_id", "first_name last_name");

    if (!prescription) {
      return res.status(404).json({ msg: "Prescription not found." });
    }

    if (prescription.doctor_id._id.toString() !== doctor_id) {
      return res.status(403).json({ 
        msg: "Not authorized to update this prescription." 
      });
    }

    // Update fields if provided
    if (diagnosis !== undefined) prescription.diagnosis = diagnosis;
    if (medications !== undefined) {
      // Validate medications if provided
      if (!Array.isArray(medications) || medications.length === 0) {
        return res.status(400).json({ 
          message: "At least one medication is required." 
        });
      }
      
      for (let i = 0; i < medications.length; i++) {
        const med = medications[i];
        if (!med.name || !med.dosage || !med.frequency) {
          return res.status(400).json({ 
            message: `Medication ${i + 1}: name, dosage, and frequency are required.` 
          });
        }
      }
      prescription.medications = medications;
    }
    if (notes !== undefined) prescription.notes = notes;
    if (priority !== undefined) prescription.priority = priority;
    if (status !== undefined) prescription.status = status;
    if (follow_up_date !== undefined) {
      prescription.follow_up_date = follow_up_date ? new Date(follow_up_date) : null;
    }
    if (prescription_text !== undefined) prescription.prescription_text = prescription_text;

    await prescription.save();

    // Send notification to patient about update (uncomment if needed)
    /*
    try {
      const patientName = `${prescription.patient_id.first_name} ${prescription.patient_id.last_name}`;
      const doctorName = `${prescription.doctor_id.first_name} ${prescription.doctor_id.last_name}`;

      await notificationService.createNotification({
        user_id: prescription.patient_id._id,
        type: "email",
        category: "prescription_ready",
        title: "Prescription Updated",
        message: `
          <h2>Prescription Update</h2>
          <p>Dear ${patientName},</p>
          <p>Your prescription from Dr. ${doctorName} has been updated.</p>
          <p>Please review the updated prescription in your patient portal.</p>
        `,
        data: {
          prescriptionId: prescription._id,
          doctorName,
          patientName,
          updateDate: new Date().toISOString(),
        },
        priority: "medium",
      });
    } catch (notificationError) {
      console.error("Error sending prescription update notification:", notificationError);
    }
    */

    res.json({ 
      message: "Prescription updated successfully", 
      prescription 
    });
  } catch (err) {
    console.error(err.message);
    if (err.kind === "ObjectId") {
      return res.status(400).json({ msg: "Invalid Prescription ID." });
    }
    res.status(500).send("Server Error");
  }
};

exports.getPatientPrescriptions = async (req, res) => {
  try {
    const patient_id = req.user._id;
    const { page = 1, limit = 10, status } = req.query;

    let query = { patient_id };
    if (status) {
      query.status = status;
    }

    const skipIndex = (parseInt(page) - 1) * parseInt(limit);

    const prescriptions = await Prescription.find(query)
      .populate("doctor_id", "first_name last_name specialty")
      .populate("appointment_id", "appointment_date")
      .sort({ createdAt: -1 })
      .skip(skipIndex)
      .limit(parseInt(limit));

    const totalPrescriptions = await Prescription.countDocuments(query);
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

    try {
      const patientName = `${prescription.patient_id.first_name} ${prescription.patient_id.last_name}`;
      const doctorName = `${prescription.doctor_id.first_name} ${prescription.doctor_id.last_name}`;

      await notificationService.createNotification({
        user_id: prescription.patient_id._id,
        type: "email",
        category: "prescription_ready",
        title: "Prescription Removed",
        message: `
          <h2>Prescription Removed</h2>
          <p>Dear ${patientName},</p>
          <p>A prescription from Dr. ${doctorName} has been removed from your records.</p>
          <p>If you have any questions, please contact your doctor.</p>
        `,
        data: {
          doctorName,
          patientName,
          removalDate: new Date().toISOString(),
        },
        priority: "medium",
      });
    } catch (notificationError) {
      console.error("Error sending prescription deletion notification:", notificationError);
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

// Get single prescription by ID
exports.getPrescriptionById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const userRole = req.user.role;

    const prescription = await Prescription.findById(id)
      .populate("patient_id", "first_name last_name email phone")
      .populate("doctor_id", "first_name last_name specialty")
      .populate("appointment_id", "appointment_date status");

    if (!prescription) {
      return res.status(404).json({ msg: "Prescription not found." });
    }

    // Check authorization
    const isAuthorized = 
      (userRole === "Doctor" && prescription.doctor_id._id.toString() === userId) ||
      (userRole === "Patient" && prescription.patient_id._id.toString() === userId);

    if (!isAuthorized) {
      return res.status(403).json({ 
        msg: "Not authorized to view this prescription." 
      });
    }

    res.json(prescription);
  } catch (error) {
    console.error(error.message);
    if (error.kind === "ObjectId") {
      return res.status(400).json({ msg: "Invalid Prescription ID." });
    }
    res.status(500).send("Server Error");
  }
};
