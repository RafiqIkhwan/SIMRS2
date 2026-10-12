import { Router } from 'express';
import { appointmentsController } from './appointments.controller.js';
import { requireAuth } from '../../middlewares/auth.js';
import { requireRole } from '../../middlewares/rbac.js';

const router = Router();

router.use(requireAuth);

router.get('/', appointmentsController.list);
router.post('/', requireRole('SUPER_ADMIN', 'HOSPITAL_ADMIN', 'REGISTRATION_STAFF'), appointmentsController.create);
router.patch('/:id', appointmentsController.update);

export default router;