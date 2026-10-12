import { Request, Response } from 'express';
import { prisma } from '../../config/prisma.js';
import { z } from 'zod';
import { sendSuccess, sendError } from '../../utils/response.js';

const createMedicationSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(3),
  category: z.string().min(1),
  dosageForm: z.string().min(1),
  unit: z.string().min(1),
  minStock: z.number().int().min(0).optional(),
  pricePerUnit: z.number().positive(),
});

const createPrescriptionSchema = z.object({
  medicalRecordId: z.string().uuid(),
  items: z.array(
    z.object({
      medicationId: z.string().uuid(),
      dosage: z.string().min(1),
      quantity: z.number().int().min(1),
    })
  ).min(1),
});

export const pharmacyController = {
  async listMedications(req: Request, res: Response): Promise<void> {
    const page = Math.max(parseInt(req.query.page as string) || 1, 1);
    const limit = Math.max(parseInt(req.query.limit as string) || 10, 1);
    const skip = (page - 1) * limit;

    const where: any = {};
    if (req.query.search) {
      where.OR = [
        { name: { contains: req.query.search as string, mode: 'insensitive' } },
        { code: { contains: req.query.search as string, mode: 'insensitive' } },
        { category: { contains: req.query.search as string, mode: 'insensitive' } },
      ];
    }

    const [total, medications] = await Promise.all([
      prisma.medication.count({ where }),
      prisma.medication.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        include: { batches: true },
      }),
    ]);

    sendSuccess(res, medications, 200, { page, limit, total, totalPages: Math.ceil(total / limit) });
  },

  async createMedication(req: Request, res: Response): Promise<void> {
    try {
      const data = createMedicationSchema.parse(req.body);
      const medication = await prisma.medication.create({
        data,
      });
      sendSuccess(res, medication, 201);
    } catch (err: any) {
      sendError(res, 'MEDICATION_CREATE_FAILED', err.message, 400);
    }
  },

  async listPrescriptions(req: Request, res: Response): Promise<void> {
    const page = Math.max(parseInt(req.query.page as string) || 1, 1);
    const limit = Math.max(parseInt(req.query.limit as string) || 10, 1);
    const skip = (page - 1) * limit;

    const where: any = {};
    if (req.query.status) {
      where.status = req.query.status;
    }

    const [total, prescriptions] = await Promise.all([
      prisma.prescription.count({ where }),
      prisma.prescription.findMany({
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
              medication: { select: { id: true, name: true, unit: true } },
            },
          },
        },
      }),
    ]);

    sendSuccess(res, prescriptions, 200, { page, limit, total, totalPages: Math.ceil(total / limit) });
  },

  async createPrescription(req: Request, res: Response): Promise<void> {
    try {
      const data = createPrescriptionSchema.parse(req.body);
      const rxNumber = `RX-${Date.now()}`;

      // Ambil harga obat & kalkulasi total dalam transaksi
      const prescription = await prisma.$transaction(async (tx) => {
        // Cek stok tidak negatif
        for (const item of data.items) {
          const med = await tx.medication.findUnique({ where: { id: item.medicationId } });
          if (!med) throw new Error(`Obat tidak ditemukan: ${item.medicationId}`);
          if (med.currentStock < item.quantity) {
            throw new Error(`Stok tidak mencukupi untuk obat ${med.name}. Stok tersedia: ${med.currentStock}`);
          }
        }

        // Buat resep dengan batch yang tersedia (FIFO)
        const created = await tx.prescription.create({
          data: {
            rxNumber,
            medicalRecordId: data.medicalRecordId,
            status: 'PENDING',
            items: {
              create: await Promise.all(
                data.items.map(async (item) => {
                  const med = await tx.medication.findUnique({ where: { id: item.medicationId } });
                  const unitPrice = Number(med!.pricePerUnit);
                  return {
                    medicationId: item.medicationId,
                    dosage: item.dosage,
                    quantity: item.quantity,
                    pricePerUnit: unitPrice,
                    totalPrice: unitPrice * item.quantity,
                  };
                })
              ),
            },
          },
          include: { items: true },
        });

        // Kurangi stok & catat pergerakan stok untuk tiap item
        for (const item of data.items) {
          const med = await tx.medication.findUnique({ where: { id: item.medicationId } });
          const newStock = med!.currentStock - item.quantity;

          await tx.medication.update({
            where: { id: item.medicationId },
            data: { currentStock: newStock },
          });

          await tx.stockMovement.create({
            data: {
              medicationId: item.medicationId,
              type: 'DISPENSE',
              quantity: item.quantity,
              balanceAfter: newStock,
              referenceNumber: rxNumber,
              notes: `Penyerahan resep ${rxNumber}`,
              performedBy: req.user!.id,
            },
          });
        }

        return created;
      });

      sendSuccess(res, prescription, 201);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        sendError(res, 'VALIDATION_ERROR', 'Validasi gagal', 400, err.errors);
      } else {
        sendError(res, 'PRESCRIPTION_FAILED', err.message, 400);
      }
    }
  },

  async updatePrescriptionStatus(req: Request, res: Response): Promise<void> {
    try {
      const { status } = z.object({
        status: z.enum(['PENDING', 'PROCESSING', 'DISPENSED', 'CANCELLED']),
      }).parse(req.body);

      const prescription = await prisma.prescription.update({
        where: { id: req.params.id },
        data: {
          status,
          ...(status === 'DISPENSED'
            ? { dispensedAt: new Date(), dispensedBy: req.user!.id }
            : {}),
        },
      });

      sendSuccess(res, prescription);
    } catch (err: any) {
      sendError(res, 'PRESCRIPTION_FAILED', err.message, 400);
    }
  },
};