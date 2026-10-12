import { Request, Response } from 'express';
import { prisma } from '../../config/prisma.js';
import { sendSuccess, sendError } from '../../utils/response.js';

export const reportsController = {
  async dashboard(_req: Request, res: Response): Promise<void> {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

    const [
      todayVisits,
      totalPatients,
      waitingQueue,
      admittedPatients,
      beds,
      pendingPrescriptions,
      pendingLabOrders,
      unpaidInvoices,
    ] = await Promise.all([
      prisma.queue.count({ where: { queueDate: { gte: startOfDay, lte: endOfDay } } }),
      prisma.patient.count({ where: { isActive: true } }),
      prisma.queue.count({ where: { status: { in: ['REGISTERED', 'WAITING', 'CALLED', 'IN_SERVICE'] } } }),
      prisma.admission.count({ where: { status: 'ADMITTED' } }),
      prisma.bed.count(),
      prisma.prescription.count({ where: { status: { in: ['PENDING', 'PROCESSING'] } } }),
      prisma.labOrder.count({ where: { status: { in: ['PENDING', 'SAMPLE_COLLECTED', 'IN_PROGRESS'] } } }),
      prisma.invoice.count({ where: { status: { in: ['UNPAID', 'PARTIALLY_PAID'] } } }),
    ]);

    const availableBeds = await prisma.bed.count({ where: { status: 'AVAILABLE' } });

    sendSuccess(res, {
      todayVisits,
      totalPatients,
      waitingQueue,
      admittedPatients,
      bedsAvailable: availableBeds,
      bedsTotal: beds,
      pendingPrescriptions,
      pendingLabOrders,
      unpaidInvoices,
    });
  },

  async visits(req: Request, res: Response): Promise<void> {
    const { start, end } = req.query;

    const where: any = {};
    if (start || end) {
      where.queueDate = {};
      if (start) where.queueDate.gte = new Date(start as string);
      if (end) where.queueDate.lte = new Date(end as string);
    }

    const visits = await prisma.queue.groupBy({
      by: ['queueDate'],
      _count: { _all: true },
      where,
      orderBy: { queueDate: 'asc' },
      take: 30,
    });

    sendSuccess(res,
      visits.map((v) => ({
        date: v.queueDate.toISOString().split('T')[0],
        count: v._count._all,
      }))
    );
  },

  async revenue(_req: Request, res: Response): Promise<void> {
    const invoices = await prisma.invoice.findMany({
      where: { status: { not: 'CANCELLED' } },
      include: {
        items: true,
        payments: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const rows = invoices.map((inv) => {
      const byType: Record<string, number> = {};
      inv.items.forEach((item) => {
        byType[item.itemType] = (byType[item.itemType] ?? 0) + Number(item.subtotal);
      });
      const totalPaid = inv.payments.reduce((sum, p) => sum + Number(p.amount), 0);
      return {
        invoiceNumber: inv.invoiceNumber,
        period: inv.createdAt.toISOString().split('T')[0],
        medical: byType['ACTION'] ?? 0,
        medication: byType['MEDICATION'] ?? 0,
        lab: byType['LAB'] ?? 0,
        inpatient: byType['BED'] ?? 0,
        total: Number(inv.totalAmount),
        paid: totalPaid,
        outstanding: Number(inv.totalAmount) - totalPaid,
        status: inv.status,
      };
    });

    sendSuccess(res, rows);
  },
};
