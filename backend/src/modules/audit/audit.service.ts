import { prisma } from '../../config/prisma.js';
import { logger } from '../../utils/logger.js';

interface AuditLogParams {
  userId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown> | null;
}

const sanitizeMetadata = (
  meta?: Record<string, unknown> | null
): Record<string, unknown> | null => {
  if (!meta) return null;

  const sensitiveKeys = [
    'password',
    'passwordHash',
    'token',
    'secret',
    'session',
    'medicalRecordContent',
    'clinicalNotes',
    'nik',
    'nationalIdNumber',
  ];

  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(meta)) {
    if (sensitiveKeys.some((s) => key.toLowerCase().includes(s.toLowerCase()))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeMetadata(value as Record<string, unknown>);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
};

export const auditService = {
  async log(params: AuditLogParams): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          userId: params.userId ?? null,
          action: params.action,
          entity: params.entity,
          entityId: params.entityId ?? null,
          ipAddress: params.ipAddress ?? null,
          userAgent: params.userAgent ?? null,
          metadata: (sanitizeMetadata(params.metadata) as any) ?? undefined,
        },
      });
    } catch (err) {
      // Audit failure must never crash the main transaction, but must be logged
      logger.error('Gagal mencatat audit log:', err, { action: params.action });
    }
  },
};
