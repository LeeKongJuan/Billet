import { Router } from 'express';
import { notificationsController } from './notifications.controller.js';
import { requireAuth } from '../../middlewares/auth.js';

const router = Router();
router.use(requireAuth);

router.get('/', notificationsController.getNotifications);
router.patch('/:id/read', notificationsController.markAsRead);
router.post('/read-all', notificationsController.markAllAsRead);
router.get('/unread-count', notificationsController.getUnreadCount);

export default router;
