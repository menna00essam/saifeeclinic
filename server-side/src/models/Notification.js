const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['email', 'sms', 'push', 'in_app'],
    required: true
  },
  category: {
    type: String,
    enum: [
      'appointment_booked',
      'appointment_confirmed', 
      'appointment_cancelled',
      'appointment_reminder',
      'prescription_ready',
      'payment_received',
      'schedule_updated',
      'user_registered',
      'password_reset',
      'system_maintenance',
      'doctor_rating',
      'blog_published'
    ],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  data: {
    type: mongoose.Schema.Types.Mixed, // Additional data for the notification
    default: {}
  },
  status: {
    type: String,
    enum: ['pending', 'sent', 'failed', 'read'],
    default: 'pending'
  },
  scheduled_at: {
    type: Date,
    default: Date.now
  },
  sent_at: {
    type: Date
  },
  read_at: {
    type: Date
  },
  is_read: {
    type: Boolean,
    default: false
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  retry_count: {
    type: Number,
    default: 0
  },
  max_retries: {
    type: Number,
    default: 3
  }
}, {
  timestamps: true
});

// Indexes for better performance
notificationSchema.index({ user_id: 1, status: 1 });
notificationSchema.index({ scheduled_at: 1, status: 1 });
notificationSchema.index({ category: 1, created_at: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
