const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
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
  phone: {
    type: String,
    required: true
  },
  
  doctor_profile: {
    biography: {
      type: String,
      default: ''
    },
    specialty: {
      type: String,
      required: function() { return this.role === 'Doctor'; }
    },
    profile_image: {
      type: String,
      default: ''
    }
  },
  
  patient_profile: {
    date_of_birth: {
      type: Date,
      required: function() { return this.role === 'Patient'; }
    },
    medical_history: {
      type: String,
      default: ''
    }
  },
  
  is_deleted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true 
});
