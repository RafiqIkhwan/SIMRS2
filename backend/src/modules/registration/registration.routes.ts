import { Router } from 'express';
import { registrationController } from './registration.controller.js';
import { requireAuth } from '../../middlewares/auth.js';
import { requireRole } from '../../middlewares/rbac.js';

const router = Router();

router.use(requireAuth);

router.get(
  '/queues',
  requireRole('SUPER_ADMIN', 'HOSPITAL_ADMIN', 'REGISTRATION_STAFF', 'DOCTOR', 'NURSE'),
  registrationController.getQueues
);

router.post(
  '/queues',
  requireRole('SUPER_ADMIN', 'HOSPITAL_ADMIN', 'REGISTRATION_STAFF'),
  registrationController.createQueue
);

router.patch(
  '/queues/:id',
  requireRole('SUPER_ADMIN', 'HOSPITAL_ADMIN', 'REGISTRATION_STAFF', 'DOCTOR', 'NURSE'),
  registrationController.updateQueueStatus
);

export default router;