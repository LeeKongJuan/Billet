import { Router } from 'express';
import { authController } from './auth.controller.js';
import { validateBody } from '../../middlewares/validate.js';
import { registerSchema, loginSchema, changePasswordSchema } from './auth.schemas.js';
import { requireAuth } from '../../middlewares/auth.js';
import { authRateLimit } from '../../middlewares/rate-limit.js';

const router = Router();

router.post('/register', authRateLimit(10, 60000), validateBody(registerSchema), authController.register);
router.post('/login', authRateLimit(15, 60000), validateBody(loginSchema), authController.login);
router.post('/logout', authController.logout);
router.get('/me', requireAuth, authController.me);
router.put('/password', requireAuth, validateBody(changePasswordSchema), authController.changePassword);

export default router;
