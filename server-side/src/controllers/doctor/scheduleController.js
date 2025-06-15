const DoctorSchedule = require('../../models/DoctorSchedule');
const Appointment = require('../../models/Appointment');
const User = require('../../models/User');
const { validationResult } = require('express-validator');
const { responseHandler } = require('../../utils/responseHandler');

// Import notification services
const notificationService = require("../../services/notificationService");

exports.updateDoctorSchedule = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return responseHandler.error(res, 'Validation failed', 400, errors.array());
    }

    const { available_slots } = req.body;
    const doctorId = req.user.id; 

    // Validate available_slots format
    if (available_slots && Array.isArray(available_slots)) {
        for (const slot of available_slots) {
            const { start_time, end_time, weekday } = slot;

            if (!start_time || !end_time || !weekday) {
                return responseHandler.error(res, 'Start time, end time, and weekday are required for each slot', 400);
            }

            // Validate weekday
            const validWeekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
            if (!validWeekdays.includes(weekday)) {
                return responseHandler.error(res, 'Invalid weekday. Must be one of: ' + validWeekdays.join(', '), 400);
            }

            // Validate time format
            if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(start_time) || !/^([01]\d|2[0-3]):([0-5]\d)$/.test(end_time)) {
                return responseHandler.error(res, 'Time format for slots must be HH:MM', 400);
            }

            // Convert times to compare (e.g., "09:00" -> 900, "17:30" -> 1730)
            const startMinutes = parseInt(start_time.split(':')[0]) * 60 + parseInt(start_time.split(':')[1]);
            const endMinutes = parseInt(end_time.split(':')[0]) * 60 + parseInt(end_time.split(':')[1]);

            if (startMinutes >= endMinutes) {
                return responseHandler.error(res, 'End time must be after start time for each slot', 400);
            }
        }
    } else if (available_slots === undefined || available_slots === null) {
        // If available_slots is not provided, treat it as an empty array to clear schedule
        req.body.available_slots = [];
    } else {
        return responseHandler.error(res, 'Available slots must be an array', 400);
    }

    try {
        // Get doctor information for notifications
        const doctor = await User.findById(doctorId);
        if (!doctor) {
            return responseHandler.error(res, 'Doctor not found', 404);
        }

        // Get existing schedule to check for conflicts
        const existingSchedule = await DoctorSchedule.findOne({ doctor_id: doctorId });
        
        // Check for conflicting appointments when schedule is being updated
        let conflictingAppointments = [];
        if (req.body.available_slots.length > 0) {
            const upcomingAppointments = await Appointment.find({
                doctor_id: doctorId,
                appointment_date: { $gte: new Date() },
                status: { $in: ['pending', 'confirmed'] },
                is_deleted: false
            }).populate('patient_id', 'first_name last_name');

            // Check each upcoming appointment against new schedule
            for (const appointment of upcomingAppointments) {
                const appointmentDay = new Date(appointment.appointment_date).toLocaleDateString('en-US', { weekday: 'long' });
                const appointmentTime = new Date(appointment.appointment_date).toTimeString().slice(0, 5);

                const isAvailable = req.body.available_slots.some(slot => {
                    return (
                        slot.weekday === appointmentDay &&
                        appointmentTime >= slot.start_time &&
                        appointmentTime <= slot.end_time
                    );
                });

                if (!isAvailable) {
                    conflictingAppointments.push({
                        appointmentId: appointment._id,
                        patientName: `${appointment.patient_id.first_name} ${appointment.patient_id.last_name}`,
                        date: new Date(appointment.appointment_date).toDateString(),
                        time: appointmentTime
                    });
                }
            }
        }

        // Update the schedule
        let schedule = await DoctorSchedule.findOneAndUpdate(
            { doctor_id: doctorId },
            { $set: { available_slots: req.body.available_slots } },
            { new: true, upsert: true, runValidators: true }
        );

        // Send notifications after successful schedule update
        try {
            // Notify doctor about schedule update
            await notificationService.sendToUser(
                doctorId,
                'doctor_schedule_updated',
                {
                    doctorName: `${doctor.first_name} ${doctor.last_name}`,
                    availableSlots: req.body.available_slots || []
                },
                'email'
            );

            // Also send in-app notification
            await notificationService.sendToUser(doctorId, 'doctor_schedule_updated', {
                doctorName: `${doctor.first_name} ${doctor.last_name}`,
                availableSlots: req.body.available_slots || []
            }, 'in_app');

            // If there are conflicting appointments, send conflict notification
            if (conflictingAppointments.length > 0) {
                await notificationService.sendToUser(
                    doctorId,
                    'schedule_conflict',
                    {
                        doctorName: `${doctor.first_name} ${doctor.last_name}`,
                        conflictingAppointments: conflictingAppointments
                    },
                    'email'
                );

                // Also send in-app notification for conflicts
                await notificationService.sendToUser(doctorId, 'schedule_conflict', {
                    doctorName: `${doctor.first_name} ${doctor.last_name}`,
                    conflictingAppointments: conflictingAppointments
                }, 'in_app');

                // Notify affected patients about potential schedule conflicts
                for (const conflict of conflictingAppointments) {
                    const appointment = await Appointment.findById(conflict.appointmentId).populate('patient_id');
                    if (appointment && appointment.patient_id) {
                        await notificationService.sendToUser(
                            appointment.patient_id._id,
                            'schedule_conflict',
                            {
                                patientName: `${appointment.patient_id.first_name} ${appointment.patient_id.last_name}`,
                                doctorName: `${doctor.first_name} ${doctor.last_name}`,
                                appointmentDate: new Date(appointment.appointment_date).toDateString(),
                                appointmentTime: new Date(appointment.appointment_date).toTimeString().slice(0, 5),
                                message: 'Your doctor has updated their schedule. Please contact the clinic to confirm your appointment.'
                            },
                            'email'
                        );
                    }
                }
            }

        } catch (notificationError) {
            console.error('Error sending schedule update notifications:', notificationError);
            // Don't fail the schedule update if notifications fail
        }

        // Include conflict information in response
        const responseData = {
            ...schedule.toObject(),
            conflictingAppointments: conflictingAppointments.length > 0 ? conflictingAppointments : undefined
        };

        return responseHandler.success(
            res, 
            responseData, 
            conflictingAppointments.length > 0 
                ? 'Schedule updated successfully, but some appointments may conflict with new schedule' 
                : 'Schedule updated successfully', 
            200
        );

    } catch (err) {
        console.error('Error updating doctor schedule:', err.message);
        return responseHandler.error(res, 'Server Error while updating schedule', 500, err);
    }
};

exports.getDoctorSchedule = async (req, res) => {
    try {
        const doctorId = req.user.id;
        const schedule = await DoctorSchedule.findOne({ doctor_id: doctorId });

        if (!schedule) {
            // Return empty schedule if not found
            return responseHandler.success(
                res, 
                { doctor_id: doctorId, available_slots: [] }, 
                'No schedule found, returning empty schedule', 
                200
            );
        }

        return responseHandler.success(res, schedule, 'Schedule fetched successfully', 200);

    } catch (err) {
        console.error('Error fetching doctor schedule:', err.message);
        return responseHandler.error(res, 'Server Error while fetching schedule', 500, err);
    }
};

// Get doctor schedule by doctor ID (for patients/admin)
exports.getDoctorScheduleById = async (req, res) => {
    try {
        const { doctor_id } = req.params;
        
        // Verify doctor exists
        const doctor = await User.findOne({ _id: doctor_id, role: 'Doctor', is_deleted: false });
        if (!doctor) {
            return responseHandler.error(res, 'Doctor not found', 404);
        }

        const schedule = await DoctorSchedule.findOne({ doctor_id });

        if (!schedule) {
            return responseHandler.success(
                res, 
                { doctor_id, available_slots: [] }, 
                'Doctor has no schedule set', 
                200
            );
        }

        return responseHandler.success(res, schedule, 'Doctor schedule fetched successfully', 200);

    } catch (err) {
        console.error('Error fetching doctor schedule by ID:', err.message);
        return responseHandler.error(res, 'Server Error while fetching doctor schedule', 500, err);
    }
};

// Clear doctor schedule
exports.clearDoctorSchedule = async (req, res) => {
    try {
        const doctorId = req.user.id;
        
        // Get doctor information
        const doctor = await User.findById(doctorId);
        if (!doctor) {
            return responseHandler.error(res, 'Doctor not found', 404);
        }

        // Check for upcoming appointments
        const upcomingAppointments = await Appointment.find({
            doctor_id: doctorId,
            appointment_date: { $gte: new Date() },
            status: { $in: ['pending', 'confirmed'] },
            is_deleted: false
        }).populate('patient_id', 'first_name last_name');

        // Update schedule to empty
        let schedule = await DoctorSchedule.findOneAndUpdate(
            { doctor_id: doctorId },
            { $set: { available_slots: [] } },
            { new: true, upsert: true }
        );

        // Send notifications
        try {
            // Notify doctor about schedule clearing
            await notificationService.sendToUser(
                doctorId,
                'doctor_schedule_updated',
                {
                    doctorName: `${doctor.first_name} ${doctor.last_name}`,
                    availableSlots: []
                },
                'email'
            );

            // If there were upcoming appointments, notify about conflicts
            if (upcomingAppointments.length > 0) {
                const conflictingAppointments = upcomingAppointments.map(appointment => ({
                    patientName: `${appointment.patient_id.first_name} ${appointment.patient_id.last_name}`,
                    date: new Date(appointment.appointment_date).toDateString(),
                    time: new Date(appointment.appointment_date).toTimeString().slice(0, 5)
                }));

                await notificationService.sendToUser(
                    doctorId,
                    'schedule_conflict',
                    {
                        doctorName: `${doctor.first_name} ${doctor.last_name}`,
                        conflictingAppointments: conflictingAppointments
                    },
                    'email'
                );

                // Notify affected patients
                for (const appointment of upcomingAppointments) {
                    await notificationService.sendToUser(
                        appointment.patient_id._id,
                        'schedule_conflict',
                        {
                            patientName: `${appointment.patient_id.first_name} ${appointment.patient_id.last_name}`,
                            doctorName: `${doctor.first_name} ${doctor.last_name}`,
                            appointmentDate: new Date(appointment.appointment_date).toDateString(),
                            appointmentTime: new Date(appointment.appointment_date).toTimeString().slice(0, 5),
                            message: 'Your doctor has cleared their schedule. Please contact the clinic regarding your appointment.'
                        },
                        'email'
                    );
                }
            }

        } catch (notificationError) {
            console.error('Error sending schedule clear notifications:', notificationError);
        }

        return responseHandler.success(
            res, 
            schedule, 
            upcomingAppointments.length > 0 
                ? 'Schedule cleared successfully, affected patients have been notified'
                : 'Schedule cleared successfully', 
            200
        );

    } catch (err) {
        console.error('Error clearing doctor schedule:', err.message);
        return responseHandler.error(res, 'Server Error while clearing schedule', 500, err);
    }
};