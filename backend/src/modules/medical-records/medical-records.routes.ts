import { Router } from 'express';
import { medicalRecordsController } from './medical-records.controller.js';
import { requireAuth } from '../../middlewares/auth.js';
import { requireRole, requireAnyPermission } from '../../middlewares/rbac.js';

const router = Router();

router.use(requireAuth);

router.get('/queue-options', medicalRecordsController.searchQueues);
router.get('/', medicalRecordsController.list);
router.post('/', medicalRecordsController.create);
router.post(
  '/:id/finalize',
  requireRole('SUPER_ADMIN', 'DOCTOR', 'HOSPITAL_ADMIN'),
  medicalRecordsController.finalize
);
router.post('/:id/amend', medicalRecordsController.amend);
router.post(
  '/clinical-notes',
  requireAnyPermission('emr:write'),
  medicalRecordsController.addClinicalNote
);

export default router;
