import { Router } from 'express';
import { authController } from './auth.controller.js';
import { requireAuth } from '../../middlewares/auth.js';

const router = Router();

router.get('/search', requireAuth, authController.searchUsers);

export default router;