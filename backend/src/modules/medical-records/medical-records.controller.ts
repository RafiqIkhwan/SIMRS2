import { Request, Response } from 'express';
import { prisma } from '../../config/prisma.js';
import { z } from 'zod';
import { sendSuccess, sendError } from '../../utils/response.js';
import { auditService } from '../audit/audit.service.js';

const createMedicalRecordSchema = z.object({
  patientId: z.string().uuid(),
  doctorId: z.string().uuid(),
  queueId: z.string().uuid().optional(),
});

const createClinicalNoteSchema = z.object({
  medicalRecordId: z.string().uuid(),
  subjective: z.string().min(3),
  objective: z.string().min(3),
  assessment: z.string().min(3),
  plan: z.string().min(3),
  systolicBP: z.number().int().optional(),
  diastolicBP: z.number().int().optional(),
  heartRate: z.number().int().optional(),
  respiratoryRate: z.number().int().optional(),
  bodyTemp: z.number().optional(),
  weightKg: z.number().optional(),
  heightCm: z.number().optional(),
  status: z.enum(['DRAFT', 'FINAL', 'AMENDED']).optional(),
});

const amendMedicalRecordSchema = z.object({
  reason: z.string().min(3),
});

const updateDiagnosisSchema = z.object({
  icd10Code: z.string().min(1),
  description: z.string().min(3),
  isPrimary: z.boolean().optional(),
});

export const medicalRecordsController = {
  async searchQueues(req: Request, res: Response): Promise<void> {
    try {
      const search = z.string().trim().min(2).max(100).parse(req.query.search);
      const queues = await prisma.queue.findMany({
        where: {
          OR: [
            { id: { contains: search, mode: 'insensitive' } },
            { formattedCode: { contains: search, mode: 'insensitive' } },
            { patient: { fullName: { contains: search, mode: 'insensitive' } } },
            { patient: { medicalRecordNumber: { contains: search, mode: 'insensitive' } } },
            { doctor: { user: { fullName: { contains: search, mode: 'insensitive' } } } },
            { clinic: { name: { contains: search, mode: 'insensitive' } } },
          ],
        },
        take: 8,
        orderBy: [{ queueDate: 'desc' }, { queueNumber: 'asc' }],
        select: {
          id: true,
          formattedCode: true,
          queueDate: true,
          patient: { select: { fullName: true, medicalRecordNumber: true } },
          doctor: { select: { user: { select: { fullName: true } } } },
          clinic: { select: { name: true } },
        },
      });

      sendSuccess(res, queues);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        sendError(res, 'VALIDATION_ERROR', 'Ketik minimal 2 karakter untuk mencari antrean', 400, err.errors);
        return;
      }
      sendError(res, 'QUEUE_SEARCH_FAILED', err.message, 500);
    }
  },

  async list(req: Request, res: Response): Promise<void> {
    const page = Math.max(parseInt(req.query.page as string) || 1, 1);
    const limit = Math.max(parseInt(req.query.limit as string) || 10, 1);
    const skip = (page - 1) * limit;

    const where: any = {};
    if (req.query.patientId) {
      where.patientId = req.query.patientId as string;
    }
    if (req.query.doctorId) {
      where.doctorId = req.query.doctorId as string;
    }
    if (req.query.status) {
      where.status = req.query.status as string;
    }

    const [total, records] = await Promise.all([
      prisma.medicalRecord.count({ where }),
      prisma.medicalRecord.findMany({
        where,
        skip,
        take: limit,
        orderBy: { visitDate: 'desc' },
        include: {
          patient: { select: { fullName: true, medicalRecordNumber: true } },
          doctor: { include: { user: { select: { fullName: true } } } },
          queue: {
            include: {
              doctor: { include: { user: { select: { fullName: true } } } },
              clinic: true,
            },
          },
          _count: {
            select: { clinicalNotes: true, diagnoses: true, prescriptions: true },
          },
        },
      }),
    ]);

    sendSuccess(res, records, 200, { page, limit, total, totalPages: Math.ceil(total / limit) });
  },

  async create(req: Request, res: Response): Promise<void> {
    try {
      const data = createMedicalRecordSchema.parse(req.body);
      const recordNumber = `RM-${Date.now()}`;

      const record = await prisma.medicalRecord.create({
        data: {
          ...data,
          recordNumber,
          status: 'DRAFT',
        },
        include: {
          patient: { select: { fullName: true } },
          doctor: { include: { user: { select: { fullName: true } } } },
        },
      });

      await auditService.log({
        userId: req.user!.id,
        action: 'MEDICAL_RECORD_CREATED',
        entity: 'MedicalRecord',
        entityId: record.id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        metadata: { patientId: data.patientId },
      });

      sendSuccess(res, record, 201);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        sendError(res, 'VALIDATION_ERROR', 'Validasi gagal', 400, err.errors);
      } else {
        sendError(res, 'ERROR', err.message, 400);
      }
    }
  },

  async finalize(req: Request, res: Response): Promise<void> {
    try {
      const id = z.string().uuid().parse(req.params.id);
      const userId = req.user!.id;
      const ipAddress = req.ip;
      const userAgent = req.get('user-agent');

      const existing = await prisma.medicalRecord.findUnique({
        where: { id },
        include: { _count: { select: { clinicalNotes: true } } },
      });

      if (!existing) throw new Error('Rekam medis tidak ditemukan');
      if (existing.status === 'FINAL') throw new Error('Rekam medis sudah difinalisasi. Gunakan amendemen untuk koreksi.');

      const record = await prisma.medicalRecord.update({
        where: { id },
        data: { status: 'FINAL', finalizedAt: new Date() },
        include: {
          patient: { select: { fullName: true } },
          doctor: { include: { user: { select: { fullName: true } } } },
        },
      });

      await auditService.log({
        userId,
        action: 'MEDICAL_RECORD_FINALIZED',
        entity: 'MedicalRecord',
        entityId: record.id,
        ipAddress,
        userAgent,
        metadata: { finalizedBy: userId, previousStatus: 'DRAFT' },
      });

      sendSuccess(res, record);
    } catch (err: any) {
      sendError(res, 'FINALIZE_FAILED', err.message, 400);
    }
  },

  async amend(req: Request, res: Response): Promise<void> {
    try {
      const id = z.string().uuid().parse(req.params.id);
      const { reason } = amendMedicalRecordSchema.parse(req.body);
      const userId = req.user!.id;
      const ipAddress = req.ip;
      const userAgent = req.get('user-agent');
      const clinicalNoteId = z.string().uuid().optional().parse(req.query.clinicalNoteId);

      const record = await prisma.medicalRecord.findUnique({ where: { id } });
      if (!record) throw new Error('Rekam medis tidak ditemukan');

      let note;
      if (clinicalNoteId) {
        note = await prisma.clinicalNote.findUnique({ where: { id: clinicalNoteId as string } });
        if (!note) throw new Error('Catatan klinis tidak ditemukan');

        await prisma.clinicalNoteAmendment.create({
          data: {
            clinicalNoteId,
            amendedById: userId!,
            reason,
            previousData: note,
            amendedAt: new Date(),
          },
        });
      }

      const updatedRecord = await prisma.medicalRecord.update({
        where: { id },
        data: { status: 'AMENDED' },
        include: {
          patient: { select: { fullName: true } },
          doctor: { include: { user: { select: { fullName: true } } } },
          ...(clinicalNoteId
            ? { clinicalNotes: { where: { id: clinicalNoteId } } }
            : {}),
        },
      });

      await auditService.log({
        userId,
        action: 'MEDICAL_RECORD_AMENDED',
        entity: 'MedicalRecord',
        entityId: record.id,
        ipAddress,
        userAgent,
        metadata: { reason, previousStatus: record.status, newStatus: 'AMENDED' },
      });

      sendSuccess(res, updatedRecord);
    } catch (err: any) {
      sendError(res, 'AMEND_FAILED', err.message, 400);
    }
  },

  async addClinicalNote(req: Request, res: Response): Promise<void> {
    try {
      const data = createClinicalNoteSchema.parse(req.body);
      const { medicalRecordId } = req.body;

      const note = await prisma.clinicalNote.create({
        data: {
          ...data,
          authorId: req.user!.id,
        },
        include: {
          medicalRecord: true,
          author: true,
        },
      });

      await auditService.log({
        action: 'CLINICAL_NOTE_CREATED',
        entity: 'ClinicalNote',
        entityId: note.id,
        userId: req.user!.id,
        metadata: { medicalRecordId },
      });

      sendSuccess(res, note, 201);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        sendError(res, 'VALIDATION_ERROR', 'Validasi gagal', 400, err.errors);
      } else {
        sendError(res, 'ERROR', err.message, 400);
      }
    }
  },
};