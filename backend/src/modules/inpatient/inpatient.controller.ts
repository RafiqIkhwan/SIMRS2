import { Request, Response } from 'express';
import { prisma } from '../../config/prisma.js';
import { z } from 'zod';
import { sendSuccess, sendError } from '../../utils/response.js';
import { auditService } from '../audit/audit.service.js';

const createAdmissionSchema = z.object({
  patientId: z.string().uuid(),
  bedId: z.string().uuid(),
  admitDiagnosis: z.string().min(3, 'Diagnosis masuk wajib diisi'),
});

const dischargeSchema = z.object({
  dischargeReason: z.string().min(3, 'Alasan pemulangan wajib diisi'),
});

export const inpatientController = {
  async list(req: Request, res: Response): Promise<void> {
    const page = Math.max(parseInt(req.query.page as string) || 1, 1);
    const limit = Math.max(parseInt(req.query.limit as string) || 10, 1);
    const skip = (page - 1) * limit;

    const where: any = {};
    if (req.query.search) {
      where.OR = [
        { patient: { fullName: { contains: req.query.search as string, mode: 'insensitive' } } },
        { admissionNumber: { contains: req.query.search as string, mode: 'insensitive' } },
      ];
    }

    const [total, admissions] = await Promise.all([
      prisma.admission.count({ where }),
      prisma.admission.findMany({
        where,
        skip,
        take: limit,
        orderBy: { admittedAt: 'desc' },
        include: {
          patient: { select: { id: true, fullName: true, medicalRecordNumber: true } },
          bed: { include: { room: { include: { ward: true } } } },
        },
      }),
    ]);

    sendSuccess(res, admissions, 200, { page, limit, total, totalPages: Math.ceil(total / limit) });
  },

  async create(req: Request, res: Response): Promise<void> {
    try {
      const data = createAdmissionSchema.parse(req.body);
      const { userId, ipAddress, userAgent } = req;

      const admissionNumber = `ADM-${Date.now()}`;

      // Transaksi atomik untuk cegah double-booking bed
      const admission = await prisma.$transaction(async (tx) => {
        const bed = await tx.bed.findUnique({
          where: { id: data.bedId },
          include: { admissions: { where: { status: 'ADMITTED' } } },
        });

        if (!bed) throw new Error('Tempat tidur tidak ditemukan');
        if (bed.status !== 'AVAILABLE') {
          throw new Error(`Tempat tidur tidak tersedia. Status: ${bed.status}`);
        }

        const newAdmission = await tx.admission.create({
          data: {
            admissionNumber,
            patientId: data.patientId,
            bedId: data.bedId,
            status: 'ADMITTED',
            admitDiagnosis: data.admitDiagnosis,
          },
          include: {
            patient: { select: { fullName: true, medicalRecordNumber: true } },
          },
        });

        await tx.bed.update({
          where: { id: data.bedId },
          data: { status: 'OCCUPIED' },
        });

        return newAdmission;
      });

      await auditService.log({
        userId,
        action: 'ADMISSION_CREATED',
        entity: 'Admission',
        entityId: admission.id,
        ipAddress,
        userAgent,
        metadata: { admissionNumber, bedId: data.bedId },
      });

      sendSuccess(res, admission, 201);
    } catch (err: any) {
      sendError(res, 'ADMISSION_FAILED', err.message, 400);
    }
  },

  async discharge(req: Request, res: Response): Promise<void> {
    try {
      const { dischargeReason } = dischargeSchema.parse(req.body);
      const { id } = req.params;
      const { userId, ipAddress, userAgent } = req;

      const admission = await prisma.admission.findUnique({
        where: { id },
        include: { bed: true },
      });

      if (!admission) throw new Error('Admisi tidak ditemukan');
      if (admission.status === 'DISCHARGED') throw new Error('Pasien sudah dipulangkan');

      await prisma.$transaction(async (tx) => {
        await tx.admission.update({
          where: { id },
          data: {
            status: 'DISCHARGED',
            dischargedAt: new Date(),
            dischargeReason,
          },
        });

        await tx.bed.update({
          where: { id: admission.bedId },
          data: { status: 'CLEANING' },
        });
      });

      await auditService.log({
        userId,
        action: 'PATIENT_DISCHARGED',
        entity: 'Admission',
        entityId: admission.id,
        ipAddress,
        userAgent,
        metadata: { dischargeReason },
      });

      sendSuccess(res, { message: 'Pasien berhasil dipulangkan' });
    } catch (err: any) {
      sendError(res, 'DISCHARGE_FAILED', err.message, 400);
    }
  },
};