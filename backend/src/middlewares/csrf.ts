import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { sendError } from '../utils/response.js';

export const getCsrfToken = (req: Request): string => {
  if (!req.session.csrfSecret) {
    req.session.csrfSecret = crypto.randomBytes(32).toString('hex');
  }
  return req.session.csrfSecret;
};

export const verifyCsrf = (req: Request, res: Response, next: NextFunction): void => {
  // Safe HTTP methods don't mutate state
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(req.method)) {
    next();
    return;
  }

  // Login endpoint is exempt because session is not established yet
  if (req.path === '/api/v1/auth/login') {
    next();
    return;
  }

  const clientToken = req.headers['x-csrf-token'] as string | undefined;
  const sessionToken = req.session?.csrfSecret;

  if (!clientToken || !sessionToken || clientToken !== sessionToken) {
    sendError(res, 'CSRF_INVALID', 'Token CSRF tidak valid atau tidak disertakan', 403);
    return;
  }

  next();
};
