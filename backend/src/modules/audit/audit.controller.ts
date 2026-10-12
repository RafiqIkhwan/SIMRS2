import { Request, Response } from 'express';
import { prisma } from '../../config/prisma.js';
import { sendSuccess } from '../../utils/response.js';

export const auditController = {
  async list(req: Request, res: Response): Promise<void> {
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (req.query.action) {
      where.action = req.query.action as string;
    }
    if (req.query.entity) {
      where.entity = req.query.entity as string;
    }
    if (req.query.userId) {
      where.userId = req.query.userId as string;
    }

    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              username: true,
              fullName: true,
            },
          },
        },
      }),
    ]);

    sendSuccess(res, logs, 200, {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  },
};
