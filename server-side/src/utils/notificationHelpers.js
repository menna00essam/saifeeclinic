const notificationService = require('../services/notificationService');

class NotificationHelpers {

  // Helper for appointment-related notifications
  static async notifyAppointmentUpdate(appointmentId, action, additionalData = {}) {
    try {
      const Appointment = require('../models/Appointment');
      const appointment = await Appointment.findById(appointmentId)
        .populate('patient_id doctor_id');

      if (!appointment) return;

      const baseData = {
        patientName: `${appointment.patient_id.first_name} ${appointment.patient_id.last_name}`,
        doctorName: `${appointment.doctor_id.first_name} ${appointment.doctor_id.last_name}`,
        appointmentDate: appointment.appointment_date.toDateString(),
        appointmentTime: appointment.appointment_time,
        ...additionalData
      };

      switch (action) {
        case 'booked':
          await notificationService.sendToUser(appointment.patient_id._id, 'appointment_booked', baseData);
          await notificationService.sendToUser(appointment.doctor_id._id, 'new_appointment', baseData);
          break;
        
        case 'confirmed':
          await notificationService.sendToUser(appointment.patient_id._id, 'appointment_confirmed', baseData);
          break;
        
        case 'cancelled':
          await notificationService.sendToUser(appointment.patient_id._id, 'appointment_cancelled', baseData);
          break;
      }

    } catch (error) {
      console.error('Error in appointment notification helper:', error);
    }
  }

  // Helper for user-related notifications
  static async notifyUserAction(userId, action, additionalData = {}) {
    try {
      const User = require('../models/User');
      const user = await User.findById(userId);

      if (!user) return;

      const baseData = {
        name: `${user.first_name} ${user.last_name}`,
        email: user.email,
        role: user.role,
        ...additionalData
      };

      switch (action) {
        case 'registered':
          await notificationService.sendToRole('admin', 'user_registered', baseData);
          break;
        
        case 'password_reset':
          await notificationService.sendToUser(userId, 'password_reset', baseData);
          break;
      }

    } catch (error) {
      console.error('Error in user notification helper:', error);
    }
  }

  // Helper for system-wide notifications
  static async notifySystemMaintenance(startTime, endTime) {
    try {
      await notificationService.sendToRole('all', 'system_maintenance', {
        startTime: startTime.toString(),
        endTime: endTime.toString()
      });
    } catch (error) {
      console.error('Error in system maintenance notification:', error);
    }
  }

  // Bulk notification sender
  static async sendBulkNotifications(recipients, category, data, type = 'email') {
    try {
      const notifications = [];
      
      for (const recipient of recipients) {
        const notification = await notificationService.sendToUser(
          recipient.userId, 
          category, 
          { ...data, ...recipient.personalData }, 
          type
        );
        notifications.push(notification);
      }

      return notifications;
    } catch (error) {
      console.error('Error in bulk notification sending:', error);
      return [];
    }
  }

}

module.exports = NotificationHelpers;