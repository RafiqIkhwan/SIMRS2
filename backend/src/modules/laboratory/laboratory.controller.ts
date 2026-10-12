import { Request, Response } from 'express';
import { prisma } from '../../config/prisma.js';
import { z } from 'zod';
import { sendSuccess, sendError } from '../../utils/response.js';
import { auditService } from '../audit/audit.service.js';

const createOrderSchema = z.object({
  medicalRecordId: z.string().uuid(),
  testTypeIds: z.array(z.string().uuid()).min(1, 'Minimal satu jenis pemeriksaan'),
});

const resultSchema = z.object({
  resultValue: z.string().min(1).max(100),
  isAbnormal: z.boolean().optional(),
  notes: z.string().optional(),
});

const statusSchema = z.object({
  status: z.enum([
    'PENDING',
    'SAMPLE_COLLECTED',
    'IN_PROGRESS',
    'COMPLETED',
    'VALIDATED',
    'CANCELLED',
  ]),
});

export const laboratoryController = {
  async listTestTypes(_req: Request, res: Response): Promise<void> {
    const types = await prisma.labTestType.findMany({ orderBy: { name: 'asc' } });
    sendSuccess(res, types);
  },

  async createOrder(req: Request, res: Response): Promise<void> {
    try {
      const data = createOrderSchema.parse(req.body);
      const orderNumber = `LAB-${Date.now()}`;

      // Ambil harga tiap jenis pemeriksaan
      const testTypes = await prisma.labTestType.findMany({
        where: { id: { in: data.testTypeIds } },
      });
      if (testTypes.length !== data.testTypeIds.length) {
        throw new Error('Ada jenis pemeriksaan yang tidak valid');
      }

      const order = await prisma.$transaction(async (tx) => {
        const created = await tx.labOrder.create({
          data: {
            orderNumber,
            medicalRecordId: data.medicalRecordId,
            status: 'PENDING',
            items: {
              create: testTypes.map((t) => ({
                labTestTypeId: t.id,
                price: t.price,
              })),
            },
          },
          include: {
            items: { include: { labTestType: true } },
          },
        });
        return created;
      });

      await auditService.log({
        userId: req.user!.id,
        action: 'LAB_ORDER_CREATED',
        entity: 'LabOrder',
        entityId: order.id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        metadata: { orderNumber, testCount: testTypes.length },
      });

      sendSuccess(res, order, 201);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        sendError(res, 'VALIDATION_ERROR', 'Validasi gagal', 400, err.errors);
      } else {
        sendError(res, 'LAB_ORDER_FAILED', err.message, 400);
      }
    }
  },

  async listOrders(req: Request, res: Response): Promise<void> {
    const page = Math.max(parseInt(req.query.page as string) || 1, 1);
    const limit = Math.max(parseInt(req.query.limit as string) || 10, 1);
    const skip = (page - 1) * limit;

    const where: any = {};
    if (req.query.status) where.status = req.query.status;

    const [total, orders] = await Promise.all([
      prisma.labOrder.count({ where }),
      prisma.labOrder.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          medicalRecord: {
            include: {
              patient: { select: { fullName: true, medicalRecordNumber: true } },
            },
          },
          items: {
            include: {
              labTestType: true,
              result: true,
            },
          },
        },
      }),
    ]);

    sendSuccess(res, orders, 200, { page, limit, total, totalPages: Math.ceil(total / limit) });
  },

  async updateStatus(req: Request, res: Response): Promise<void> {
    try {
      const { status } = statusSchema.parse(req.body);
      const order = await prisma.labOrder.update({
        where: { id: req.params.id },
        data: {
          status,
          ...(status === 'VALIDATED'
            ? { validatedAt: new Date(), validatedBy: req.user!.id }
            : {}),
        },
        include: { items: true },
      });

      await auditService.log({
        userId: req.user!.id,
        action: 'LAB_ORDER_STATUS_UPDATED',
        entity: 'LabOrder',
        entityId: order.id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        metadata: { newStatus: status },
      });

      sendSuccess(res, order);
    } catch (err: any) {
      sendError(res, 'LAB_STATUS_FAILED', err.message, 400);
    }
  },

  async recordResult(req: Request, res: Response): Promise<void> {
    try {
      const { itemOrder } = req.params;
      const data = resultSchema.parse(req.body);

      const result = await prisma.labResult.create({
        data: {
          labOrderItemId: itemOrder,
          resultValue: data.resultValue,
          isAbnormal: data.isAbnormal ?? false,
          notes: data.notes,
          testedBy: req.user!.id,
        },
      });

      await auditService.log({
        userId: req.user!.id,
        action: 'LAB_RESULT_RECORDED',
        entity: 'LabResult',
        entityId: result.id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      sendSuccess(res, result, 201);
    } catch (err: any) {
      sendError(res, 'LAB_RESULT_FAILED', err.message, 400);
    }
  },
};