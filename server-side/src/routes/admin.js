const express = require("express");
const router = express.Router();
const adminController = require("../controllers/admin/userController");
const blogController = require("../controllers/admin/blogController");
const allowedTo = require("../middleware/roleAuth");
const auth = require("../middleware/protectMW.js");

router.get("/", (req, res) => {
  res.send("Admin route works!");
});

router.get("/doctors", auth, allowedTo("admin"), adminController.getAllDoctors);
router.post("/doctors", auth, allowedTo("admin"), adminController.addDoctor);
router.delete(
  "/doctors/:doctorId",
  auth,
  allowedTo("admin"),
  adminController.deleteDoctor
);
router.get(
  "/patients",
  auth,
  allowedTo("admin"),
  adminController.getAllPatients
);

router.post("/blog", auth, allowedTo("admin"), blogController.addBlog);
router.get("/blog", auth, allowedTo("admin"), blogController.getAllBlogs);
router.get("/blog/:id", auth, allowedTo("admin"), blogController.getBlogById);
router.delete("/blog/:id", auth, allowedTo("admin"), blogController.deleteBlog);

module.exports = router;
