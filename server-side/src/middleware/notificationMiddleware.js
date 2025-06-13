const notificationService = require('../services/notificationService');

// Middleware to automatically send notifications based on actions
const notificationMiddleware = {

  // Send notification after appointment booking
  afterAppointmentBooked: async (req, res, next) => {
    try {
      if (res.locals.appointmentData) {
        const { appointment, patient, doctor } = res.locals.appointmentData;
        
        // Notify patient
        await notificationService.sendToUser(
          patient._id,
          'appointment_booked',
          {
            patientName: `${patient.first_name} ${patient.last_name}`,
            doctorName: `${doctor.first_name} ${doctor.last_name}`,
            appointmentDate: appointment.appointment_date.toDateString(),
            appointmentTime: appointment.appointment_time,
            specialty: doctor.specialty,
            fee: appointment.amount
          }
        );

        // Notify doctor
        await notificationService.sendToUser(
          doctor._id,
          'new_appointment',
          {
            patientName: `${patient.first_name} ${patient.last_name}`,
            doctorName: `${doctor.first_name} ${doctor.last_name}`,
            appointmentDate: appointment.appointment_date.toDateString(),
            appointmentTime: appointment.appointment_time
          }
        );
      }
      next();
    } catch (error) {
      console.error('Error in appointment booked notification:', error);
      next(); // Continue even if notification fails
    }
  },

  // Send notification after appointment confirmation
  afterAppointmentConfirmed: async (req, res, next) => {
    try {
      if (res.locals.appointmentData) {
        const { appointment, patient, doctor } = res.locals.appointmentData;
        
        await notificationService.sendToUser(
          patient._id,
          'appointment_confirmed',
          {
            patientName: `${patient.first_name} ${patient.last_name}`,
            doctorName: `${doctor.first_name} ${doctor.last_name}`,
            appointmentDate: appointment.appointment_date.toDateString(),
            appointmentTime: appointment.appointment_time
          }
        );
      }
      next();
    } catch (error) {
      console.error('Error in appointment confirmed notification:', error);
      next();
    }
  },

  // Send notification after appointment cancellation
  afterAppointmentCancelled: async (req, res, next) => {
    try {
      if (res.locals.appointmentData) {
        const { appointment, patient, doctor, reason, refundInfo } = res.locals.appointmentData;
        
        await notificationService.sendToUser(
          patient._id,
          'appointment_cancelled',
          {
            patientName: `${patient.first_name} ${patient.last_name}`,
            doctorName: `${doctor.first_name} ${doctor.last_name}`,
            appointmentDate: appointment.appointment_date.toDateString(),
            reason: reason || 'No reason provided',
            refundInfo
          }
        );
      }
      next();
    } catch (error) {
      console.error('Error in appointment cancelled notification:', error);
      next();
    }
  },

  // Send notification after prescription creation
  afterPrescriptionCreated: async (req, res, next) => {
    try {
      if (res.locals.prescriptionData) {
        const { prescription, patient, doctor } = res.locals.prescriptionData;
        
        await notificationService.sendToUser(
          patient._id,
          'prescription_ready',
          {
            patientName: `${patient.first_name} ${patient.last_name}`,
            doctorName: `${doctor.first_name} ${doctor.last_name}`
          }
        );
      }
      next();
    } catch (error) {
      console.error('Error in prescription created notification:', error);
      next();
    }
  },

  // Send notification after payment
  afterPaymentReceived: async (req, res, next) => {
    try {
      if (res.locals.paymentData) {
        const { payment, patient } = res.locals.paymentData;
        
        await notificationService.sendToUser(
          patient._id,
          'payment_received',
          {
            patientName: `${patient.first_name} ${patient.last_name}`,
            amount: payment.amount,
            paymentMethod: payment.payment_method,
            transactionId: payment.transaction_id
          }
        );
      }
      next();
    } catch (error) {
      console.error('Error in payment received notification:', error);
      next();
    }
  },

  // Send notification after user registration
  afterUserRegistered: async (req, res, next) => {
    try {
      if (res.locals.userData) {
        const { user } = res.locals.userData;
        
        // Notify admin about new user
        await notificationService.sendToRole(
          'admin',
          'user_registered',
          {
            name: `${user.first_name} ${user.last_name}`,
            email: user.email,
            role: user.role,
            registrationDate: user.created_at.toDateString()
          }
        );
      }
      next();
    } catch (error) {
      console.error('Error in user registered notification:', error);
      next();
    }
  },

  // Send notification after doctor rating
  afterDoctorRated: async (req, res, next) => {
    try {
      if (res.locals.ratingData) {
        const { rating, doctor, patient } = res.locals.ratingData;
        
        await notificationService.sendToUser(
          doctor._id,
          'patient_rating',
          {
            doctorName: `${doctor.first_name} ${doctor.last_name}`,
            patientName: `${patient.first_name} ${patient.last_name}`,
            rating: rating.rating,
            review: rating.review
          }
        );
      }
      next();
    } catch (error) {
      console.error('Error in doctor rated notification:', error);
      next();
    }
  }

};

module.exports = notificationMiddleware;