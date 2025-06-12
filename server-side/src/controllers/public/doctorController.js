const User = require('../../models/User');
const DoctorSchedule = require('../../models/DoctorSchedule');
const Blog = require('../../models/Blog');
const { responseHandler } = require('../../utils/responseHandler');

/**
 * Get all doctors with their basic information
 */
const getAllDoctors = async (req, res) => {
  try {
    const { page = 1, limit = 10, specialization, search } = req.query;
    
    const filter = {
      role: 'Doctor',
      is_deleted: false,
      'doctor_profile.is_available': true
    };

    if (specialization) {
      filter['doctor_profile.specialization'] = { $regex: specialization, $options: 'i' };
    }

    if (search) {
      filter.$or = [
        { first_name: { $regex: search, $options: 'i' } },
        { last_name: { $regex: search, $options: 'i' } },
        { 'doctor_profile.specialization': { $regex: search, $options: 'i' } }
      ];
    }

    const doctors = await User.find(filter)
      .select('first_name last_name email phone doctor_profile')
      .populate('doctor_profile.schedule', 'day_of_week start_time end_time is_available')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(filter);

    return responseHandler.success(res, {
      doctors,
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(total / limit),
        total_doctors: total,
        per_page: parseInt(limit)
      }
    }, 'Doctors retrieved successfully');

  } catch (error) {
    console.error('Get all doctors error:', error);
    return responseHandler.error(res, 'Failed to retrieve doctors', 500);
  }
};

/**
 * Get doctor details by ID
 */
const getDoctorById = async (req, res) => {
  try {
    const { id } = req.params;

    const doctor = await User.findOne({
      _id: id,
      role: 'Doctor',
      is_deleted: false,
      'doctor_profile.is_available': true
    })
    .select('first_name last_name email phone doctor_profile createdAt')
    .populate('doctor_profile.schedule', 'day_of_week start_time end_time location is_available')
    .populate({
      path: 'doctor_profile.blogs',
      match: { is_published: true, is_deleted: false },
      select: 'title content tags image_url published_at',
      options: { limit: 5, sort: { published_at: -1 } }
    });

    if (!doctor) {
      return responseHandler.error(res, 'Doctor not found', 404);
    }

    const availableSchedule = await getAvailableSchedule(id);

    const doctorData = {
      ...doctor.toObject(),
      available_schedule: availableSchedule
    };

    return responseHandler.success(res, doctorData, 'Doctor details retrieved successfully');

  } catch (error) {
    console.error('Get doctor by ID error:', error);
    return responseHandler.error(res, 'Failed to retrieve doctor details', 500);
  }
};

/**
 * Get doctor's available schedule for booking
 */
const getDoctorSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    const { date, days = 7 } = req.query;

    const doctor = await User.findOne({
      _id: id,
      role: 'Doctor',
      is_deleted: false,
      'doctor_profile.is_available': true
    });

    if (!doctor) {
      return responseHandler.error(res, 'Doctor not found', 404);
    }

    const schedule = await getAvailableSchedule(id, date, parseInt(days));

    return responseHandler.success(res, { schedule }, 'Doctor schedule retrieved successfully');

  } catch (error) {
    console.error('Get doctor schedule error:', error);
    return responseHandler.error(res, 'Failed to retrieve doctor schedule', 500);
  }
};

/**
 * Get specializations list
 */
const getSpecializations = async (req, res) => {
  try {
    const specializations = await User.distinct('doctor_profile.specialization', {
      role: 'Doctor',
      is_deleted: false,
      'doctor_profile.is_available': true
    });

    const specializationsWithCount = await Promise.all(
      specializations.map(async (spec) => {
        const count = await User.countDocuments({
          role: 'Doctor',
          is_deleted: false,
          'doctor_profile.is_available': true,
          'doctor_profile.specialization': spec
        });
        return { name: spec, count };
      })
    );

    return responseHandler.success(res, specializationsWithCount, 'Specializations retrieved successfully');

  } catch (error) {
    console.error('Get specializations error:', error);
    return responseHandler.error(res, 'Failed to retrieve specializations', 500);
  }
};


// Helper function to get available schedule

const getAvailableSchedule = async (doctorId, startDate = null, days = 7) => {
  try {
    const Appointment = require('../../models/Appointment');
    
    const doctorSchedule = await DoctorSchedule.find({
      doctor_id: doctorId,
      is_available: true
    });

    if (!doctorSchedule.length) {
      return [];
    }

    const start = startDate ? new Date(startDate) : new Date();
    const availableSlots = [];

    for (let i = 0; i < days; i++) {
      const currentDate = new Date(start);
      currentDate.setDate(start.getDate() + i);
      
      const dayOfWeek = currentDate.toLocaleDateString('en-US', { weekday: 'long' });
      
      const daySchedule = doctorSchedule.find(schedule => 
        schedule.day_of_week.toLowerCase() === dayOfWeek.toLowerCase()
      );

      if (daySchedule) {
        const existingAppointments = await Appointment.find({
          doctor_id: doctorId,
          appointment_date: {
            $gte: new Date(currentDate.setHours(0, 0, 0, 0)),
            $lt: new Date(currentDate.setHours(23, 59, 59, 999))
          },
          status: { $in: ['pending', 'confirmed'] }
        });

        const timeSlots = generateTimeSlots(
          daySchedule.start_time,
          daySchedule.end_time,
          30,
          existingAppointments
        );

        if (timeSlots.length > 0) {
          availableSlots.push({
            date: currentDate.toISOString().split('T')[0],
            day: dayOfWeek,
            location: daySchedule.location,
            available_times: timeSlots
          });
        }
      }
    }

    return availableSlots;

  } catch (error) {
    console.error('Get available schedule error:', error);
    return [];
  }
};

// Helper function to generate time slots

const generateTimeSlots = (startTime, endTime, intervalMinutes, existingAppointments) => {
  const slots = [];
  const start = new Date(`2000-01-01T${startTime}`);
  const end = new Date(`2000-01-01T${endTime}`);
  
  while (start < end) {
    const timeSlot = start.toTimeString().slice(0, 5);
    
    const isBooked = existingAppointments.some(appointment => {
      const appointmentTime = new Date(appointment.appointment_date).toTimeString().slice(0, 5);
      return appointmentTime === timeSlot;
    });

    if (!isBooked) {
      slots.push({
        time: timeSlot,
        is_available: true
      });
    }

    start.setMinutes(start.getMinutes() + intervalMinutes);
  }

  return slots;
};

module.exports = {
  getAllDoctors,
  getDoctorById,
  getDoctorSchedule,
  getSpecializations
};