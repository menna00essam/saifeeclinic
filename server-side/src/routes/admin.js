const express = require("express");
const router = express.Router();
const adminController = require("../controllers/admin/userController");
const blogController = require("../controllers/admin/blogController");
const allowedTo = require("../middleware/roleAuth");
const auth = require("../middleware/protectMW.js");

router.get("/", (req, res) => {
  res.send("Admin route works!");
});

router.get("/doctors", auth, allowedTo("Admin"), adminController.getAllDoctors);
router.post("/doctors", auth, allowedTo("Admin"), adminController.addDoctor);
router.delete(
  "/doctors/:doctorId",
  auth,
  allowedTo("Admin"),
  adminController.deleteDoctor
);
router.get(
  "/patients",
  auth,
  allowedTo("Admin"),
  adminController.getAllPatients
);

router.post("/blog", auth, allowedTo("Admin"), blogController.addBlog);
router.get("/blog", auth, allowedTo("Admin"), blogController.getAllBlogs);
router.get("/blog/:id", auth, allowedTo("Admin"), blogController.getBlogById);
router.delete("/blog/:id", auth, allowedTo("Admin"), blogController.deleteBlog);

module.exports = router;
