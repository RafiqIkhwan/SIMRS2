import { Request, Response } from 'express';
import { prisma } from '../../config/prisma.js';
import { z } from 'zod';
import { sendSuccess, sendError } from '../../utils/response.js';
import { auditService } from '../audit/audit.service.js';

const createInvoiceSchema = z.object({
  patientId: z.string().uuid(),
  medicalRecordId: z.string().uuid().optional(),
  items: z
    .array(
      z.object({
        itemType: z.enum(['ACTION', 'MEDICATION', 'LAB', 'BED']),
        description: z.string().min(3),
        quantity: z.number().int().min(1).default(1),
        unitPrice: z.number().positive(),
      })
    )
    .min(1),
});

const paymentSchema = z.object({
  amount: z.number().positive('Jumlah pembayaran harus lebih dari 0'),
  paymentMethod: z.enum(['CASH', 'DEBIT_CARD', 'CREDIT_CARD', 'BANK_TRANSFER', 'BPJS', 'INSURANCE']),
  notes: z.string().optional(),
});

export const billingController = {
  async listInvoices(req: Request, res: Response): Promise<void> {
    const page = Math.max(parseInt(req.query.page as string) || 1, 1);
    const limit = Math.max(parseInt(req.query.limit as string) || 10, 1);
    const skip = (page - 1) * limit;

    const where: any = {};
    if (req.query.status) where.status = req.query.status;
    if (req.query.patientId) where.patientId = req.query.patientId;

    const [total, invoices] = await Promise.all([
      prisma.invoice.count({ where }),
      prisma.invoice.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          patient: { select: { id: true, fullName: true, medicalRecordNumber: true } },
          items: true,
          payments: true,
        },
      }),
    ]);

    sendSuccess(res, invoices, 200, { page, limit, total, totalPages: Math.ceil(total / limit) });
  },

  async createInvoice(req: Request, res: Response): Promise<void> {
    try {
      const data = createInvoiceSchema.parse(req.body);
      const invoiceNumber = `INV-${Date.now()}`;

      const totalAmount = data.items.reduce(
        (sum, item) => sum + item.quantity * item.unitPrice,
        0
      );

      const invoice = await prisma.invoice.create({
        data: {
          invoiceNumber,
          patientId: data.patientId,
          medicalRecordId: data.medicalRecordId,
          totalAmount: totalAmount,
          paidAmount: 0,
          status: 'UNPAID',
          items: {
            create: data.items.map((item) => ({
              itemType: item.itemType,
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              subtotal: item.quantity * item.unitPrice,
            })),
          },
        },
        include: { items: true },
      });

      await auditService.log({
        userId: req.user!.id,
        action: 'INVOICE_CREATED',
        entity: 'Invoice',
        entityId: invoice.id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        metadata: { invoiceNumber, totalAmount },
      });

      sendSuccess(res, invoice, 201);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        sendError(res, 'VALIDATION_ERROR', 'Validasi gagal', 400, err.errors);
      } else {
        sendError(res, 'INVOICE_FAILED', err.message, 400);
      }
    }
  },

  async recordPayment(req: Request, res: Response): Promise<void> {
    try {
      const { amount, paymentMethod, notes } = paymentSchema.parse(req.body);
      const invoiceId = req.params.id;

      const invoice = await prisma.invoice.findUnique({
        where: { id: invoiceId },
        include: { payments: true },
      });

      if (!invoice) throw new Error('Tagihan tidak ditemukan');
      if (['CANCELLED', 'REFUNDED'].includes(invoice.status)) {
        throw new Error('Tagihan tidak dapat dibayar. Status: ' + invoice.status);
      }

      const outstanding = Number(invoice.totalAmount) - Number(invoice.paidAmount);
      if (amount > outstanding) {
        throw new Error(`Jumlah pembayaran melebihi sisa tagihan. Sisa: Rp ${outstanding.toLocaleString('id-ID')}`);
      }

      const receiptNumber = `RCP-${Date.now()}`;

      await prisma.$transaction(async (tx) => {
        await tx.payment.create({
          data: {
            receiptNumber,
            invoiceId,
            amount,
            paymentMethod,
            cashierId: req.user!.id,
            notes,
          },
        });

        const newPaid = Number(invoice.paidAmount) + amount;
        const newStatus =
          newPaid >= Number(invoice.totalAmount) ? 'PAID' : 'PARTIALLY_PAID';

        await tx.invoice.update({
          where: { id: invoiceId },
          data: {
            paidAmount: newPaid,
            status: newStatus,
          },
        });

        return newPaid;
      });

      await auditService.log({
        userId: req.user!.id,
        action: 'PAYMENT_RECORDED',
        entity: 'Payment',
        entityId: receiptNumber,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        metadata: { invoiceId, amount, paymentMethod, receiptNumber },
      });

      sendSuccess(res, { message: 'Pembayaran berhasil dicatat', receiptNumber });
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        sendError(res, 'VALIDATION_ERROR', 'Validasi gagal', 400, err.errors);
      } else {
        sendError(res, 'PAYMENT_FAILED', err.message, 400);
      }
    }
  },
};