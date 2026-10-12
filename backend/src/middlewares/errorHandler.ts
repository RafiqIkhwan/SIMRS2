import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';
import { sendError } from '../utils/response.js';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  logger.error(`Unhandled error: ${err.message}`, err, {
    path: req.path,
    method: req.method,
    ip: req.ip,
    userId: req.user?.id,
  });

  const statusCode = (err as { status?: number }).status || 500;
  const isProd = process.env.NODE_ENV === 'production';

  sendError(
    res,
    'INTERNAL_SERVER_ERROR',
    isProd
      ? 'Terjadi kesalahan internal pada server'
      : err.message || 'Terjadi kesalahan internal pada server',
    statusCode
  );
};
