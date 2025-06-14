const Notification = require('../models/Notification');
const User = require('../models/User');
const emailService = require('./emailService');
const smsService = require('./smsService');
const { notificationTemplates } = require('../utils/templates');

class NotificationService {
  
  // Create notification in database
  async createNotification(notificationData) {
    try {
      const notification = new Notification(notificationData);
      await notification.save();
      
      // Process immediately if not scheduled
      if (notification.scheduled_at <= new Date()) {
        await this.processNotification(notification._id);
      }
      
      return notification;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  // Send notification to specific user
  async sendToUser(userId, category, data = {}, type = 'email') {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const template = notificationTemplates[category];
      if (!template) {
        throw new Error(`Template not found for category: ${category}`);
      }

      const notification = await this.createNotification({
        user_id: userId,
        type,
        category,
        title: template.title(data),
        message: template.message(data),
        data,
        priority: template.priority || 'medium'
      });

      return notification;
    } catch (error) {
      console.error('Error sending notification to user:', error);
      throw error;
    }
  }

  // Send notification to multiple users by role
  async sendToRole(role, category, data = {}, type = 'email') {
    try {
      const users = await User.find({ role, is_active: true });
      const notifications = [];

      for (const user of users) {
        const notification = await this.sendToUser(user._id, category, data, type);
        notifications.push(notification);
      }

      return notifications;
    } catch (error) {
      console.error('Error sending notification to role:', error);
      throw error;
    }
  }

  // Process notification (actually send it)
  async processNotification(notificationId) {
    try {
      const notification = await Notification.findById(notificationId).populate('user_id');
      if (!notification || notification.status !== 'pending') {
        return;
      }

      let result = false;

      switch (notification.type) {
        case 'email':
          result = await this.sendEmail(notification);
          break;
        case 'sms':
          result = await this.sendSMS(notification);
          break;
        case 'push':
          result = await this.sendPushNotification(notification);
          break;
        case 'in_app':
          result = true; // In-app notifications are stored in DB only
          break;
      }

      // Update notification status
      notification.status = result ? 'sent' : 'failed';
      notification.sent_at = result ? new Date() : null;
      if (!result) notification.retry_count += 1;
      
      await notification.save();

      return result;
    } catch (error) {
      console.error('Error processing notification:', error);
      // Update failed status
      await Notification.findByIdAndUpdate(notificationId, {
        status: 'failed',
        $inc: { retry_count: 1 }
      });
      return false;
    }
  }

  // Send email notification
  async sendEmail(notification) {
    try {
      const emailData = {
        to: notification.user_id.email,
        subject: notification.title,
        html: notification.message,
        data: notification.data
      };

      await emailService.sendEmail(emailData);
      return true;
    } catch (error) {
      console.error('Error sending email:', error);
      return false;
    }
  }

  // Send SMS notification
  async sendSMS(notification) {
    try {
      if (!notification.user_id.phone) {
        console.log('User has no phone number');
        return false;
      }

      await smsService.sendSMS({
        to: notification.user_id.phone,
        message: notification.message
      });
      return true;
    } catch (error) {
      console.error('Error sending SMS:', error);
      return false;
    }
  }

  // Send push notification (placeholder - implement with your push service)
  async sendPushNotification(notification) {
    try {
      // Implement with Firebase FCM, OneSignal, etc.
      console.log('Push notification sent:', notification.title);
      return true;
    } catch (error) {
      console.error('Error sending push notification:', error);
      return false;
    }
  }

  // Get user notifications with pagination
  async getUserNotifications(userId, page = 1, limit = 20, unreadOnly = false) {
    try {
      const query = { user_id: userId };
      if (unreadOnly) query.is_read = false;

      const notifications = await Notification.find(query)
        .sort({ created_at: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

      const total = await Notification.countDocuments(query);

      return {
        notifications,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        total,
        unreadCount: await this.getUnreadCount(userId)
      };
    } catch (error) {
      console.error('Error getting user notifications:', error);
      throw error;
    }
  }

  // Mark notification as read
  async markAsRead(notificationId, userId) {
    try {
      const notification = await Notification.findOneAndUpdate(
        { _id: notificationId, user_id: userId },
        { 
          is_read: true, 
          read_at: new Date(),
          status: 'read'
        },
        { new: true }
      );
      return notification;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  // Mark all notifications as read for user
  async markAllAsRead(userId) {
    try {
      await Notification.updateMany(
        { user_id: userId, is_read: false },
        { 
          is_read: true, 
          read_at: new Date(),
          status: 'read'
        }
      );
      return true;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  // Get unread count for user
  async getUnreadCount(userId) {
    try {
      return await Notification.countDocuments({
        user_id: userId,
        is_read: false
      });
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  }

  // Retry failed notifications
  async retryFailedNotifications() {
    try {
      const failedNotifications = await Notification.find({
        status: 'failed',
        retry_count: { $lt: { $field: 'max_retries' } },
        scheduled_at: { $lte: new Date() }
      });

      for (const notification of failedNotifications) {
        await this.processNotification(notification._id);
      }

      return failedNotifications.length;
    } catch (error) {
      console.error('Error retrying failed notifications:', error);
      return 0;
    }
  }

  // Clean old notifications
  async cleanupOldNotifications(daysOld = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const result = await Notification.deleteMany({
        created_at: { $lt: cutoffDate },
        status: { $in: ['sent', 'read'] }
      });

      return result.deletedCount;
    } catch (error) {
      console.error('Error cleaning up notifications:', error);
      return 0;
    }
  }

}

module.exports = new NotificationService();
