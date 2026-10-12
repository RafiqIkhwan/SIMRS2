import { Request, Response } from 'express';
import { prisma } from '../../config/prisma.js';
import { z } from 'zod';
import { sendSuccess, sendError } from '../../utils/response.js';

const createQueueSchema = z.object({
  patientId: z.string().uuid('ID pasien tidak valid'),
  clinicId: z.string().uuid('ID klinik tidak valid'),
  doctorId: z.string().uuid('ID dokter tidak valid'),
  complaint: z.string().min(3, 'Keluhan wajib diisi').optional(),
});

export const registrationController = {
  async createQueue(req: Request, res: Response): Promise<void> {
    try {
      const data = createQueueSchema.parse(req.body);

      const queue = await prisma.$transaction(async (tx) => {
        // Validasi pasien aktif
        const patient = await tx.patient.findUnique({ where: { id: data.patientId } });
        if (!patient) throw new Error('Pasien tidak ditemukan');
        if (!patient.isActive) throw new Error('Pasien tidak aktif');

        // Validasi klinik & jadwal dokter aktif hari ini
        const today = new Date();
        const dayOfWeek = today.getDay();
        const schedule = await tx.doctorSchedule.findFirst({
          where: {
            doctorId: data.doctorId,
            clinicId: data.clinicId,
            dayOfWeek,
            isActive: true,
          },
        });
        if (!schedule) {
          throw new Error('Jadwal praktik dokter tidak aktif hari ini');
        }

        // Cek apakah pasien sudah memiliki antrean aktif di poli ini
        const existingActive = await tx.queue.findFirst({
          where: {
            patientId: data.patientId,
            clinicId: data.clinicId,
            queueDate: today,
            status: { in: ['REGISTERED', 'WAITING', 'CALLED', 'IN_SERVICE'] },
          },
        });
        if (existingActive) {
          throw new Error('Pasien sudah memiliki antrean aktif di poli ini');
        }

        // Generate nomor antrean unik (clinicId, queueDate, queueNumber)
        const lastQueue = await tx.queue.findFirst({
          where: { clinicId: data.clinicId, queueDate: today },
          orderBy: { queueNumber: 'desc' },
          select: { queueNumber: true },
        });
        const nextNumber = (lastQueue?.queueNumber ?? 0) + 1;

        const clinic = await tx.clinic.findUnique({
          where: { id: data.clinicId },
          select: { code: true },
        });
        const formattedCode = `${clinic?.code ?? 'POLI'}-${String(nextNumber).padStart(3, '0')}`;

        const queue = await tx.queue.create({
          data: {
            queueDate: today,
            queueNumber: nextNumber,
            formattedCode,
            clinicId: data.clinicId,
            doctorId: data.doctorId,
            patientId: data.patientId,
            status: 'REGISTERED',
            complaint: data.complaint,
          },
          include: {
            patient: { select: { fullName: true, medicalRecordNumber: true } },
            doctor: { include: { user: { select: { fullName: true } } } },
            clinic: { select: { name: true } },
          },
        });

        return queue;
      });

      sendSuccess(res, queue, 201);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        sendError(res, 'VALIDATION_ERROR', 'Validasi gagal', 400, err.errors);
      } else {
        sendError(res, 'QUEUE_CREATE_FAILED', err.message, 400);
      }
    }
  },

  async getQueues(req: Request, res: Response): Promise<void> {
    try {
      const page = Math.max(parseInt(req.query.page as string) || 1, 1);
      const limit = Math.max(parseInt(req.query.limit as string) || 10, 1);
      const skip = (page - 1) * limit;

      const today = new Date();
      const where: any = { queueDate: today };

      if (req.query.clinicId) where.clinicId = req.query.clinicId;
      if (req.query.doctorId) where.doctorId = req.query.doctorId;
      if (req.query.status) where.status = req.query.status;

      const [total, queues] = await Promise.all([
        prisma.queue.count({ where }),
        prisma.queue.findMany({
          where,
          skip,
          take: limit,
          orderBy: [{ queueNumber: 'asc' }],
          include: {
            patient: { select: { id: true, fullName: true, medicalRecordNumber: true } },
            doctor: { include: { user: { select: { fullName: true } } } },
            clinic: { select: { name: true } },
          },
        }),
      ]);

      sendSuccess(res, queues, 200, { page, limit, total, totalPages: Math.ceil(total / limit) });
    } catch (err: any) {
      sendError(res, 'QUEUE_FETCH_FAILED', err.message, 500);
    }
  },

  async updateQueueStatus(req: Request, res: Response): Promise<void> {
    try {
      const { status } = z.object({
        status: z.enum(['REGISTERED', 'WAITING', 'CALLED', 'IN_SERVICE', 'COMPLETED', 'CANCELLED']),
      }).parse(req.body);

      const queue = await prisma.queue.update({
        where: { id: req.params.id },
        data: {
          status,
          ...(status === 'CALLED' ? { calledAt: new Date() } : {}),
          ...(status === 'IN_SERVICE' ? { servedAt: new Date() } : {}),
          ...(status === 'COMPLETED' ? { completedAt: new Date() } : {}),
        },
        include: {
          patient: { select: { fullName: true, medicalRecordNumber: true } },
          doctor: { include: { user: { select: { fullName: true } } } },
          clinic: { select: { name: true } },
        },
      });

      sendSuccess(res, queue);
    } catch (err: any) {
      sendError(res, 'QUEUE_UPDATE_FAILED', err.message, 400);
    }
  },
};