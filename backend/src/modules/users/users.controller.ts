import { Request, Response } from 'express';
import { usersService } from './users.service.js';
import { auditService } from '../audit/audit.service.js';
import { sendSuccess, sendError } from '../../utils/response.js';

export const usersController = {
async list(req: Request, res: Response): Promise<void> {
  const result = await usersService.listUsers(req.query as any);
  sendSuccess(res, result.users, 200, result.meta);
},

  async getById(req: Request, res: Response): Promise<void> {
    const user = await usersService.getUserById(req.params.id as string);
    if (!user) {
      sendError(res, 'NOT_FOUND', 'Pengguna tidak ditemukan', 404);
      return;
    }
    sendSuccess(res, user);
  },

  async create(req: Request, res: Response): Promise<void> {
    try {
      const user = await usersService.createUser(req.body);

      await auditService.log({
        userId: req.user!.id,
        action: 'USER_CREATE',
        entity: 'User',
        entityId: user.id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        metadata: { username: user.username, email: user.email },
      });

      sendSuccess(res, user, 201);
    } catch (err: any) {
      sendError(res, 'USER_CREATE_FAILED', err.message, 400);
    }
  },

  async update(req: Request, res: Response): Promise<void> {
    try {
      const user = await usersService.updateUser(req.params.id as string, req.body);

      await auditService.log({
        userId: req.user!.id,
        action: 'USER_UPDATE',
        entity: 'User',
        entityId: user.id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        metadata: { updatedFields: Object.keys(req.body) },
      });

      sendSuccess(res, user);
    } catch (err: any) {
      sendError(res, 'USER_UPDATE_FAILED', err.message, 400);
    }
  },

  async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      await usersService.resetPassword(req.params.id as string, req.body);

      await auditService.log({
        userId: req.user!.id,
        action: 'USER_PASSWORD_RESET',
        entity: 'User',
        entityId: req.params.id as string,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      sendSuccess(res, { message: 'Kata sandi pengguna berhasil direset' });
    } catch (err: any) {
      sendError(res, 'RESET_PASSWORD_FAILED', err.message, 400);
    }
  },
};
