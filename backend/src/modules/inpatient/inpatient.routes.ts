import { Router } from 'express';
import { inpatientController } from './inpatient.controller.js';
import { requireAuth } from '../../middlewares/auth.js';
import { requireRole } from '../../middlewares/rbac.js';

const router = Router();

router.use(requireAuth);

router.get(
  '/',
  requireRole('SUPER_ADMIN', 'HOSPITAL_ADMIN', 'DOCTOR', 'NURSE'),
  inpatientController.list
);

router.post(
  '/',
  requireRole('SUPER_ADMIN', 'HOSPITAL_ADMIN', 'REGISTRATION_STAFF'),
  inpatientController.create
);

router.patch(
  '/:id/discharge',
  requireRole('SUPER_ADMIN', 'HOSPITAL_ADMIN', 'DOCTOR', 'NURSE'),
  inpatientController.discharge
);

export default router;