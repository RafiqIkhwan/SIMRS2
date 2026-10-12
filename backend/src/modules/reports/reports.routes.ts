import { Router } from 'express';
import { reportsController } from './reports.controller.js';
import { requireAuth } from '../../middlewares/auth.js';
import { requireRole } from '../../middlewares/rbac.js';

const router = Router();

router.use(requireAuth);

router.get(
  '/dashboard',
  requireRole('SUPER_ADMIN', 'HOSPITAL_ADMIN', 'DOCTOR', 'NURSE', 'MANAGEMENT'),
  reportsController.dashboard
);

router.get(
  '/visits',
  requireRole('SUPER_ADMIN', 'HOSPITAL_ADMIN', 'MANAGEMENT'),
  reportsController.visits
);

router.get(
  '/revenue',
  requireRole('SUPER_ADMIN', 'HOSPITAL_ADMIN', 'MANAGEMENT'),
  reportsController.revenue
);

export default router;