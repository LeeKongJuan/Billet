import { db } from '../../config/db.js';
import { decryptNotification } from '../../shared/notification-storage.js';

export const notificationsService = {
  async getNotifications(userId) {
    const notifications = await db('notifications')
      .where({ user_id: userId })
      .select(
        'id',
        'type',
        'title',
        'content',
        'data',
        'is_read as isRead',
        'created_at as createdAt'
      )
      .orderBy('created_at', 'desc')
      .limit(50);

    const unreadCountResult = await db('notifications')
      .where({ user_id: userId, is_read: false })
      .count('id as count')
      .first();

    return {
      notifications: notifications.map(decryptNotification),
      unreadCount: Number(unreadCountResult?.count || 0)
    };
  },

  async markAsRead(userId, notifId) {
    await db('notifications')
      .where({ id: notifId, user_id: userId })
      .update({ is_read: true });
    return { message: 'Đã đánh dấu thông báo đã đọc' };
  },

  async markAllAsRead(userId) {
    await db('notifications')
      .where({ user_id: userId, is_read: false })
      .update({ is_read: true });
    return { message: 'Đã đánh dấu tất cả thông báo là đã đọc' };
  },

  async getUnreadCount(userId) {
    const result = await db('notifications')
      .where({ user_id: userId, is_read: false })
      .count('id as count')
      .first();
    return { unreadCount: Number(result?.count || 0) };
  }
};
