const express = require("express");
const router = express.Router();
const adminController = require("../controllers/admin/userController");
const blogController = require("../controllers/admin/blogController");

router.get("/", (req, res) => {
  res.send("Admin route works!");
});

router.get("/doctors", adminController.getAllDoctors);
router.post("/doctors", adminController.addDoctor);
router.delete("/doctors/:doctorId", adminController.deleteDoctor);
router.get("/patients", adminController.getAllPatients);

router.post("/blog", blogController.addBlog);
router.get("/blog", blogController.getAllBlogs);
router.get("/blog/:id", blogController.getBlogById);
router.delete("/blog/:id", blogController.deleteBlog);

module.exports = router;
