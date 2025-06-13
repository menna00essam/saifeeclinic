const notificationService = require('../../services/notificationService');
const { responseHandler } = require('../../utils/responseHandler');

exports.getUserNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 20, unread_only = false } = req.query;
    const userId = req.user.id;

    const result = await notificationService.getUserNotifications(
      userId,
      parseInt(page),
      parseInt(limit),
      unread_only === 'true'
    );

    responseHandler.success(res, result, 'Notifications retrieved successfully');
  } catch (error) {
    console.error('Error in getUserNotifications:', error);
    responseHandler.error(res, error.message);
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user.id;

    const notification = await notificationService.markAsRead(notificationId, userId);

    if (!notification) {
      return responseHandler.notFound(res, 'Notification not found');
    }

    responseHandler.success(res, notification, 'Notification marked as read');
  } catch (error) {
    console.error('Error in markAsRead:', error);
    responseHandler.error(res, error.message);
  }
};

exports.markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    await notificationService.markAllAsRead(userId);
    responseHandler.success(res, null, 'All notifications marked as read');
  } catch (error) {
    console.error('Error in markAllAsRead:', error);
    responseHandler.error(res, error.message);
  }
};

exports.getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.id;
    const count = await notificationService.getUnreadCount(userId);
    responseHandler.success(res, { count }, 'Unread count retrieved');
  } catch (error) {
    console.error('Error in getUnreadCount:', error);
    responseHandler.error(res, error.message);
  }
};

exports.sendToUser = async (req, res) => {
  try {
    const { userId, category, data, type = 'email' } = req.body;

    const notification = await notificationService.sendToUser(userId, category, data, type);
    responseHandler.success(res, notification, 'Notification sent successfully');
  } catch (error) {
    console.error('Error in sendToUser:', error);
    responseHandler.error(res, error.message);
  }
};

exports.sendToRole = async (req, res) => {
  try {
    const { role, category, data, type = 'email' } = req.body;

    const notifications = await notificationService.sendToRole(role, category, data, type);
    responseHandler.success(res, notifications, `Notifications sent to all ${role}s`);
  } catch (error) {
    console.error('Error in sendToRole:', error);
    responseHandler.error(res, error.message);
  }
};

exports.getStats = async (req, res) => {
  try {
    const Notification = require('../../models/Notification');

    const stats = await Notification.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const categoryStats = await Notification.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      }
    ]);

    responseHandler.success(res, { stats, categoryStats }, 'Statistics retrieved');
  } catch (error) {
    console.error('Error in getStats:', error);
    responseHandler.error(res, error.message);
  }
};
