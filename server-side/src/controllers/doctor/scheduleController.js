const DoctorSchedule = require('../../models/DoctorSchedule');
const { validationResult } = require('express-validator');


exports.updateDoctorSchedule = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { available_slots } = req.body;
    const doctorId = req.user.id; 

   
    if (available_slots && Array.isArray(available_slots)) {
        for (const slot of available_slots) {
            const { start_time, end_time } = slot;

            if (!start_time || !end_time) {
                return res.status(400).json({ msg: 'Start time and end time are required for each slot.' });
            }

       
            if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(start_time) || !/^([01]\d|2[0-3]):([0-5]\d)$/.test(end_time)) {
                return res.status(400).json({ msg: 'Time format for slots must be HH:MM.' });
            }

            // Convert times to compare (e.g., "09:00" -> 900, "17:30" -> 1730)
            const startMinutes = parseInt(start_time.split(':')[0]) * 60 + parseInt(start_time.split(':')[1]);
            const endMinutes = parseInt(end_time.split(':')[0]) * 60 + parseInt(end_time.split(':')[1]);

            if (startMinutes >= endMinutes) {
                return res.status(400).json({ msg: 'End time must be after start time for each slot.' });
            }
        }
    } else if (available_slots === undefined || available_slots === null) {
        // If available_slots is not provided, treat it as an empty array to clear schedule
        req.body.available_slots = [];
    } else {
        return res.status(400).json({ msg: 'Available slots must be an array.' });
    }

    try {
        let schedule = await DoctorSchedule.findOneAndUpdate(
            { doctor_id: doctorId },
            { $set: { available_slots: req.body.available_slots } }, // Use $set to completely replace the array
            { new: true, upsert: true, runValidators: true } // upsert: true will create if not found
        );

        res.json(schedule);

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};


exports.getDoctorSchedule = async (req, res) => {
    try {
        const doctorId = req.user.id;
        const schedule = await DoctorSchedule.findOne({ doctor_id: doctorId });

        if (!schedule) {
         
            return res.status(200).json({ doctor_id: doctorId, available_slots: [] });
        }

        res.json(schedule);

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};