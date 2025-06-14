const express = require('express');
const router = express.Router();
const protectMW = require('../middleware/protectMW');
const roleAuth = require('../middleware/roleAuth');
const profileController = require('../controllers/patient/profileController');
const appointmentController = require('../controllers/patient/appointmentController');

// Profile
// router.post('/', profileController.createUser);
router.get('/:id', protectMW, profileController.getPatientById);
router.patch('/:id', protectMW, profileController.updatePatientData);
router.delete("/:id", protectMW, profileController.deletePatient);

// Appointment
router.route('/appointments/:id')
    .post(protectMW, appointmentController.bookAppointment)
    .get(protectMW, appointmentController.getAllAppointments);

router.route('/appointments/:id/:appointment_id')
    .get(protectMW, appointmentController.getAppointmentById)
    .patch(protectMW, appointmentController.updateAppointment)
    .delete(protectMW, roleAuth('Doctor', 'Admin'), appointmentController.deleteAppointment);

router.patch('/appointments/:id/:appointment_id/cancel', protectMW, appointmentController.cancelAppointment);

module.exports = router;
