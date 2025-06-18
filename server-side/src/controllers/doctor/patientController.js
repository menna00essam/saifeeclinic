const User = require("../../models/User");
const Appointment = require("../../models/Appointment");
const Prescription = require("../../models/Prescription");

exports.getAllMyPatients = async (req, res) => {
  try {
    const doctorId = req.user._id;
    
    // Extract pagination and search parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || "";
    
    const skip = (page - 1) * limit;

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
        currentPage: page,
        totalPages: 0,
        count: 0,
      });
    }

    // 4. Build search query
    let searchQuery = {
      _id: { $in: allUniquePatientIds },
      role: "Patient",
      is_deleted: false,
    };

    // Add search functionality
    if (search) {
      searchQuery.$or = [
        { first_name: { $regex: search, $options: "i" } },
        { last_name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ];
    }

    // 5. Get total count for pagination
    const totalPatients = await User.countDocuments(searchQuery);
    const totalPages = Math.ceil(totalPatients / limit);

    // 6. Fetch patients with pagination
    const patients = await User.find(searchQuery)
      .select("-password -__v -doctor_profile -is_deleted -createdAt -updatedAt")
      .skip(skip)
      .limit(limit)
      .sort({ first_name: 1 }); // Sort by first name

    res.status(200).json({
      message: "Patients retrieved successfully.",
      count: totalPatients,
      patients: patients,
      currentPage: page,
      totalPages: totalPages,
    });
  } catch (error) {
    console.error("Error fetching doctor's patients:", error);
    res.status(500).send("Server Error");
  }
};

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

exports.updatePatientProfile = async (req, res) => {
  try {
    const doctorId = req.user._id;
    const patientId = req.params.patientId;
    const updates = req.body;

    const patient = await User.findOne({
      _id: patientId,
      role: "Patient",
      is_deleted: false,
    });

    if (!patient) {
      return res.status(404).json({ message: "Patient not found." });
    }

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
        message: "Access denied: This patient is not associated with the logged-in doctor.",
      });
    }

    if (updates.patient_profile) {
      for (const key in updates.patient_profile) {
        if (updates.patient_profile[key] !== undefined) {
          if (!patient.patient_profile) {
            patient.patient_profile = {};
          }
          patient.patient_profile[key] = updates.patient_profile[key];
        }
      }
    }

    const basicFields = ['first_name', 'last_name', 'email', 'phone', 'gender', 'birth_date'];
    basicFields.forEach(field => {
      if (updates[field] !== undefined) {
        patient[field] = updates[field];
      }
    });

    await patient.save();

    const updatedPatient = await User.findById(patientId).select(
      "-password -__v -doctor_profile -is_deleted"
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