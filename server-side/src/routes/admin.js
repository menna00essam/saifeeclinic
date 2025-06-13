const express = require("express");
const router = express.Router();
const adminController = require("../controllers/admin/userController");
const blogController = require("../controllers/admin/blogController");
const allowedTo = require("../middleware/roleAuth");

router.get("/", (req, res) => {
  res.send("Admin route works!");
});

router.get("/doctors", allowedTo('admin'),adminController.getAllDoctors);
router.post("/doctors",allowedTo('admin'), adminController.addDoctor);
router.delete("/doctors/:doctorId",allowedTo('admin'), adminController.deleteDoctor);
router.get("/patients", allowedTo('admin'),adminController.getAllPatients);

router.post("/blog",allowedTo('admin'), blogController.addBlog);
router.get("/blog",allowedTo('admin'), blogController.getAllBlogs);
router.get("/blog/:id",allowedTo('admin'), blogController.getBlogById);
router.delete("/blog/:id",allowedTo('admin'), blogController.deleteBlog);

module.exports = router;
