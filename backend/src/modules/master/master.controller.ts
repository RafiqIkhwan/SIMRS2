import { Request, Response } from 'express';
import { masterService } from './master.service.js';
import { auditService } from '../audit/audit.service.js';
import { sendSuccess, sendError } from '../../utils/response.js';

export const masterController = {
  async getDepartments(_req: Request, res: Response): Promise<void> {
    const list = await masterService.listDepartments();
    sendSuccess(res, list);
  },

  async createDepartment(req: Request, res: Response): Promise<void> {
    try {
      const dept = await masterService.createDepartment(req.body);

      await auditService.log({
        userId: req.user!.id,
        action: 'DEPARTMENT_CREATE',
        entity: 'Department',
        entityId: dept.id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        metadata: { code: dept.code, name: dept.name },
      });

      sendSuccess(res, dept, 201);
    } catch (err: any) {
      sendError(res, 'CREATE_DEPT_FAILED', err.message, 400);
    }
  },

  async getClinics(_req: Request, res: Response): Promise<void> {
    const list = await masterService.listClinics();
    sendSuccess(res, list);
  },

  async createClinic(req: Request, res: Response): Promise<void> {
    try {
      const clinic = await masterService.createClinic(req.body);

      await auditService.log({
        userId: req.user!.id,
        action: 'CLINIC_CREATE',
        entity: 'Clinic',
        entityId: clinic.id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        metadata: { code: clinic.code, name: clinic.name },
      });

      sendSuccess(res, clinic, 201);
    } catch (err: any) {
      sendError(res, 'CREATE_CLINIC_FAILED', err.message, 400);
    }
  },

  async getDoctors(_req: Request, res: Response): Promise<void> {
    const list = await masterService.listDoctors();
    sendSuccess(res, list);
  },

  async createDoctor(req: Request, res: Response): Promise<void> {
    try {
      const doctor = await masterService.createDoctor(req.body);

      await auditService.log({
        userId: req.user!.id,
        action: 'DOCTOR_CREATE',
        entity: 'Doctor',
        entityId: doctor.id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        metadata: { licenseNumber: doctor.licenseNumber },
      });

      sendSuccess(res, doctor, 201);
    } catch (err: any) {
      sendError(res, 'CREATE_DOCTOR_FAILED', err.message, 400);
    }
  },

  async getSchedules(req: Request, res: Response): Promise<void> {
    const clinicId = req.query.clinicId as string | undefined;
    const dayOfWeek = req.query.dayOfWeek !== undefined ? parseInt(req.query.dayOfWeek as string, 10) : undefined;
    const list = await masterService.listSchedules(clinicId, dayOfWeek);
    sendSuccess(res, list);
  },

  async createSchedule(req: Request, res: Response): Promise<void> {
    try {
      const schedule = await masterService.createSchedule(req.body);

      await auditService.log({
        userId: req.user!.id,
        action: 'DOCTOR_SCHEDULE_CREATE',
        entity: 'DoctorSchedule',
        entityId: schedule.id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        metadata: { doctorId: schedule.doctorId, dayOfWeek: schedule.dayOfWeek },
      });

      sendSuccess(res, schedule, 201);
    } catch (err: any) {
      sendError(res, 'CREATE_SCHEDULE_FAILED', err.message, 400);
    }
  },
};
