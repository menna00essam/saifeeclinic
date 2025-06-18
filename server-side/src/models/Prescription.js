const mongoose = require("mongoose");

const medicationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  dosage: {
    type: String,
    required: true,
    trim: true
  },
  frequency: {
    type: String,
    required: true,
    trim: true
  },
  duration: {
    type: String,
    trim: true
  },
  instructions: {
    type: String,
    trim: true
  }
});

const prescriptionSchema = new mongoose.Schema(
  {
    appointment_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment",
      required: true,
    },
    doctor_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    patient_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    
    // Enhanced prescription fields
    diagnosis: {
      type: String,
      required: true,
      trim: true
    },
    
    medications: {
      type: [medicationSchema],
      required: true,
      validate: {
        validator: function(medications) {
          return medications && medications.length > 0;
        },
        message: 'At least one medication is required'
      }
    },
    
    notes: {
      type: String,
      trim: true
    },
    
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'urgent'],
      default: 'normal'
    },
    
    status: {
      type: String,
      enum: ['active', 'completed', 'cancelled'],
      default: 'active'
    },
    
    follow_up_date: {
      type: Date
    },
    
    // Keep the old field for backward compatibility
    prescription_text: {
      type: String,
      trim: true
    },

    appointment_snapshot: {
      appointment_date: Date,
      patient_name: String,
      doctor_name: String,
    },
  },
  {
    timestamps: true,
  }
);

// Index for better query performance
prescriptionSchema.index({ doctor_id: 1, createdAt: -1 });
prescriptionSchema.index({ patient_id: 1, createdAt: -1 });
prescriptionSchema.index({ status: 1 });

module.exports = mongoose.model("Prescription", prescriptionSchema);