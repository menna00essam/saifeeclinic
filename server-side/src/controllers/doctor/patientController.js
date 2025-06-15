const User = require("../../models/User");
const Appointment = require("../../models/Appointment");
const Prescription = require("../../models/Prescription");

exports.getAllMyPatients = async (req, res) => {
  try {
    const doctorId = req.user._id; // الـ ID بتاع الدكتور من التوكن

    // 1. Find all unique patient IDs from appointments related to this doctor

    const patientIdsFromAppointments = await Appointment.distinct(
      "patient_id",
      {
        doctor_id: doctorId,
        is_deleted: false,
      }
    );

    // 2. Find all unique patient IDs from prescriptions written by this doctor
    const patientIdsFromPrescriptions = await Prescription.distinct(
      "patient_id",
      {
        doctor_id: doctorId,
      }
    );

    // 3. Combine and get unique patient IDs from both sources
    const allUniquePatientIds = [
      ...new Set([
        ...patientIdsFromAppointments,
        ...patientIdsFromPrescriptions,
      ]),
    ];

    if (allUniquePatientIds.length === 0) {
      return res.status(200).json({
        message: "No patients found for this doctor yet.",
        patients: [],
      });
    }

    // 4. Fetch patient details from the User model
    const patients = await User.find({
      _id: { $in: allUniquePatientIds },
      role: "Patient",
      is_deleted: false,
    }).select(
      "-password -__v -doctor_profile -is_deleted -createdAt -updatedAt"
    );

    res.status(200).json({
      message: "Patients retrieved successfully.",
      count: patients.length,
      patients: patients,
    });
  } catch (error) {
    console.error("Error fetching doctor's patients:", error);
    res.status(500).send("Server Error");
  }
};
// @desc    Get details of a specific patient for the logged-in doctor
// @route   GET /api/doctors/my-patients/:patientId
// @access  Private (Doctor)
exports.getPatientDetails = async (req, res) => {
  try {
    const doctorId = req.user._id; // ID الدكتور اللي عامل login
    const patientId = req.params.patientId; // ID المريض اللي جاي من الـ URL

    // 1. التأكد من وجود المريض ودوره كـ 'Patient'
    const patient = await User.findOne({
      _id: patientId,
      role: "Patient",
      is_deleted: false,
    }).select(
      "-password -__v -doctor_profile -is_deleted -createdAt -updatedAt"
    );

    if (!patient) {
      return res.status(404).json({ message: "Patient not found." });
    }

    // 2. التأكد من أن هذا المريض له علاقة بالدكتور الحالي
    // (يعني الدكتور ده تعامل مع المريض ده في موعد أو روشتة)
    const hasRelation = await Promise.all([
      Appointment.exists({
        doctor_id: doctorId,
        patient_id: patientId,
        is_deleted: false,
      }),
      Prescription.exists({ doctor_id: doctorId, patient_id: patientId }),
    ]);

    if (!hasRelation[0] && !hasRelation[1]) {
      return res.status(403).json({
        message:
          "Access denied: This patient is not associated with the logged-in doctor.",
      });
    }

    // 3. جلب كل المواعيد بين هذا الدكتور وهذا المريض
    const appointments = await Appointment.find({
      doctor_id: doctorId,
      patient_id: patientId,
      is_deleted: false,
    })
      .sort({ appointment_date: -1 }) // ترتيب تنازلي حسب التاريخ
      .select("-__v"); // استبعاد حقول مش محتاجينها

    // 4. جلب كل الروشتات التي كتبها هذا الدكتور لهذا المريض
    const prescriptions = await Prescription.find({
      doctor_id: doctorId,
      patient_id: patientId,
    })
      .sort({ createdAt: -1 }) // ترتيب تنازلي حسب تاريخ الإنشاء
      .select("-__v"); // استبعاد حقول مش محتاجينها

    res.status(200).json({
      message: "Patient details retrieved successfully.",
      patient: patient,
      appointments: appointments,
      prescriptions: prescriptions,
    });
  } catch (error) {
    console.error("Error fetching patient details:", error);
    res.status(500).send("Server Error");
  }
};
// @desc    Update a specific patient's profile by the logged-in doctor
// @route   PUT /api/doctors/my-patients/:patientId/profile
// @access  Private (Doctor)
exports.updatePatientProfile = async (req, res) => {
  try {
    const doctorId = req.user._id; // الـ ID بتاع الدكتور اللي عامل login
    const patientId = req.params.patientId; // الـ ID بتاع المريض من الـ URL

    // البيانات اللي الدكتور هيبعتها للتعديل هتكون في req.body
    const updates = req.body;

    // 1. التأكد من وجود المريض ودوره كـ 'Patient'
    const patient = await User.findOne({
      _id: patientId,
      role: "Patient",
      is_deleted: false,
    });

    if (!patient) {
      return res.status(404).json({ message: "Patient not found." });
    }

    // 2. التأكد من أن هذا المريض له علاقة بالدكتور الحالي
    // (يعني الدكتور ده تعامل مع المريض ده في موعد أو روشتة)
    const hasRelation = await Promise.all([
      Appointment.exists({
        doctor_id: doctorId,
        patient_id: patientId,
        is_deleted: false,
      }),
      Prescription.exists({ doctor_id: doctorId, patient_id: patientId }),
    ]);

    if (!hasRelation[0] && !hasRelation[1]) {
      return res.status(403).json({
        message:
          "Access denied: This patient is not associated with the logged-in doctor.",
      });
    }

    // 3. تطبيق التعديلات على بيانات المريض
    // هنمشي على كل المفاتيح (keys) اللي جاية في الـ updates object
    for (const key in updates) {
      // حقول محددة لا يجب أن يتم تعديلها بواسطة الدكتور للأمان
      // زي الـ ID، الـ role، الباسورد، أو البروفايل الخاص بالدكتور
      if (
        key === "_id" ||
        key === "role" ||
        key === "password" ||
        key === "doctor_profile" ||
        key === "is_deleted"
      ) {
        continue; // تخطي هذه الحقول
      }

      // لو الـ field موجود مباشرة في الـ User schema
      if (patient[key] !== undefined) {
        patient[key] = updates[key];
      }
      // لو الـ field موجود داخل الـ patient_profile object
      else if (
        patient.patient_profile &&
        patient.patient_profile[key] !== undefined
      ) {
        // لو الـ field هو array زي allergies أو chronic_diseases،
        // نتاكد ان الـ update نفسه array عشان ميحصلش overwrite غلط
        if (
          Array.isArray(patient.patient_profile[key]) &&
          Array.isArray(updates[key])
        ) {
          patient.patient_profile[key] = updates[key];
        } else if (
          !Array.isArray(patient.patient_profile[key]) &&
          !Array.isArray(updates[key])
        ) {
          patient.patient_profile[key] = updates[key];
        } else {
          // لو النوع مش متطابق (مثل تحديث array بـ non-array)، ممكن نتجاهله أو نرمي خطأ
          console.warn(`Attempted to update ${key} with incompatible type.`);
        }
      }
    }

    await patient.save(); // حفظ التعديلات في قاعدة البيانات

    // جلب بيانات المريض بعد التعديل لعرضها في الـ response
    // مع استبعاد الحقول الحساسة أو غير الضرورية
    const updatedPatient = await User.findById(patientId).select(
      "-password -__v -doctor_profile -is_deleted -createdAt -updatedAt"
    );

    res.status(200).json({
      message: "Patient profile updated successfully.",
      patient: updatedPatient,
    });
  } catch (error) {
    console.error("Error updating patient profile:", error.message);
    res.status(500).send("Server Error");
  }
};
