import { Router } from 'express';
import { pharmacyController } from './pharmacy.controller.js';
import { requireAuth } from '../../middlewares/auth.js';
import { requireRole } from '../../middlewares/rbac.js';

const router = Router();

router.use(requireAuth);

// Medications
router.get(
  '/medications',
  pharmacyController.listMedications
);

router.post(
  '/medications',
  requireRole('SUPER_ADMIN', 'HOSPITAL_ADMIN', 'PHARMACIST'),
  pharmacyController.createMedication
);

// Prescriptions
router.get(
  '/prescriptions',
  requireRole('SUPER_ADMIN', 'HOSPITAL_ADMIN', 'PHARMACIST', 'DOCTOR'),
  pharmacyController.listPrescriptions
);

router.post(
  '/prescriptions',
  requireRole('SUPER_ADMIN', 'HOSPITAL_ADMIN', 'DOCTOR'),
  pharmacyController.createPrescription
);

router.patch(
  '/prescriptions/:id',
  requireRole('SUPER_ADMIN', 'HOSPITAL_ADMIN', 'PHARMACIST'),
  pharmacyController.updatePrescriptionStatus
);

export default router;