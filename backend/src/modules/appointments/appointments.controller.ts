import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma.js';
import { z } from 'zod';
import { sendSuccess, sendError } from '../../utils/response.js';

const createSchema = z.object({
  patientId: z.string().uuid(),
  doctorId: z.string().uuid(),
  scheduledDate: z.string().transform((val) => new Date(val)),
  complaint: z.string().optional(),
});

export const appointmentsController = {
  async list(req: Request, res: Response): Promise<void> {
    const page = Math.max(parseInt(req.query.page as string) || 1, 1);
    const limit = Math.max(parseInt(req.query.limit as string) || 10, 1);
    const skip = (page - 1) * limit;

    const where: any = {};
    if (req.query.search) {
      where.OR = [
        { patient: { fullName: { contains: req.query.search as string, mode: 'insensitive' } } },
        { doctor: { user: { fullName: { contains: req.query.search as string, mode: 'insensitive' } } } },
      ];
    }

    const [total, items] = await Promise.all([
      prisma.appointment.count({ where }),
      prisma.appointment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { scheduledDate: 'desc' },
        include: {
          patient: { select: { id: true, fullName: true, medicalRecordNumber: true } },
          doctor: {
            include: {
              user: { select: { fullName: true } },
              clinic: { select: { name: true } },
            },
          },
        },
      }),
    ]);

    sendSuccess(res, items, 200, { page, limit, total, totalPages: Math.ceil(total / limit) });
  },

  async create(req: Request, res: Response): Promise<void> {
    try {
      const data = createSchema.parse(req.body);
      const item = await prisma.appointment.create({
        data: { ...data, status: 'SCHEDULED' },
        include: {
          patient: { select: { fullName: true } },
          doctor: { include: { user: { select: { fullName: true } } } },
        },
      });
      sendSuccess(res, item, 201);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        sendError(res, 'VALIDATION_ERROR', 'Validasi gagal', 400, err.errors);
      } else {
        sendError(res, 'ERROR', err.message, 400);
      }
    }
  },

  async update(req: Request, res: Response): Promise<void> {
    try {
      const data = createSchema.partial().parse(req.body);
      const item = await prisma.appointment.update({
        where: { id: req.params.id },
        data,
      });
      sendSuccess(res, item);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        sendError(res, 'VALIDATION_ERROR', 'Validasi gagal', 400, err.errors);
      } else {
        sendError(res, 'ERROR', err.message, 400);
      }
    }
  },
};