const Appointment = require("../../models/Appointment");
const DoctorSchedule = require("../../models/DoctorSchedule");
const User = require("../../models/User");
const { responseHandler } = require("../../utils/responseHandler")

// Book Appointment
const bookAppointment = async (req, res, next) => {
    try {
        const { doctor_id, appointment_date } = req.body;
        const patient_id = req.user.id;

        const doctor = await User.findOne({ _id: doctor_id, role: 'Doctor' })
        if (!doctor) {
            return responseHandler.error(res, 'Doctor not found ', 404)
        }

        // Get dcotor schedule 
        const schedule = await DoctorSchedule.findOne({ doctor_id });
        if (!schedule) {
            return responseHandler.error(res, 'Doctor has no schedule set ', 400)
        }

        // Check if user appointment is available for doctor
        // 1- Get appointment day and time
        const appointmentDay = new Date(appointment_date).toLocaleDateString('en-US', { weekday: 'long' });
        const appointmentTime = new Date(appointment_date).toTimeString().slice(0, 5);

        // 2- Check if it's available for doctor or not
        const isAvailable = schedule.available_slots.some(slot => {
            return (
                slot.weekday === appointmentDay &&
                appointmentTime >= slot.start_time &&
                appointmentTime <= slot.end_time
            );
        });
        if (!isAvailable) {
            return responseHandler.error(res, 'Doctor is not available at that time', 400);
        }

        // Check if this appointment already booked
        const existingAppointment = await Appointment.findOne({
            doctor_id,
            appointment_date,
            is_deleted: false
        });
        if (existingAppointment) {
            return responseHandler.error(res, 'Appointment already booked at that time', 400);
        }

        const patient = await User.findById(patient_id);
        if (!patient) {
            return responseHandler.error(res, 'Patient not found', 404);
        }

        const newAppointment = await Appointment.create({
            patient_id,
            doctor_id,
            appointment_date,
            patient_info: {
                name: `${patient.first_name} ${patient.last_name}`,
                email: patient.email,
                phone: patient.phone
            },
            doctor_info: {
                name: `${doctor.first_name} ${doctor.last_name}`,
                specialty: doctor.doctor_profile.specialization,
                phone: doctor.phone
            }
        });

        patient.patient_profile.appointments.push(newAppointment._id);
        doctor.doctor_profile.appointments.push(newAppointment._id);

        await patient.save();
        await doctor.save();

        return responseHandler.success(res, newAppointment, 'Appointment booked successfully', 201);

    } catch (err) {
        return responseHandler.error(res, 'Faild to book appointment', 500, err);
    }
}

// Get all appointments
const getAllAppointments = async (req, res, next) => {
    try {
        const patientId = req.user.id;

        const patient = await User.findOne({ _id: patientId, role: 'Patient', is_deleted: false });
        if (!patient) {
            return responseHandler.error(res, 'Patient not found', 404);
        }

        const appointments = await Appointment.find({
            patient_id: patientId,
            is_deleted: false
        }).sort({ appointment_date: -1 });

        return responseHandler.success(res, appointments, 'Appointments fetched successfully', 200);
    } catch (err) {
        return responseHandler.error(res, 'Faild to fetch patient appointments', 500);
    }
}

// Get one appoitment
const getAppointmentById = async (req, res, next) => {
    try {
        const patientId = req.user.id;
        const appointmentId = req.params.appointment_id;

        const patient = await User.findOne({ _id: patientId, role: 'Patient', is_deleted: false });
        if (!patient) {
            return responseHandler.error(res, 'Patient not found', 404);
        }

        const appointment = await Appointment.findById(appointmentId);
        if (!appointment || appointment.is_deleted) {
            return responseHandler.error(res, 'Appointment not found', 404);
        }

        if (appointment.patient_id.toString() !== patientId) {
            return responseHandler.error(res, 'The appointment does not belong to the patient', 403);
        }

        return responseHandler.success(res, appointment, 'Appointment fetched successfully', 200);
    } catch (err) {
        return responseHandler.error(res, 'Faild to fetch appointment data', 500, err);
    }
}

// Update appointment
const updateAppointment = async (req, res, next) => {
    try {
        const patientId = req.user.id;
        const appointmentId = req.params.appointment_id;
        const { new_date } = req.body;

        const appointment = await Appointment.findById(appointmentId);
        if (!appointment || appointment.is_deleted) {
            return responseHandler.error(res, 'Appointment not found', 404);
        }

        if (appointment.patient_id.toString() !== patientId) {
            return responseHandler.error(res, 'You are not authorized to cancel this appointment', 403);
        }

        const doctor = await User.findById(appointment.doctor_id);
        if (!doctor) {
            return responseHandler.error(res, 'Doctor not found', 404);
        }

        const schedule = await DoctorSchedule.findOne({ doctor_id: doctor._id });
        if (!schedule) {
            return responseHandler.error(res, 'Doctor has no schedule', 400);
        }

        const appointmentDay = new Date(new_date).toLocaleDateString('en-US', { weekday: 'long' });
        const appointmentTime = new Date(new_date).toTimeString().slice(0, 5);

        const isAvailable = schedule.available_slots.some(slot => {
            return (
                slot.weekday === appointmentDay &&
                appointmentTime >= slot.start_time &&
                appointmentTime <= slot.end_time
            )
        });

        if (!isAvailable) {
            return responseHandler.error(res, 'Doctor not available at that time', 400);
        }

        const existingAppointment = await Appointment.findOne({
            doctor_id: doctor._id,
            appointment_date: new_date,
            _id: { $ne: appointmentId },
            is_deleted: false
        })

        if (existingAppointment) {
            return responseHandler.error(res, 'This appointment is already exist', 400);
        }

        appointment.appointment_date = new_date;
        await appointment.save();

        return responseHandler.success(res, appointment, 'Appointment updated successfully', 200);
    } catch (err) {
        return responseHandler.error(res, 'Faild to update appointment', 500, err);
    }
}

// Cancel appointment
const cancelAppointment = async (req, res, next) => {
    try {
        const patientId = req.user.id;
        const appointmentId = req.params.appointment_id;

        const patient = await User.findOne({ _id: patientId, role: 'Patient', is_deleted: false });
        if (!patient) {
            return responseHandler.error(res, 'Patient not found', 404);
        }

        const appointment = await Appointment.findById(appointmentId);
        if (!appointment || appointment.is_deleted) {
            return responseHandler.error(res, 'Appointment not found', 404);
        }

        if (appointment.patient_id.toString() !== patientId) {
            return responseHandler.error(res, 'You are not authorized to cancel this appointment', 403);
        }

        appointment.status = 'cancelled';
        await appointment.save();

        return responseHandler.success(res, null, 'Appointment cancelled successfully', 200);
    } catch (err) {
        return responseHandler.error(res, 'Faild to cancel appointment', 500, err);
    }
}

// Delete appointment
const deleteAppointment = async (req, res, next) => {
    try {
        const appointmentId = req.params.appointment_id;
        const doctorId = req.user.id;
        const userRole = req.user.role;

        const appointment = await Appointment.findById(appointmentId);
        if (!appointment || appointment.is_deleted) {
            return responseHandler.error(res, 'Appointment not found', 404);
        }

        if (userRole !== 'Admin' && appointment.doctor_id.toString() !== doctorId) {
            return responseHandler.error(res, 'You are not authorized to delete this appointment', 403);
        }

        appointment.is_deleted = true;
        appointment.status = 'cancelled';
        await appointment.save();

        return responseHandler.success(res, 'Appointment deleted successfully', 200);
    } catch (err) {
        return responseHandler.error(res, 'Faild to delete appointment', 500, err);
    }
}

module.exports = { bookAppointment, getAllAppointments, getAppointmentById, updateAppointment, cancelAppointment, deleteAppointment }