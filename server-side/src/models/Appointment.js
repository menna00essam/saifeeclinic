const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  patient_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  doctor_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', 
    required: true
  },
  appointment_date: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['booked', 'cancelled', 'completed'],
    default: 'booked'
  },
  payment_status: {
    type: String,
    enum: ['paid', 'unpaid'],
    default: 'unpaid'
  },
  
  patient_info: {
    name: String,
    phone: String,
    email: String
  },
  doctor_info: {
    name: String,
    specialty: String,
    phone: String
  },
  
  is_deleted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});
const Appointment = mongoose.model('Appointment', appointmentSchema);


module.exports = Appointment;