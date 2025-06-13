const mongoose = require("mongoose");

const doctorScheduleSchema = new mongoose.Schema(
  {
    doctor_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    available_slots: [
      {
        weekday: {
          type: String,
          enum: [
            "Sunday",
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
          ],
          required: true,
        },
        start_time: {
          type: String,
          required: true,
        },
        end_time: {
          type: String,
          required: true,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);
module.exports = mongoose.model("DoctorSchedule", doctorScheduleSchema);
