const express = require('express');
const router = express.Router();

// Import controllers
const doctorController = require('../controllers/public/doctorController');
const clinicController = require('../controllers/public/clinicController');
const blogController = require('../controllers/public/blogController');

// Import middleware
const { rateLimiter } = require('../middleware/rateLimiter');
const validation = require('../middleware/validation');

// Apply rate limiting to all public routes
router.use(rateLimiter);

// DOCTOR ROUTES

router.get('/doctors', doctorController.getAllDoctors);
router.get('/doctors/specializations', doctorController.getSpecializations);
router.get('/doctors/:id', doctorController.getDoctorById);
router.get('/doctors/:id/schedule', doctorController.getDoctorSchedule);

// CLINIC ROUTES

router.get('/clinic/overview', clinicController.getClinicOverview);
router.get('/clinic/services', clinicController.getClinicServices);
router.get('/clinic/contact', clinicController.getContactInfo);
router.get('/clinic/stats', clinicController.getPublicStats);
router.post('/clinic/contact', 
  validation.validateContactForm,
  clinicController.submitContactForm
);

// BLOG ROUTES


router.get('/blogs', blogController.getAllBlogs);
router.get('/blogs/featured', blogController.getFeaturedBlogs);
router.get('/blogs/search', blogController.searchBlogs);
router.get('/blogs/tags', blogController.getPopularTags);
router.get('/blogs/categories', blogController.getBlogCategories);
router.get('/blogs/tag/:tag', blogController.getBlogsByTag);
router.get('/blogs/author/:authorId', blogController.getBlogsByAuthor);
router.get('/blogs/:id', blogController.getBlogById);

module.exports = router;