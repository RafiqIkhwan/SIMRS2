import { Router } from 'express';
import { auditController } from './audit.controller.js';
import { requireAuth } from '../../middlewares/auth.js';
import { requireRole } from '../../middlewares/rbac.js';

const router = Router();

router.use(requireAuth);

router.get(
  '/',
  requireRole('SUPER_ADMIN', 'HOSPITAL_ADMIN'),
  auditController.list
);

export default router;
