const express = require("express");
const router = express.Router();
const adminController = require("../controllers/admin/userController");
router.get("/", (req, res) => {
  res.send("Admin route works!");
});

router.get("/doctors", adminController.getAllDoctors);
router.post("/doctors", adminController.addDoctor);
router.delete("/doctors/:doctorId", adminController.deleteDoctor);
router.get("/patients", adminController.getAllPatients);

module.exports = router;
