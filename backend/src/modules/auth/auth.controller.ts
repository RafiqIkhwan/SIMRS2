import { Request, Response } from 'express';
import { authService } from './auth.service.js';
import { auditService } from '../audit/audit.service.js';
import { getCsrfToken } from '../../middlewares/csrf.js';
import { sendSuccess, sendError } from '../../utils/response.js';

export const authController = {
  async login(req: Request, res: Response): Promise<void> {
    const authResult = await authService.authenticateUser(req.body);

    if (!authResult || !authResult.user) {
      if (authResult?.inactive) {
        sendError(res, 'ACCOUNT_INACTIVE', 'Akun telah dinonaktifkan oleh administrator', 403);
        return;
      }

      await auditService.log({
        action: 'AUTH_LOGIN_FAILED',
        entity: 'User',
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        metadata: { attemptedUsername: req.body.username },
      });

      sendError(res, 'INVALID_CREDENTIALS', 'Username atau kata sandi salah', 401);
      return;
    }

    const authUser = authResult.user;

    // Session fixation protection: regenerate session ID on login
    req.session.regenerate(async (err) => {
      if (err) {
        sendError(res, 'SESSION_ERROR', 'Gagal membuat sesi baru', 500);
        return;
      }

      req.session.userId = authUser.id;
      req.session.username = authUser.username;
      req.session.roles = authUser.roles;
      req.session.permissions = authUser.permissions;
      const csrfToken = getCsrfToken(req);

      await auditService.log({
        userId: authUser.id,
        action: 'AUTH_LOGIN_SUCCESS',
        entity: 'User',
        entityId: authUser.id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      sendSuccess(res, {
        user: authUser,
        csrfToken,
      });
    });
  },

  async logout(req: Request, res: Response): Promise<void> {
    const userId = req.session?.userId;

    if (userId) {
      await auditService.log({
        userId,
        action: 'AUTH_LOGOUT',
        entity: 'User',
        entityId: userId,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });
    }

    req.session.destroy((err) => {
      if (err) {
        sendError(res, 'SESSION_DESTROY_ERROR', 'Gagal mengakhiri sesi', 500);
        return;
      }
      res.clearCookie('simrs_sid');
      sendSuccess(res, { message: 'Berhasil keluar' });
    });
  },

  async getMe(req: Request, res: Response): Promise<void> {
    const csrfToken = getCsrfToken(req);
    sendSuccess(res, {
      user: req.user,
      csrfToken,
    });
  },

  async getCsrf(req: Request, res: Response): Promise<void> {
    const csrfToken = getCsrfToken(req);
    sendSuccess(res, { csrfToken });
  },

  async changePassword(req: Request, res: Response): Promise<void> {
    const userId = req.user!.id;
    const isSuccess = await authService.changePassword(userId, req.body);

    if (!isSuccess) {
      sendError(res, 'INVALID_PASSWORD', 'Kata sandi lama tidak cocok', 400);
      return;
    }

    await auditService.log({
      userId,
      action: 'PASSWORD_CHANGED',
      entity: 'User',
      entityId: userId,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    sendSuccess(res, { message: 'Kata sandi berhasil diperbarui' });
  },
};
