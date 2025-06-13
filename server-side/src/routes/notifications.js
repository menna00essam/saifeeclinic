const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification/notificationController');
const auth = require('../middleware/protectMW.js');
const allowedTo = require('../middleware/roleAuth');

router.get('/', auth, notificationController.getUserNotifications);
router.get('/unread-count', auth, notificationController.getUnreadCount);
router.patch('/:notificationId/read', auth, notificationController.markAsRead);
router.patch('/mark-all-read', auth, notificationController.markAllAsRead);

router.post('/send-to-user', auth, allowedTo('Admin'), notificationController.sendToUser);
router.post('/send-to-role', auth, allowedTo('Admin'), notificationController.sendToRole);
router.get('/stats', auth, allowedTo('Admin'), notificationController.getStats);

module.exports = router;

