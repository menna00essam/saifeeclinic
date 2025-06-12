const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  appointment_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment',
    default: null
  },
  notification_type: {
    type: String,
    enum: ['appointment_reminder', 'system_alert'],
    required: true
  },
  message: {
    type: String,
    required: true
  },
  via_email: {
    type: Boolean,
    default: false
  },
  via_whatsapp: {
    type: Boolean,
    default: false
  },
  is_read: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});