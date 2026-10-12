import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma.js';
import { sendError } from '../utils/response.js';

export interface AuthenticatedUser {
  id: string;
  username: string;
  email: string;
  fullName: string;
  roles: string[];
  permissions: string[];
  doctorId?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const userId = req.session?.userId;

  if (!userId) {
    sendError(res, 'UNAUTHORIZED', 'Sesi login tidak valid atau telah berakhir', 401);
    return;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        isActive: true,
        roles: {
          select: {
            role: {
              select: {
                name: true,
                permissions: {
                  select: {
                    permission: {
                      select: {
                        code: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        doctor: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!user || !user.isActive) {
      req.session.destroy(() => {});
      sendError(
        res,
        'ACCOUNT_INACTIVE',
        'Akun tidak aktif atau tidak ditemukan',
        401
      );
      return;
    }

    const roleNames = user.roles.map((r) => r.role.name as string);
    const permissionSet = new Set<string>();
    user.roles.forEach((r) => {
      r.role.permissions.forEach((p) => {
        permissionSet.add(p.permission.code);
      });
    });

    req.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      roles: roleNames,
      permissions: Array.from(permissionSet),
      doctorId: user.doctor?.id,
    };

    next();
  } catch (error) {
    next(error);
  }
};
