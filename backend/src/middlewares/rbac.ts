import { Request, Response, NextFunction } from 'express';
import { RoleName } from '@prisma/client';
import { sendError } from '../utils/response.js';

export const requireRole = (...allowedRoles: RoleName[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendError(res, 'UNAUTHORIZED', 'Autentikasi diperlukan', 401);
      return;
    }

    const hasRole = req.user.roles.some((role) =>
      allowedRoles.includes(role as RoleName)
    );

    if (!hasRole) {
      sendError(
        res,
        'FORBIDDEN',
        'Anda tidak memiliki peran yang diizinkan untuk operasi ini',
        403
      );
      return;
    }

    next();
  };
};

export const requirePermission = (permissionCode: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendError(res, 'UNAUTHORIZED', 'Autentikasi diperlukan', 401);
      return;
    }

    // Super Admin has full bypass
    if (req.user.roles.includes('SUPER_ADMIN')) {
      next();
      return;
    }

    const hasPermission = req.user.permissions.includes(permissionCode);
    if (!hasPermission) {
      sendError(
        res,
        'FORBIDDEN',
        `Izin akses '${permissionCode}' ditolak`,
        403
      );
      return;
    }

    next();
  };
};

export const requireAnyPermission = (...permissionCodes: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendError(res, 'UNAUTHORIZED', 'Autentikasi diperlukan', 401);
      return;
    }

    if (req.user.roles.includes('SUPER_ADMIN')) {
      next();
      return;
    }

    const hasAny = permissionCodes.some((code) =>
      req.user!.permissions.includes(code)
    );

    if (!hasAny) {
      sendError(
        res,
        'FORBIDDEN',
        'Izin akses untuk operasi ini ditolak',
        403
      );
      return;
    }

    next();
  };
};
