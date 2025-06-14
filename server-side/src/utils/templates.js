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

  schedule_updated: {
    title: (data) => `Schedule Updated`,
    message: (data) => `
      <h2>Schedule Update</h2>
      <p>Dear Dr. ${data.doctorName},</p>
      <p>Your schedule has been updated successfully.</p>
      <p>New changes are now active.</p>
    `,
    priority: 'low'
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
  }
};

module.exports = { notificationTemplates };
