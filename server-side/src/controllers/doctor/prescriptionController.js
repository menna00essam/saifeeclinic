const { validationResult } = require("express-validator");
const Prescription = require("../../models/Prescription");
const Appointment = require("../../models/Appointment");
const User = require("../../models/User");

exports.createPrescription = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { appointment_id, patient_id, prescription_text } = req.body;
  const doctor_id = req.user.id; 

  try {
    const appointment = await Appointment.findById(appointment_id)
      .populate("patient_id", "first_name last_name") 
      .populate("doctor_id", "first_name last_name"); 

    if (!appointment) {
      return res.status(404).json({ msg: "Appointment not found." });
    }

    if (appointment.doctor_id._id.toString() !== doctor_id) {
      return res.status(403).json({
        msg: "Not authorized to create prescription for this appointment. Doctor mismatch.",
      });
    }

    if (appointment.patient_id._id.toString() !== patient_id) {
      return res.status(400).json({
        msg: "Patient ID provided does not match the patient associated with this appointment.",
      });
    }


    if (appointment.status !== "completed" && appointment.status !== "booked") {
      return res.status(400).json({
        msg: `Prescriptions can only be created for 'booked' or 'completed' appointments. Current status: ${appointment.status}`,
      });
    }

    const appointment_snapshot = {
      appointment_date: appointment.appointment_date, 
      patient_name: appointment.patient_info.name,
      doctor_name: appointment.doctor_info.name,
    };

    const newPrescription = new Prescription({
      appointment_id,
      doctor_id,
      patient_id,
      prescription_text,
      appointment_snapshot,
    });

    await newPrescription.save();

    res.status(201).json({
      message: "Prescription created successfully",
      prescription: newPrescription,
    });
  } catch (err) {
    console.error(err.message);
    if (err.kind === "ObjectId") {
      return res
        .status(400)
        .json({ msg: "Invalid appointment ID or patient ID." });
    }
    res.status(500).send("Server Error");
  }
};
exports.getDoctorPrescriptions = async (req, res) => {
  const doctor_id = req.user.id;
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

  const { id } = req.params; 
  const { prescription_text } = req.body; 
  const doctor_id = req.user.id; 

  try {
    let prescription = await Prescription.findById(id);

    if (!prescription) {
      return res.status(404).json({ msg: "Prescription not found." });
    }

    if (prescription.doctor_id.toString() !== doctor_id) {
      return res
        .status(403)
        .json({ msg: "Not authorized to update this prescription." });
    }

    if (prescription_text) {
      prescription.prescription_text = prescription_text;
    }

    await prescription.save(); 

    res.json({ message: "Prescription updated successfully", prescription });
  } catch (err) {
    console.error(err.message);
    if (err.kind === "ObjectId") {
      return res.status(400).json({ msg: "Invalid Prescription ID." });
    }
    res.status(500).send("Server Error");
  }
};
