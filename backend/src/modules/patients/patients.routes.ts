import { Router } from 'express';
import { patientsController } from './patients.controller.js';
import {
  createPatientSchema,
  updatePatientSchema,
  patientQuerySchema,
} from './patients.dto.js';
import { validateRequest } from '../../middlewares/validate.js';
import { requireAuth } from '../../middlewares/auth.js';
import { requireRole } from '../../middlewares/rbac.js';

const router = Router();

router.use(requireAuth);

router.get(
  '/',
  validateRequest({ query: patientQuerySchema }),
  patientsController.list
);

router.get('/:id', patientsController.getById);

router.post(
  '/',
  requireRole('SUPER_ADMIN', 'HOSPITAL_ADMIN', 'REGISTRATION_STAFF'),
  validateRequest({ body: createPatientSchema }),
  patientsController.create
);

router.patch(
  '/:id',
  requireRole('SUPER_ADMIN', 'HOSPITAL_ADMIN', 'REGISTRATION_STAFF'),
  validateRequest({ body: updatePatientSchema }),
  patientsController.update
);

export default router;
