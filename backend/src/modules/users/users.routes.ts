import { Router } from 'express';
import { usersController } from './users.controller.js';
import {
  createUserSchema,
  updateUserSchema,
  resetPasswordSchema,
  userQuerySchema,
} from './users.dto.js';
import { validateRequest } from '../../middlewares/validate.js';
import { requireAuth } from '../../middlewares/auth.js';
import { requireRole } from '../../middlewares/rbac.js';

const router = Router();

router.use(requireAuth);

router.get(
  '/',
  requireRole('SUPER_ADMIN', 'HOSPITAL_ADMIN'),
  validateRequest({ query: userQuerySchema }),
  usersController.list
);

router.get(
  '/:id',
  requireRole('SUPER_ADMIN', 'HOSPITAL_ADMIN'),
  usersController.getById
);

router.post(
  '/',
  requireRole('SUPER_ADMIN'),
  validateRequest({ body: createUserSchema }),
  usersController.create
);

router.patch(
  '/:id',
  requireRole('SUPER_ADMIN', 'HOSPITAL_ADMIN'),
  validateRequest({ body: updateUserSchema }),
  usersController.update
);

router.post(
  '/:id/reset-password',
  requireRole('SUPER_ADMIN'),
  validateRequest({ body: resetPasswordSchema }),
  usersController.resetPassword
);

export default router;
