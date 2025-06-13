const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification/notificationController');


router.get('/', notificationController.getUserNotifications);
router.get('/unread-count', notificationController.getUnreadCount);
router.patch('/:notificationId/read', notificationController.markAsRead);
router.patch('/mark-all-read', notificationController.markAllAsRead);

router.post('/send-to-user',notificationController.sendToUser);
router.post('/send-to-role', notificationController.sendToRole);
router.get('/stats',notificationController.getStats);

module.exports = router;
