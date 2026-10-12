import { Router } from 'express';
import { laboratoryController } from './laboratory.controller.js';
import { requireAuth } from '../../middlewares/auth.js';
import { requireRole } from '../../middlewares/rbac.js';

const router = Router();

router.use(requireAuth);

router.get(
  '/test-types',
  requireRole('SUPER_ADMIN', 'HOSPITAL_ADMIN', 'LAB_STAFF', 'DOCTOR'),
  laboratoryController.listTestTypes
);

router.post(
  '/orders',
  requireRole('SUPER_ADMIN', 'HOSPITAL_ADMIN', 'DOCTOR'),
  laboratoryController.createOrder
);

router.get(
  '/orders',
  requireRole('SUPER_ADMIN', 'HOSPITAL_ADMIN', 'LAB_STAFF', 'DOCTOR'),
  laboratoryController.listOrders
);

router.patch(
  '/orders/:id',
  requireRole('SUPER_ADMIN', 'HOSPITAL_ADMIN', 'LAB_STAFF'),
  laboratoryController.updateStatus
);

router.post(
  '/results/:itemOrder',
  requireRole('SUPER_ADMIN', 'HOSPITAL_ADMIN', 'LAB_STAFF'),
  laboratoryController.recordResult
);

export default router;
