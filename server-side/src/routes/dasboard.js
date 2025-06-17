const express = require("express");
const router = express.Router();
const doctorDashboard = require("../controllers/doctor/dashboard.js");
const adminDashboard = require("../controllers/admin/dashboard.js");
const allowedTo = require("../middleware/roleAuth");
const auth = require("../middleware/protectMW.js");

router.get("/", (req, res) => {
  res.send("dashboard route works!");
});

router.get(
  "/doctor",
  auth,
  allowedTo("Doctor"),
  doctorDashboard.getDoctorDashboard
);
router.get(
  "/admin",
  auth,
  allowedTo("Admin"),
  adminDashboard.getAdminDashboard
);

module.exports = router;
