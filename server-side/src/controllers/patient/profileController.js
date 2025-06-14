const User = require("../../models/User")
const Appointment = require('../../models/Appointment')
const Prescription = require('../../models/Prescription')
const bcrypt = require('bcryptjs');
const { responseHandler } = require("../../utils/responseHandler");
const DoctorSchedule = require("../../models/DoctorSchedule");

// Get Patient Data
const getPatientById = async (req, res, next) => {
    try {
        const patient = await User.findOne({ _id: req.params.id, role: 'Patient', is_deleted: false })
            .select('first_name last_name email phone patient_profile')
            .populate({
                path: 'patient_profile.appointments',
                match: { is_deleted: false },
                populate: {
                    path: 'doctor_id',
                    select: 'first_name last_name doctor_profile.specialization'
                }
            })
            .populate({
                path: 'patient_profile.prescriptions',
                match: { is_deleted: false }
            })

        if (!patient) {
            return responseHandler.error(res, 'Patient not found', 404);
        }

        if (req.user.role === 'Patient' && req.user.id !== req.params.id) {
            return responseHandler.error(res, 'You are not authorized to see another patient data', 403);
        }


        return responseHandler.success(res, patient, 'Patient data fetched successfully', 200)
    } catch (err) {
        return responseHandler.error(res, 'Faild to get patient data', 500, err)
    }
}

// Update Patient Data
const updatePatientData = async (req, res, next) => {
    try {
        const { oldPassword, newPassword, ...updateData } = req.body;

        if (req.user.id !== req.params.id) {
            return responseHandler.error(res, 'Forbidden: You are not allowed to edit the data of another patient', 403);
        }

        const patient = await User.findById(req.user.id);

        if (!patient) {
            return responseHandler.error(res, 'Patient not found', 404);
        }

        if (oldPassword && newPassword) {
            const isMatch = await bcrypt.compare(oldPassword, patient.password);

            if (!isMatch) {
                return responseHandler.error(res, 'Old password is incorrect', 400);
            }

            const hashNewPassword = await bcrypt.hash(newPassword, 10);
            updateData.password = hashNewPassword;
        }

        Object.keys(updateData).forEach((key) => {
            if (updateData[key] === undefined) delete updateData[key];
        });

        if (Object.keys(updateData).length === 0) {
            return responseHandler.error(res, 'No data provided to update', 400);
        }

        await patient.save();

        return responseHandler.success(res, patient, 'Patient data updated successfully', 200)

    } catch (err) {
        return responseHandler.error(res, 'Faild to update patient data', 500, err);
    }
}

// Delete Patient
const deletePatient = async (req, res, next) => {
    try {
        const patient = await User.findById(req.user.id);

        if (!patient || patient.role !== 'Patient') {
            return responseHandler.error(res, 'Patient not found', 404);
        }

        if (req.user.role !== 'Admin' && req.user.id !== req.params.id) {
            return responseHandler.error(res, 'Unauthorized: You cannot delete this account', 403);
        }

        patient.is_deleted = true;
        await patient.save();

        return responseHandler.success(res, null, 'Patient deleted successfully', 200);
    } catch (err) {
        return responseHandler.error(res, 'Faild to delete patient', 500, err);
    }
}

module.exports = { getPatientById, updatePatientData, deletePatient }