const Appointment = require("../../models/Appointment");
const User = require("../../models/User");
const notificationService = require("../services/notificationService");
const NotificationHelpers = require("../utils/notificationHelpers");

exports.createAppointment = async (req, res) => {
  try {
    const doctorId = req.user.id; 

    const {
      patient_id,
      appointment_date,
      status,
      payment_status,
      patient_info,
      doctor_info,
    } = req.body;

    if (!patient_id || !appointment_date) {
      return res
        .status(400)
        .json({ message: "Please provide patient ID and appointment date." });
    }

    const existingPatient = await User.findById(patient_id);
    if (!existingPatient || existingPatient.role !== "Patient") {
      return res
        .status(404)
        .json({ message: "Patient not found or invalid patient ID." });
    }

    const finalPatientInfo = patient_info || {
      name: `${existingPatient.first_name || ""} ${
        existingPatient.last_name || ""
      }`.trim(),
      phone: existingPatient.phone || "",
      email: existingPatient.email || "",
    };

    const existingDoctor = await User.findById(doctorId);
    if (!existingDoctor || existingDoctor.role !== "Doctor") {
      return res
        .status(403)
        .json({ message: "Logged-in user is not a valid doctor." });
    }
    const finalDoctorInfo = doctor_info || {
      name: `${existingDoctor.first_name || ""} ${
        existingDoctor.last_name || ""
      }`.trim(),
      specialty: existingDoctor.specialty || "", 
      phone: existingDoctor.phone || "",
    };

    const newAppointment = new Appointment({
      doctor_id: doctorId,
      patient_id,
      appointment_date,
      status: status || "booked", 
      payment_status: payment_status || "unpaid", 
      patient_info: finalPatientInfo,
      doctor_info: finalDoctorInfo,
    });

    const savedAppointment = await newAppointment.save();

    const populatedAppointment = await Appointment.findById(
      savedAppointment._id
    )
      .populate("doctor_id", "first_name last_name email specialty phone")
      .populate("patient_id", "first_name last_name email phone");

    // Send notifications after successful appointment creation
    try {
      // Notify patient about appointment booking
      await notificationService.sendToUser(
        patient_id,
        'appointment_booked',
        {
          patientName: finalPatientInfo.name,
          doctorName: finalDoctorInfo.name,
          appointmentDate: new Date(appointment_date).toDateString(),
          appointmentTime: new Date(appointment_date).toLocaleTimeString(),
          specialty: finalDoctorInfo.specialty,
          fee: savedAppointment.amount || 'N/A'
        },
        'email'
      );

      // Notify doctor about new appointment
      await notificationService.sendToUser(
        doctorId,
        'new_appointment',
        {
          patientName: finalPatientInfo.name,
          doctorName: finalDoctorInfo.name,
          appointmentDate: new Date(appointment_date).toDateString(),
          appointmentTime: new Date(appointment_date).toLocaleTimeString()
        },
        'email'
      );

      console.log('Appointment notifications sent successfully');
    } catch (notificationError) {
      console.error('Error sending appointment notifications:', notificationError);
      // Don't fail the appointment creation if notifications fail
    }

    res.status(201).json({
      message: "Appointment created successfully",
      appointment: populatedAppointment,
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server Error");
  }
};

exports.getAppointments = async (req, res) => {
  try {
    const doctorId = req.user.id;

    const page = parseInt(req.query.page) || 1; 
    const limit = parseInt(req.query.limit) || 10; 

    const skipIndex = (page - 1) * limit;

    const appointments = await Appointment.find({
      doctor_id: doctorId,
      is_deleted: false,
    })
      .sort({ appointment_date: -1 })
      .skip(skipIndex)
      .limit(limit)
      .populate("doctor_id", "first_name last_name email specialty phone")
      .populate("patient_id", "first_name last_name email phone");

    const totalAppointments = await Appointment.countDocuments({
      doctor_id: doctorId,
      is_deleted: false,
    });

    const totalPages = Math.ceil(totalAppointments / limit);

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

exports.getAppointmentById = async (req, res) => {
  try {
    const doctorId = req.user.id;
    const appointment = await Appointment.findOne({
      _id: req.params.id,
      is_deleted: false,
    })
      .populate("doctor_id", "first_name last_name specialty")
      .populate("patient_id", "first_name last_name");

    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found." });
    }

    if (appointment.doctor_id._id.toString() !== doctorId) {
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

exports.updateAppointment = async (req, res) => {
  try {
    const doctorId = req.user.id;

    const {
      patient_id,
      appointment_date,
      status,
      payment_status,
      patient_info,
      doctor_info,
    } = req.body;

    let appointment = await Appointment.findById(req.params.id)
      .populate("doctor_id", "first_name last_name")
      .populate("patient_id", "first_name last_name");

    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found." });
    }

    if (appointment.doctor_id._id.toString() !== doctorId) {
      return res.status(403).json({
        message:
          "Access denied: You are not authorized to update this appointment.",
      });
    }

    // Store old status for notification logic
    const oldStatus = appointment.status;

    // Update appointment fields
    if (patient_id) appointment.patient_id = patient_id;
    if (appointment_date) appointment.appointment_date = appointment_date;
    if (status) appointment.status = status;
    if (payment_status) appointment.payment_status = payment_status;
    if (patient_info) appointment.patient_info = patient_info;
    if (doctor_info) appointment.doctor_info = doctor_info;

    await appointment.save();

    // Send notifications based on status changes
    if (status && status !== oldStatus) {
      try {
        const patientName = appointment.patient_info?.name || 
          `${appointment.patient_id.first_name} ${appointment.patient_id.last_name}`;
        const doctorName = appointment.doctor_info?.name || 
          `${appointment.doctor_id.first_name} ${appointment.doctor_id.last_name}`;

        const notificationData = {
          patientName,
          doctorName,
          appointmentDate: new Date(appointment.appointment_date).toDateString(),
          appointmentTime: new Date(appointment.appointment_date).toLocaleTimeString()
        };

        switch (status) {
          case 'confirmed':
            await notificationService.sendToUser(
              appointment.patient_id._id,
              'appointment_confirmed',
              notificationData,
              'email'
            );
            break;

          case 'cancelled':
            await notificationService.sendToUser(
              appointment.patient_id._id,
              'appointment_cancelled',
              {
                ...notificationData,
                reason: req.body.cancellation_reason || 'No reason provided'
              },
              'email'
            );
            break;

          case 'completed':
            // You can add a completion notification if needed
            console.log('Appointment marked as completed');
            break;
        }

        console.log(`Appointment status change notification sent: ${oldStatus} -> ${status}`);
      } catch (notificationError) {
        console.error('Error sending status change notification:', notificationError);
      }
    }

    res.json({ message: "Appointment updated successfully", appointment });
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server Error");
  }
};

exports.deleteAppointment = async (req, res) => {
  try {
    const doctorId = req.user.id;
    let appointment = await Appointment.findById(req.params.id)
      .populate("doctor_id", "first_name last_name")
      .populate("patient_id", "first_name last_name");

    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found." });
    }

    if (appointment.doctor_id._id.toString() !== doctorId) {
      return res.status(403).json({
        message:
          "Access denied: You are not authorized to delete this appointment.",
      });
    }

    // Soft delete the appointment
    appointment.is_deleted = true;
    await appointment.save();

    // Send cancellation notification to patient
    try {
      const patientName = appointment.patient_info?.name || 
        `${appointment.patient_id.first_name} ${appointment.patient_id.last_name}`;
      const doctorName = appointment.doctor_info?.name || 
        `${appointment.doctor_id.first_name} ${appointment.doctor_id.last_name}`;

      await notificationService.sendToUser(
        appointment.patient_id._id,
        'appointment_cancelled',
        {
          patientName,
          doctorName,
          appointmentDate: new Date(appointment.appointment_date).toDateString(),
          reason: 'Appointment cancelled by doctor'
        },
        'email'
      );

      console.log('Appointment cancellation notification sent to patient');
    } catch (notificationError) {
      console.error('Error sending cancellation notification:', notificationError);
    }

    res.json({ message: "Appointment soft-deleted successfully." });
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server Error");
  }
};

// Additional method to confirm appointment (if needed)
exports.confirmAppointment = async (req, res) => {
  try {
    const doctorId = req.user.id;
    const appointmentId = req.params.id;

    const appointment = await Appointment.findById(appointmentId)
      .populate("doctor_id", "first_name last_name")
      .populate("patient_id", "first_name last_name");

    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found." });
    }

    if (appointment.doctor_id._id.toString() !== doctorId) {
      return res.status(403).json({
        message: "Access denied: You are not authorized to confirm this appointment.",
      });
    }

    appointment.status = 'confirmed';
    await appointment.save();

    // Send confirmation notification
    try {
      await NotificationHelpers.notifyAppointmentUpdate(appointmentId, 'confirmed');
      console.log('Appointment confirmation notification sent');
    } catch (notificationError) {
      console.error('Error sending confirmation notification:', notificationError);
    }

    res.json({ 
      message: "Appointment confirmed successfully", 
      appointment 
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server Error");
  }
};