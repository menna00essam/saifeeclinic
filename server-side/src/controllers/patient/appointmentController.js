const Appointment = require("../../models/Appointment");
const DoctorSchedule = require("../../models/DoctorSchedule");
const User = require("../../models/User");
const { responseHandler } = require("../../utils/responseHandler");

// Import notification services
const notificationService = require("../../services/notificationService");
const NotificationHelpers = require("../../utils/notificationHelpers");

// Book Appointment
const bookAppointment = async (req, res, next) => {
    try {
        const { doctor_id, appointment_date } = req.body;
        const patient_id = req.user.id;

        const doctor = await User.findOne({ _id: doctor_id, role: 'Doctor' });
        if (!doctor) {
            return responseHandler.error(res, 'Doctor not found', 404);
        }

        // Get doctor schedule 
        const schedule = await DoctorSchedule.findOne({ doctor_id });
        if (!schedule) {
            return responseHandler.error(res, 'Doctor has no schedule set', 400);
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

        // Send notifications after successful booking
        try {
            // Notification to patient
            await notificationService.sendToUser(
                patient_id,
                'appointment_booked',
                {
                    patientName: `${patient.first_name} ${patient.last_name}`,
                    doctorName: `${doctor.first_name} ${doctor.last_name}`,
                    appointmentDate: new Date(appointment_date).toDateString(),
                    appointmentTime: new Date(appointment_date).toTimeString().slice(0, 5),
                    specialty: doctor.doctor_profile.specialization,
                    fee: newAppointment.amount || 'To be determined'
                },
                'email' // Can also send SMS by changing to 'sms'
            );

            // Notification to doctor about new appointment
            await notificationService.sendToUser(
                doctor_id,
                'new_appointment',
                {
                    patientName: `${patient.first_name} ${patient.last_name}`,
                    doctorName: `${doctor.first_name} ${doctor.last_name}`,
                    appointmentDate: new Date(appointment_date).toDateString(),
                    appointmentTime: new Date(appointment_date).toTimeString().slice(0, 5)
                },
                'email'
            );

            // Optional: Also send in-app notifications
            await notificationService.sendToUser(patient_id, 'appointment_booked', {
                patientName: `${patient.first_name} ${patient.last_name}`,
                doctorName: `${doctor.first_name} ${doctor.last_name}`,
                appointmentDate: new Date(appointment_date).toDateString(),
                appointmentTime: new Date(appointment_date).toTimeString().slice(0, 5),
                specialty: doctor.doctor_profile.specialization
            }, 'in_app');

            await notificationService.sendToUser(doctor_id, 'new_appointment', {
                patientName: `${patient.first_name} ${patient.last_name}`,
                doctorName: `${doctor.first_name} ${doctor.last_name}`,
                appointmentDate: new Date(appointment_date).toDateString(),
                appointmentTime: new Date(appointment_date).toTimeString().slice(0, 5)
            }, 'in_app');

        } catch (notificationError) {
            // Log notification error but don't fail the appointment booking
            console.error('Error sending appointment booking notifications:', notificationError);
        }

        return responseHandler.success(res, newAppointment, 'Appointment booked successfully', 201);

    } catch (err) {
        return responseHandler.error(res, 'Failed to book appointment', 500, err);
    }
};

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
        return responseHandler.error(res, 'Failed to fetch patient appointments', 500);
    }
};

// Get one appointment
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
        return responseHandler.error(res, 'Failed to fetch appointment data', 500, err);
    }
};

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
            return responseHandler.error(res, 'You are not authorized to update this appointment', 403);
        }

        const doctor = await User.findById(appointment.doctor_id);
        const patient = await User.findById(patientId);
        
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
            );
        });

        if (!isAvailable) {
            return responseHandler.error(res, 'Doctor not available at that time', 400);
        }

        const existingAppointment = await Appointment.findOne({
            doctor_id: doctor._id,
            appointment_date: new_date,
            _id: { $ne: appointmentId },
            is_deleted: false
        });

        if (existingAppointment) {
            return responseHandler.error(res, 'This appointment time is already booked', 400);
        }

        // Store old date for notification
        const oldDate = appointment.appointment_date;
        
        appointment.appointment_date = new_date;
        await appointment.save();

        // Send notifications about appointment update
        try {
            // Notify patient about appointment update
            await notificationService.sendToUser(
                patientId,
                'schedule_updated',
                {
                    patientName: `${patient.first_name} ${patient.last_name}`,
                    doctorName: `${doctor.first_name} ${doctor.last_name}`,
                    oldDate: new Date(oldDate).toDateString(),
                    oldTime: new Date(oldDate).toTimeString().slice(0, 5),
                    newDate: new Date(new_date).toDateString(),
                    newTime: new Date(new_date).toTimeString().slice(0, 5)
                },
                'email'
            );

            // Notify doctor about appointment update
            await notificationService.sendToUser(
                doctor._id,
                'schedule_updated',
                {
                    patientName: `${patient.first_name} ${patient.last_name}`,
                    doctorName: `${doctor.first_name} ${doctor.last_name}`,
                    oldDate: new Date(oldDate).toDateString(),
                    oldTime: new Date(oldDate).toTimeString().slice(0, 5),
                    newDate: new Date(new_date).toDateString(),
                    newTime: new Date(new_date).toTimeString().slice(0, 5)
                },
                'email'
            );

            // Also send in-app notifications
            await notificationService.sendToUser(patientId, 'schedule_updated', {
                patientName: `${patient.first_name} ${patient.last_name}`,
                doctorName: `${doctor.first_name} ${doctor.last_name}`,
                newDate: new Date(new_date).toDateString(),
                newTime: new Date(new_date).toTimeString().slice(0, 5)
            }, 'in_app');

        } catch (notificationError) {
            console.error('Error sending appointment update notifications:', notificationError);
        }

        return responseHandler.success(res, appointment, 'Appointment updated successfully', 200);
    } catch (err) {
        return responseHandler.error(res, 'Failed to update appointment', 500, err);
    }
};

// Cancel appointment
const cancelAppointment = async (req, res, next) => {
    try {
        const patientId = req.user.id;
        const appointmentId = req.params.appointment_id;
        const { reason } = req.body; // Optional cancellation reason

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

        const doctor = await User.findById(appointment.doctor_id);
        if (!doctor) {
            return responseHandler.error(res, 'Doctor not found', 404);
        }

        appointment.status = 'cancelled';
        await appointment.save();

        // Send cancellation notifications
        try {
            // Notify patient about cancellation confirmation
            await notificationService.sendToUser(
                patientId,
                'appointment_cancelled',
                {
                    patientName: `${patient.first_name} ${patient.last_name}`,
                    doctorName: `${doctor.first_name} ${doctor.last_name}`,
                    appointmentDate: new Date(appointment.appointment_date).toDateString(),
                    appointmentTime: new Date(appointment.appointment_date).toTimeString().slice(0, 5),
                    reason: reason || 'Cancelled by patient',
                    refundInfo: 'If applicable, refund will be processed within 3-5 business days'
                },
                'email'
            );

            // Notify doctor about appointment cancellation
            await notificationService.sendToUser(
                doctor._id,
                'appointment_cancelled',
                {
                    patientName: `${patient.first_name} ${patient.last_name}`,
                    doctorName: `${doctor.first_name} ${doctor.last_name}`,
                    appointmentDate: new Date(appointment.appointment_date).toDateString(),
                    appointmentTime: new Date(appointment.appointment_date).toTimeString().slice(0, 5),
                    reason: reason || 'Cancelled by patient'
                },
                'email'
            );

            // Send in-app notifications
            await notificationService.sendToUser(patientId, 'appointment_cancelled', {
                patientName: `${patient.first_name} ${patient.last_name}`,
                doctorName: `${doctor.first_name} ${doctor.last_name}`,
                appointmentDate: new Date(appointment.appointment_date).toDateString(),
                reason: reason || 'Cancelled by patient'
            }, 'in_app');

            await notificationService.sendToUser(doctor._id, 'appointment_cancelled', {
                patientName: `${patient.first_name} ${patient.last_name}`,
                doctorName: `${doctor.first_name} ${doctor.last_name}`,
                appointmentDate: new Date(appointment.appointment_date).toDateString(),
                reason: reason || 'Cancelled by patient'
            }, 'in_app');

        } catch (notificationError) {
            console.error('Error sending appointment cancellation notifications:', notificationError);
        }

        return responseHandler.success(res, null, 'Appointment cancelled successfully', 200);
    } catch (err) {
        return responseHandler.error(res, 'Failed to cancel appointment', 500, err);
    }
};

// Delete appointment (Admin/Doctor only)
const deleteAppointment = async (req, res, next) => {
    try {
        const appointmentId = req.params.appointment_id;
        const userId = req.user.id;
        const userRole = req.user.role;

        const appointment = await Appointment.findById(appointmentId);
        if (!appointment || appointment.is_deleted) {
            return responseHandler.error(res, 'Appointment not found', 404);
        }

        if (userRole !== 'Admin' && appointment.doctor_id.toString() !== userId) {
            return responseHandler.error(res, 'You are not authorized to delete this appointment', 403);
        }

        // Get patient and doctor info for notifications
        const patient = await User.findById(appointment.patient_id);
        const doctor = await User.findById(appointment.doctor_id);

        appointment.is_deleted = true;
        appointment.status = 'cancelled';
        await appointment.save();

        // Send notifications about appointment deletion
        try {
            if (patient) {
                await notificationService.sendToUser(
                    patient._id,
                    'appointment_cancelled',
                    {
                        patientName: `${patient.first_name} ${patient.last_name}`,
                        doctorName: doctor ? `${doctor.first_name} ${doctor.last_name}` : 'Doctor',
                        appointmentDate: new Date(appointment.appointment_date).toDateString(),
                        appointmentTime: new Date(appointment.appointment_date).toTimeString().slice(0, 5),
                        reason: 'Appointment deleted by system administrator',
                        refundInfo: 'If applicable, refund will be processed within 3-5 business days'
                    },
                    'email'
                );

                // In-app notification for patient
                await notificationService.sendToUser(patient._id, 'appointment_cancelled', {
                    patientName: `${patient.first_name} ${patient.last_name}`,
                    doctorName: doctor ? `${doctor.first_name} ${doctor.last_name}` : 'Doctor',
                    appointmentDate: new Date(appointment.appointment_date).toDateString(),
                    reason: 'Appointment deleted by system'
                }, 'in_app');
            }

            // If deleted by admin, notify doctor too (unless doctor deleted it)
            if (doctor && userRole === 'Admin') {
                await notificationService.sendToUser(
                    doctor._id,
                    'appointment_cancelled',
                    {
                        patientName: patient ? `${patient.first_name} ${patient.last_name}` : 'Patient',
                        doctorName: `${doctor.first_name} ${doctor.last_name}`,
                        appointmentDate: new Date(appointment.appointment_date).toDateString(),
                        appointmentTime: new Date(appointment.appointment_date).toTimeString().slice(0, 5),
                        reason: 'Appointment deleted by system administrator'
                    },
                    'email'
                );
            }

        } catch (notificationError) {
            console.error('Error sending appointment deletion notifications:', notificationError);
        }

        return responseHandler.success(res, null, 'Appointment deleted successfully', 200);
    } catch (err) {
        return responseHandler.error(res, 'Failed to delete appointment', 500, err);
    }
};

// Confirm appointment (Doctor only)
const confirmAppointment = async (req, res, next) => {
    try {
        const appointmentId = req.params.appointment_id;
        const doctorId = req.user.id;

        const appointment = await Appointment.findById(appointmentId);
        if (!appointment || appointment.is_deleted) {
            return responseHandler.error(res, 'Appointment not found', 404);
        }

        if (appointment.doctor_id.toString() !== doctorId) {
            return responseHandler.error(res, 'You are not authorized to confirm this appointment', 403);
        }

        if (appointment.status === 'confirmed') {
            return responseHandler.error(res, 'Appointment is already confirmed', 400);
        }

        const patient = await User.findById(appointment.patient_id);
        const doctor = await User.findById(doctorId);

        appointment.status = 'confirmed';
        await appointment.save();

        // Send confirmation notifications
        try {
            // Notify patient about confirmation
            await notificationService.sendToUser(
                appointment.patient_id,
                'appointment_confirmed',
                {
                    patientName: `${patient.first_name} ${patient.last_name}`,
                    doctorName: `${doctor.first_name} ${doctor.last_name}`,
                    appointmentDate: new Date(appointment.appointment_date).toDateString(),
                    appointmentTime: new Date(appointment.appointment_date).toTimeString().slice(0, 5)
                },
                'email'
            );

            // Send SMS notification as well for confirmation
            if (patient.phone) {
                await notificationService.sendToUser(
                    appointment.patient_id,
                    'appointment_confirmed',
                    {
                        patientName: `${patient.first_name} ${patient.last_name}`,
                        doctorName: `${doctor.first_name} ${doctor.last_name}`,
                        appointmentDate: new Date(appointment.appointment_date).toDateString(),
                        appointmentTime: new Date(appointment.appointment_date).toTimeString().slice(0, 5)
                    },
                    'sms'
                );
            }

            // In-app notification
            await notificationService.sendToUser(appointment.patient_id, 'appointment_confirmed', {
                patientName: `${patient.first_name} ${patient.last_name}`,
                doctorName: `${doctor.first_name} ${doctor.last_name}`,
                appointmentDate: new Date(appointment.appointment_date).toDateString(),
                appointmentTime: new Date(appointment.appointment_date).toTimeString().slice(0, 5)
            }, 'in_app');

        } catch (notificationError) {
            console.error('Error sending appointment confirmation notifications:', notificationError);
        }

        return responseHandler.success(res, appointment, 'Appointment confirmed successfully', 200);
    } catch (err) {
        return responseHandler.error(res, 'Failed to confirm appointment', 500, err);
    }
};

module.exports = { 
    bookAppointment, 
    getAllAppointments, 
    getAppointmentById, 
    updateAppointment, 
    cancelAppointment, 
    deleteAppointment,
    confirmAppointment 
};