import { Request, Response } from 'express';
import { patientsService } from './patients.service.js';
import { auditService } from '../audit/audit.service.js';
import { sendSuccess, sendError } from '../../utils/response.js';

export const patientsController = {
  async list(req: Request, res: Response): Promise<void> {
    const result = await patientsService.listPatients(req.query as any);
    sendSuccess(res, result.patients, 200, result.meta);
  },

  async getById(req: Request, res: Response): Promise<void> {
    const patient = await patientsService.getPatientById(req.params.id);
    if (!patient) {
      sendError(res, 'NOT_FOUND', 'Data pasien tidak ditemukan', 404);
      return;
    }
    sendSuccess(res, patient);
  },

  async create(req: Request, res: Response): Promise<void> {
    try {
      const patient = await patientsService.createPatient(req.body);

      await auditService.log({
        userId: req.user!.id,
        action: 'PATIENT_CREATE',
        entity: 'Patient',
        entityId: patient.id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        metadata: {
          medicalRecordNumber: patient.medicalRecordNumber,
        },
      });

      sendSuccess(res, patient, 201);
    } catch (err: any) {
      sendError(res, 'CREATE_PATIENT_FAILED', err.message, 400);
    }
  },

  async update(req: Request, res: Response): Promise<void> {
    try {
      const patient = await patientsService.updatePatient(req.params.id, req.body);

      await auditService.log({
        userId: req.user!.id,
        action: 'PATIENT_UPDATE',
        entity: 'Patient',
        entityId: patient.id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        metadata: {
          updatedFields: Object.keys(req.body),
        },
      });

      sendSuccess(res, patient);
    } catch (err: any) {
      sendError(res, 'UPDATE_PATIENT_FAILED', err.message, 400);
    }
  },
};
