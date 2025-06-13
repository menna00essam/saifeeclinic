const cron = require('node-cron');
const notificationService = require('../services/notificationService');
const Appointment = require('../models/Appointment');
const User = require('../models/User');

class EmailJobs {
  
  // Send appointment reminders 24 hours before
  static startAppointmentReminderJob() {
    // Run every hour to check for appointments that need reminders
    cron.schedule('0 * * * *', async () => {
      try {
        console.log('Running appointment reminder job...');
        
        // Get tomorrow's date
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        
        const dayAfterTomorrow = new Date(tomorrow);
        dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

        // Find appointments for tomorrow that haven't been reminded
        const appointments = await Appointment.find({
          appointment_date: {
            $gte: tomorrow,
            $lt: dayAfterTomorrow
          },
          status: { $in: ['confirmed', 'pending'] },
          reminder_sent: { $ne: true }
        }).populate('patient_id doctor_id');

        console.log(`Found ${appointments.length} appointments needing reminders`);

        for (const appointment of appointments) {
          try {
            const doctor = await User.findById(appointment.doctor_id);
            const doctorName = `${doctor.first_name} ${doctor.last_name}`;

            const reminderData = {
              patientId: appointment.patient_id._id,
              doctorName: doctorName,
              appointmentDate: appointment.appointment_date.toLocaleDateString('ar-EG'),
              appointmentTime: appointment.appointment_time || 'غير محدد',
              location: appointment.location || 'العيادة',
              appointmentId: appointment._id
            };

            await notificationService.sendAppointmentReminder(reminderData);
            
            // Mark reminder as sent
            await Appointment.findByIdAndUpdate(appointment._id, { reminder_sent: true });
            
            console.log(`Reminder sent for appointment ${appointment._id}`);
          } catch (error) {
            console.error(`Error sending reminder for appointment ${appointment._id}:`, error);
          }
        }
        
        console.log('Appointment reminder job completed');
      } catch (error) {
        console.error('Error in appointment reminder job:', error);
      }
    });

    console.log('Appointment reminder job scheduled');
  }

  // Send daily schedule to doctors every morning at 7 AM
  static startDoctorDailyScheduleJob() {
    cron.schedule('0 7 * * *', async () => {
      try {
        console.log('Running doctor daily schedule job...');
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Get all doctors who have appointments today
        const appointments = await Appointment.find({
          appointment_date: {
            $gte: today,
            $lt: tomorrow
          },
          status: { $in: ['confirmed', 'pending'] }
        }).populate('doctor_id');

        // Group appointments by doctor
        const doctorAppointments = {};
        appointments.forEach(appointment => {
          const doctorId = appointment.doctor_id._id.toString();
          if (!doctorAppointments[doctorId]) {
            doctorAppointments[doctorId] = {
              doctor: appointment.doctor_id,
              appointments: []
            };
          }
          doctorAppointments[doctorId].appointments.push(appointment);
        });

        // Send schedule to each doctor
        for (const doctorId in doctorAppointments) {
          try {
            await notificationService.sendDoctorDailySchedule(
              doctorId, 
              today.toLocaleDateString('ar-EG')
            );
            console.log(`Daily schedule sent to doctor ${doctorId}`);
          } catch (error) {
            console.error(`Error sending schedule to doctor ${doctorId}:`, error);
          }
        }
        
        console.log('Doctor daily schedule job completed');
      } catch (error) {
        console.error('Error in doctor daily schedule job:', error);
      }
    });

    console.log('Doctor daily schedule job scheduled');
  }

  // Clean up old notifications (older than 30 days)
  static startNotificationCleanupJob() {
    // Run every day at 2 AM
    cron.schedule('0 2 * * *', async () => {
      try {
        console.log('Running notification cleanup job...');
        
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const Notification = require('../models/Notification');
        
        // Permanently delete notifications older than 30 days that are already soft deleted
        const result = await Notification.deleteMany({
          is_deleted: true,
          createdAt: { $lt: thirtyDaysAgo }
        });

        console.log(`Cleaned up ${result.deletedCount} old notifications`);
        
      } catch (error) {
        console.error('Error in notification cleanup job:', error);
      }
    });

    console.log('Notification cleanup job scheduled');
  }

  // Send weekly summary to admin
  static startWeeklySummaryJob() {
    // Run every Sunday at 9 AM
    cron.schedule('0 9 * * 0', async () => {
      try {
        console.log('Running weekly summary job...');
        
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

        // Get weekly statistics
        const weeklyAppointments = await Appointment.countDocuments({
          createdAt: { $gte: oneWeekAgo },
          status: { $in: ['confirmed', 'done'] }
        });

        const weeklyNewPatients = await User.countDocuments({
          role: 'Patient',
          createdAt: { $gte: oneWeekAgo }
        });

        // Get all admins
        const admins = await User.find({ role: 'Admin' });

        // Send summary to each admin
        for (const admin of admins) {
          try {
            await notificationService.createInAppNotification(
              admin._id,
              'التقرير الأسبوعي',
              `إحصائيات الأسبوع الماضي: ${weeklyAppointments} موعد، ${weeklyNewPatients} مريض جديد`,
              { category: 'general' }
            );
          } catch (error) {
            console.error(`Error sending weekly summary to admin ${admin._id}:`, error);
          }
        }
        
        console.log('Weekly summary job completed');
      } catch (error) {
        console.error('Error in weekly summary job:', error);
      }
    });

    console.log('Weekly summary job scheduled');
  }

  // Start all jobs
  static startAllJobs() {
    this.startAppointmentReminderJob();
    this.startDoctorDailyScheduleJob();
    this.startNotificationCleanupJob();
    this.startWeeklySummaryJob();
    console.log('All notification jobs started successfully');
  }
}

module.exports = EmailJobs;