import { Router } from 'express';
import { masterController } from './master.controller.js';
import {
  createDepartmentSchema,
  createClinicSchema,
  createDoctorSchema,
  createDoctorScheduleSchema,
} from './master.dto.js';
import { validateRequest } from '../../middlewares/validate.js';
import { requireAuth } from '../../middlewares/auth.js';
import { requireRole } from '../../middlewares/rbac.js';

const router = Router();

router.use(requireAuth);

// Departments
router.get('/departments', masterController.getDepartments);
router.post(
  '/departments',
  requireRole('SUPER_ADMIN', 'HOSPITAL_ADMIN'),
  validateRequest({ body: createDepartmentSchema }),
  masterController.createDepartment
);

// Clinics
router.get('/clinics', masterController.getClinics);
router.post(
  '/clinics',
  requireRole('SUPER_ADMIN', 'HOSPITAL_ADMIN'),
  validateRequest({ body: createClinicSchema }),
  masterController.createClinic
);

// Doctors
router.get('/doctors', masterController.getDoctors);
router.post(
  '/doctors',
  requireRole('SUPER_ADMIN', 'HOSPITAL_ADMIN'),
  validateRequest({ body: createDoctorSchema }),
  masterController.createDoctor
);

// Schedules
router.get('/schedules', masterController.getSchedules);
router.post(
  '/schedules',
  requireRole('SUPER_ADMIN', 'HOSPITAL_ADMIN'),
  validateRequest({ body: createDoctorScheduleSchema }),
  masterController.createSchedule
);

export default router;
