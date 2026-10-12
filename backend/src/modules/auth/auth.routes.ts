import { Router } from 'express';
import { authController } from './auth.controller.js';
import { loginSchema, changePasswordSchema } from './auth.dto.js';
import { validateRequest } from '../../middlewares/validate.js';
import { requireAuth } from '../../middlewares/auth.js';
import { authRateLimiter } from '../../middlewares/rateLimiter.js';

const router = Router();

router.post(
  '/login',
  authRateLimiter,
  validateRequest({ body: loginSchema }),
  authController.login
);

router.post('/logout', requireAuth, authController.logout);

router.get('/me', requireAuth, authController.getMe);

router.get('/csrf-token', authController.getCsrf);

router.post(
  '/change-password',
  requireAuth,
  validateRequest({ body: changePasswordSchema }),
  authController.changePassword
);

export default router;
