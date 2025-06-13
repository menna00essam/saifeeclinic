const User = require('../../models/User');
const Blog = require('../../models/Blog');
const Appointment = require('../../models/Appointment');
const { responseHandler } = require('../../utils/responseHandler');

/**
 * Get clinic overview information
 */
const getClinicOverview = async (req, res) => {
  try {
    const totalDoctors = await User.countDocuments({
      role: 'Doctor',
      is_deleted: false,
      'doctor_profile.is_available': true
    });

    const totalPatients = await User.countDocuments({
      role: 'Patient',
      is_deleted: false
    });

    const totalAppointments = await Appointment.countDocuments({
      status: 'done'
    });

    const specializations = await User.distinct('doctor_profile.specialization', {
      role: 'Doctor',
      is_deleted: false,
      'doctor_profile.is_available': true
    });

    const recentBlogs = await Blog.find({
      is_published: true,
      is_deleted: false
    })
    .populate('author_id', 'first_name last_name doctor_profile.specialization')
    .select('title content tags image_url published_at')
    .sort({ published_at: -1 })
    .limit(3);

    const clinicInfo = {
      name: "Al Shifa Medical Center",
      description: "We provide the best medical services with a team of specialized doctors.",
      address: "123 Medical Street, Medical City",
      phone: "+20-123-456-7890",
      email: "info@clinic.com",
      working_hours: {
        weekdays: "8:00 AM - 8:00 PM",
        weekend: "9:00 AM - 5:00 PM"
      },
      services: [
        "General Check-up",
        "Radiology and Lab Tests",
        "Surgical Operations",
        "Emergency Care",
        "Regular Follow-ups"
      ]
    };

    const overview = {
      clinic_info: clinicInfo,
      statistics: {
        total_doctors: totalDoctors,
        total_patients: totalPatients,
        total_appointments: totalAppointments,
        total_specializations: specializations.length
      },
      specializations: specializations,
      recent_blogs: recentBlogs
    };

    return responseHandler.success(res, overview, 'Clinic overview retrieved successfully');
  } catch (error) {
    console.error('Get clinic overview error:', error);
    return responseHandler.error(res, 'Failed to retrieve clinic overview', 500);
  }
};

/**
 * Get clinic services
 */
const getClinicServices = async (req, res) => {
  try {
    const specializations = await User.aggregate([
      {
        $match: {
          role: 'Doctor',
          is_deleted: false,
          'doctor_profile.is_available': true
        }
      },
      {
        $group: {
          _id: '$doctor_profile.specialization',
          doctors: {
            $push: {
              id: '$_id',
              name: { $concat: ['$first_name', ' ', '$last_name'] },
              experience: '$doctor_profile.experience',
              consultation_fee: '$doctor_profile.consultation_fee'
            }
          },
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          specialization: '$_id',
          description: {
            $switch: {
              branches: [
                { case: { $eq: ['$_id', 'Pediatrics'] }, then: 'Comprehensive healthcare for children from birth to adolescence.' },
                { case: { $eq: ['$_id', 'Cardiology'] }, then: 'Diagnosis and treatment of heart and vascular diseases.' },
                { case: { $eq: ['$_id', 'Dentistry'] }, then: 'Complete oral and dental care.' },
                { case: { $eq: ['$_id', 'Ophthalmology'] }, then: 'Diagnosis and treatment of eye diseases and vision problems.' },
                { case: { $eq: ['$_id', 'General Medicine'] }, then: 'General check-ups and primary care services.' }
              ],
              default: 'High-quality specialized medical services.'
            }
          },
          doctors_count: '$count',
          available_doctors: '$doctors'
        }
      },
      {
        $sort: { doctors_count: -1 }
      }
    ]);

    const additionalServices = [
      {
        name: "Medical Laboratory",
        description: "Comprehensive and accurate testing with advanced equipment.",
        icon: "lab"
      },
      {
        name: "Diagnostic Radiology",
        description: "X-rays, ultrasound, and CT scans.",
        icon: "radiology"
      },
      {
        name: "Pharmacy",
        description: "Fully stocked pharmacy with all necessary medications.",
        icon: "pharmacy"
      },
      {
        name: "Emergency Care",
        description: "24/7 emergency services for urgent cases.",
        icon: "emergency"
      }
    ];

    return responseHandler.success(res, {
      medical_specializations: specializations,
      additional_services: additionalServices
    }, 'Clinic services retrieved successfully');

  } catch (error) {
    console.error('Get clinic services error:', error);
    return responseHandler.error(res, 'Failed to retrieve clinic services', 500);
  }
};

/**
 * Get clinic contact information
 */
const getContactInfo = async (req, res) => {
  try {
    const contactInfo = {
      address: {
        street: "123 Medical Street",
        city: "Medical City",
        governorate: "Cairo",
        postal_code: "11511",
        country: "Egypt"
      },
      phone: {
        main: "+20-123-456-7890",
        emergency: "+20-123-456-7891",
        appointments: "+20-123-456-7892"
      },
      email: {
        info: "info@clinic.com",
        appointments: "appointments@clinic.com",
        support: "support@clinic.com"
      },
      working_hours: {
        weekdays: {
          days: "Sunday - Thursday",
          hours: "8:00 AM - 8:00 PM"
        },
        weekend: {
          days: "Friday - Saturday",
          hours: "9:00 AM - 5:00 PM"
        }
      },
      social_media: {
        facebook: "https://facebook.com/clinic",
        twitter: "https://twitter.com/clinic",
        instagram: "https://instagram.com/clinic",
        linkedin: "https://linkedin.com/company/clinic"
      },
      location: {
        latitude: 30.0444,
        longitude: 31.2357,
        map_url: "https://maps.google.com/?q=30.0444,31.2357"
      }
    };

    return responseHandler.success(res, contactInfo, 'Contact information retrieved successfully');

  } catch (error) {
    console.error('Get contact info error:', error);
    return responseHandler.error(res, 'Failed to retrieve contact information', 500);
  }
};

/**
 * Get clinic statistics for public display
 */
const getPublicStats = async (req, res) => {
  try {
    const stats = await Promise.all([
      User.countDocuments({
        role: 'Doctor',
        is_deleted: false,
        'doctor_profile.is_available': true
      }),
      User.countDocuments({
        role: 'Patient',
        is_deleted: false
      }),
      Appointment.countDocuments({
        status: 'done'
      }),
      Promise.resolve(new Date().getFullYear() - 2020),
      User.distinct('doctor_profile.specialization', {
        role: 'Doctor',
        is_deleted: false,
        'doctor_profile.is_available': true
      }).then(specs => specs.length)
    ]);

    const publicStats = {
      doctors: stats[0],
      patients_served: stats[1],
      appointments_completed: stats[2],
      years_of_experience: stats[3],
      specializations: stats[4]
    };

    return responseHandler.success(res, publicStats, 'Public statistics retrieved successfully');

  } catch (error) {
    console.error('Get public stats error:', error);
    return responseHandler.error(res, 'Failed to retrieve statistics', 500);
  }
};

/**
 * Submit contact form
 */
const submitContactForm = async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;

    if (!name || !email || !subject || !message) {
      return responseHandler.error(res, 'Please fill in all required fields.', 400);
    }

    const contactSubmission = {
      name,
      email,
      phone,
      subject,
      message,
      submitted_at: new Date(),
      status: 'pending'
    };

    const emailService = require('../../services/emailService');
    await emailService.sendContactFormNotification(contactSubmission);

    return responseHandler.success(res, null, 'Your message has been sent successfully. We will contact you soon.');

  } catch (error) {
    console.error('Submit contact form error:', error);
    return responseHandler.error(res, 'Failed to send your message. Please try again.', 500);
  }
};

module.exports = {
  getClinicOverview,
  getClinicServices,
  getContactInfo,
  getPublicStats,
  submitContactForm
};
