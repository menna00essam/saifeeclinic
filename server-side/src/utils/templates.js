const notificationTemplates = {
  // Patient notifications
  appointment_booked: {
    title: (data) => `Appointment Booked Successfully`,
    message: (data) => `
      <h2>Appointment Confirmation</h2>
      <p>Dear ${data.patientName},</p>
      <p>Your appointment has been booked successfully with Dr. ${data.doctorName}.</p>
      <p><strong>Details:</strong></p>
      <ul>
        <li>Date: ${data.appointmentDate}</li>
        <li>Time: ${data.appointmentTime}</li>
        <li>Specialty: ${data.specialty}</li>
        <li>Fee: ${data.fee} EGP</li>
      </ul>
      <p>Please arrive 15 minutes before your appointment time.</p>
    `,
    priority: 'high'
  },

  appointment_confirmed: {
    title: (data) => `Appointment Confirmed`,
    message: (data) => `
      <h2>Appointment Confirmed</h2>
      <p>Dear ${data.patientName},</p>
      <p>Your appointment with Dr. ${data.doctorName} has been confirmed.</p>
      <p>Date: ${data.appointmentDate} at ${data.appointmentTime}</p>
    `,
    priority: 'medium'
  },

  appointment_cancelled: {
    title: (data) => `Appointment Cancelled`,
    message: (data) => `
      <h2>Appointment Cancelled</h2>
      <p>Dear ${data.patientName},</p>
      <p>Your appointment with Dr. ${data.doctorName} scheduled for ${data.appointmentDate} has been cancelled.</p>
      <p><strong>Reason:</strong> ${data.reason}</p>
      ${data.refundInfo ? `<p>Refund information: ${data.refundInfo}</p>` : ''}
    `,
    priority: 'high'
  },

  appointment_reminder: {
    title: (data) => `Appointment Reminder`,
    message: (data) => `
      <h2>Appointment Reminder</h2>
      <p>Dear ${data.patientName},</p>
      <p>This is a reminder for your upcoming appointment:</p>
      <p><strong>Doctor:</strong> Dr. ${data.doctorName}</p>
      <p><strong>Date:</strong> ${data.appointmentDate}</p>
      <p><strong>Time:</strong> ${data.appointmentTime}</p>
      <p>Please arrive 15 minutes early.</p>
    `,
    priority: 'medium'
  },

  prescription_ready: {
    title: (data) => `Prescription Ready`,
    message: (data) => `
      <h2>Prescription Ready</h2>
      <p>Dear ${data.patientName},</p>
      <p>Your prescription from Dr. ${data.doctorName} is ready.</p>
      <p>You can view it in your patient portal or visit the clinic to collect it.</p>
    `,
    priority: 'medium'
  },

  schedule_updated: {
    title: (data) => `Schedule Updated`,
    message: (data) => `
      <h2>Schedule Update</h2>
      <p>Dear ${data.patientName || data.doctorName},</p>
      <p>An appointment schedule has been updated:</p>
      ${data.oldDate ? `<p><strong>Previous Date:</strong> ${data.oldDate} at ${data.oldTime}</p>` : ''}
      <p><strong>New Date:</strong> ${data.newDate} at ${data.newTime}</p>
      ${data.patientName && data.doctorName ? `<p><strong>Patient:</strong> ${data.patientName}</p><p><strong>Doctor:</strong> Dr. ${data.doctorName}</p>` : ''}
    `,
    priority: 'high'
  },

  // Doctor notifications
  new_appointment: {
    title: (data) => `New Appointment Booked`,
    message: (data) => `
      <h2>New Appointment</h2>
      <p>Dear Dr. ${data.doctorName},</p>
      <p>A new appointment has been booked with you:</p>
      <p><strong>Patient:</strong> ${data.patientName}</p>
      <p><strong>Date:</strong> ${data.appointmentDate}</p>
      <p><strong>Time:</strong> ${data.appointmentTime}</p>
      <p>Please review and confirm the appointment.</p>
    `,
    priority: 'high'
  },

  doctor_schedule_updated: {
    title: (data) => `Schedule Updated Successfully`,
    message: (data) => `
      <h2>Schedule Update Confirmation</h2>
      <p>Dear Dr. ${data.doctorName},</p>
      <p>Your schedule has been updated successfully.</p>
      <p><strong>Available Slots:</strong></p>
      <ul>
        ${data.availableSlots.map(slot => 
          `<li>${slot.weekday}: ${slot.start_time} - ${slot.end_time}</li>`
        ).join('')}
      </ul>
      <p>Your new schedule is now active and patients can book appointments accordingly.</p>
    `,
    priority: 'medium'
  },

  patient_rating: {
    title: (data) => `New Patient Rating`,
    message: (data) => `
      <h2>New Rating Received</h2>
      <p>Dear Dr. ${data.doctorName},</p>
      <p>You received a new rating from ${data.patientName}:</p>
      <p><strong>Rating:</strong> ${data.rating}/5 stars</p>
      ${data.review ? `<p><strong>Review:</strong> ${data.review}</p>` : ''}
    `,
    priority: 'low'
  },

  schedule_conflict: {
    title: (data) => `Schedule Conflict Warning`,
    message: (data) => `
      <h2>Schedule Conflict Alert</h2>
      <p>Dear Dr. ${data.doctorName},</p>
      <p>There is a potential conflict with your schedule update:</p>
      <p><strong>Existing Appointments:</strong></p>
      <ul>
        ${data.conflictingAppointments.map(appointment => 
          `<li>${appointment.patientName} - ${appointment.date} at ${appointment.time}</li>`
        ).join('')}
      </ul>
      <p>Please review these appointments and contact affected patients if necessary.</p>
    `,
    priority: 'high'
  },

  // Admin notifications
  user_registered: {
    title: (data) => `New User Registration`,
    message: (data) => `
      <h2>New User Registration</h2>
      <p>A new ${data.role} has registered:</p>
      <p><strong>Name:</strong> ${data.name}</p>
      <p><strong>Email:</strong> ${data.email}</p>
      <p><strong>Registration Date:</strong> ${data.registrationDate}</p>
    `,
    priority: 'medium'
  },

  system_maintenance: {
    title: (data) => `System Maintenance Notice`,
    message: (data) => `
      <h2>System Maintenance</h2>
      <p>Dear User,</p>
      <p>The system will undergo maintenance:</p>
      <p><strong>Start:</strong> ${data.startTime}</p>
      <p><strong>End:</strong> ${data.endTime}</p>
      <p>The system may be unavailable during this time.</p>
    `,
    priority: 'medium'
  },

  doctor_profile_approved: {
    title: (data) => `Doctor Profile Approved`,
    message: (data) => `
      <h2>Profile Approved</h2>
      <p>Dear Dr. ${data.doctorName},</p>
      <p>Your doctor profile has been approved by the administration.</p>
      <p>You can now start accepting appointments and managing your schedule.</p>
      <p><strong>Specialization:</strong> ${data.specialization}</p>
    `,
    priority: 'high'
  },

  doctor_profile_rejected: {
    title: (data) => `Doctor Profile Requires Review`,
    message: (data) => `
      <h2>Profile Review Required</h2>
      <p>Dear Dr. ${data.doctorName},</p>
      <p>Your doctor profile requires additional information or verification.</p>
      <p><strong>Reason:</strong> ${data.reason}</p>
      <p>Please update your profile and resubmit for approval.</p>
    `,
    priority: 'high'
  },

  // General notifications  
  password_reset: {
    title: (data) => `Password Reset Request`,
    message: (data) => `
      <h2>Password Reset</h2>
      <p>Dear ${data.name},</p>
      <p>You requested a password reset. Click the link below to reset your password:</p>
      <p><a href="${data.resetLink}">Reset Password</a></p>
      <p>This link expires in 24 hours.</p>
    `,
    priority: 'high'
  },

  payment_received: {
    title: (data) => `Payment Received`,
    message: (data) => `
      <h2>Payment Confirmation</h2>
      <p>Dear ${data.patientName},</p>
      <p>Your payment has been received successfully:</p>
      <p><strong>Amount:</strong> ${data.amount} EGP</p>
      <p><strong>Payment Method:</strong> ${data.paymentMethod}</p>
      <p><strong>Transaction ID:</strong> ${data.transactionId}</p>
    `,
    priority: 'medium'
  },

  payment_failed: {
    title: (data) => `Payment Failed`,
    message: (data) => `
      <h2>Payment Failed</h2>
      <p>Dear ${data.patientName},</p>
      <p>Your payment could not be processed:</p>
      <p><strong>Amount:</strong> ${data.amount} EGP</p>
      <p><strong>Reason:</strong> ${data.reason}</p>
      <p>Please try again or contact support for assistance.</p>
    `,
    priority: 'high'
  },

  account_verification: {
    title: (data) => `Verify Your Account`,
    message: (data) => `
      <h2>Account Verification</h2>
      <p>Dear ${data.name},</p>
      <p>Please verify your account by clicking the link below:</p>
      <p><a href="${data.verificationLink}">Verify Account</a></p>
      <p>This link expires in 24 hours.</p>
    `,
    priority: 'high'
  },

  welcome_message: {
    title: (data) => `Welcome to Our Platform`,
    message: (data) => `
      <h2>Welcome!</h2>
      <p>Dear ${data.name},</p>
      <p>Welcome to our healthcare platform. We're excited to have you join us!</p>
      <p>As a ${data.role}, you now have access to:</p>
      <ul>
        ${data.features.map(feature => `<li>${feature}</li>`).join('')}
      </ul>
      <p>If you have any questions, please don't hesitate to contact our support team.</p>
    `,
    priority: 'medium'
  },

  profile_updated: {
    title: (data) => `Profile Updated Successfully`,
    message: (data) => `
      <h2>Profile Update Confirmation</h2>
      <p>Dear ${data.name},</p>
      <p>Your profile has been updated successfully.</p>
      <p><strong>Updated on:</strong> ${data.updateDate}</p>
      <p>If you didn't make these changes, please contact support immediately.</p>
    `,
    priority: 'low'
  },

  security_alert: {
    title: (data) => `Security Alert`,
    message: (data) => `
      <h2>Security Alert</h2>
      <p>Dear ${data.name},</p>
      <p>We detected unusual activity on your account:</p>
      <p><strong>Activity:</strong> ${data.activity}</p>
      <p><strong>Time:</strong> ${data.time}</p>
      <p><strong>Location:</strong> ${data.location}</p>
      <p>If this wasn't you, please change your password immediately.</p>
    `,
    priority: 'high'
  }
};

module.exports = { notificationTemplates };