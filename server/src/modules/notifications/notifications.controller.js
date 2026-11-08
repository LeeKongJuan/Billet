import { notificationsService } from './notifications.service.js';

export const notificationsController = {
  async getNotifications(req, res, next) {
    try {
      const data = await notificationsService.getNotifications(req.user.id);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  },

  async markAsRead(req, res, next) {
    try {
      const result = await notificationsService.markAsRead(req.user.id, Number(req.params.id));
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  },

  async markAllAsRead(req, res, next) {
    try {
      const result = await notificationsService.markAllAsRead(req.user.id);
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  },

  async getUnreadCount(req, res, next) {
    try {
      const data = await notificationsService.getUnreadCount(req.user.id);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }
};
