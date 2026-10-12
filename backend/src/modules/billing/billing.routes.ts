import { Router } from 'express';
import { billingController } from './billing.controller.js';
import { requireAuth } from '../../middlewares/auth.js';
import { requireRole } from '../../middlewares/rbac.js';

const router = Router();

router.use(requireAuth);

router.get(
  '/invoices',
  requireRole('SUPER_ADMIN', 'HOSPITAL_ADMIN', 'CASHIER'),
  billingController.listInvoices
);

router.post(
  '/invoices',
  requireRole('SUPER_ADMIN', 'HOSPITAL_ADMIN', 'CASHIER'),
  billingController.createInvoice
);

router.post(
  '/invoices/:id/payments',
  requireRole('SUPER_ADMIN', 'HOSPITAL_ADMIN', 'CASHIER'),
  billingController.recordPayment
);

export default router;
