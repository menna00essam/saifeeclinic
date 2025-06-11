const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  first_name: {
    type: String,
    required: true,
    trim: true
  },
  last_name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  role: {
    type: String,
    enum: ['Admin', 'Doctor', 'Patient'],
    required: true
  },
  doctor_profile: {
    specialization: { type: String },
    license_number: { type: String, unique: true },
    experience: { type: Number, min: 0 },
    qualifications: [{
      degree: String,
      institution: String,
      year: Number
    }],
    biography: { type: String },
    consultation_fee: { type: Number },
    is_available: { type: Boolean, default: true },
    schedule: [{ type: mongoose.Schema.Types.ObjectId, ref: 'DoctorSchedule' }],
    appointments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' }],
    blogs: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Blog' }]
  },
  patient_profile: {
    date_of_birth: { type: Date },
    gender: { type: String, enum: ['male', 'female', 'other'] },
    blood_type: { type: String },
    allergies: [String],
    chronic_diseases: [String],
    emergency_contact: {
      name: String,
      phone: String,
      relationship: String
    },
    appointments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' }],
    prescriptions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Prescription' }],
    notifications: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Notification' }]
  },
  is_deleted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('User', userSchema);

