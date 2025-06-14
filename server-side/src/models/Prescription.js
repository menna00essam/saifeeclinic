const mongoose = require('mongoose');
const prescriptionSchema = new mongoose.Schema({
  appointment_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment',
    required: true
  },
  doctor_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  patient_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  prescription_text: {
    type: String,
    required: true
  },

  appointment_snapshot: {
    appointment_date: Date,
    patient_name: String,
    doctor_name: String
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Prescription', prescriptionSchema);