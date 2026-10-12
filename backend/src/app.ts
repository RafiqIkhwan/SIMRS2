import express, { Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { env } from './config/env.js';
import { sessionMiddleware } from './config/session.js';
import { verifyCsrf } from './middlewares/csrf.js';
import { apiRateLimiter } from './middlewares/rateLimiter.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { sendSuccess, sendError } from './utils/response.js';

// Import Routes
import authRoutes from './modules/auth/auth.routes.js';
import usersRoutes from './modules/users/users.routes.js';
import masterRoutes from './modules/master/master.routes.js';
import patientsRoutes from './modules/patients/patients.routes.js';
import auditRoutes from './modules/audit/audit.routes.js';
import registrationRoutes from './modules/registration/registration.routes.js';
import appointmentsRoutes from './modules/appointments/appointments.routes.js';
import medicalRecordsRoutes from './modules/medical-records/medical-records.routes.js';
import pharmacyRoutes from './modules/pharmacy/pharmacy.routes.js';
import laboratoryRoutes from './modules/laboratory/laboratory.routes.js';
import billingRoutes from './modules/billing/billing.routes.js';
import reportsRoutes from './modules/reports/reports.routes.js';
import inpatientRoutes from './modules/inpatient/inpatient.routes.js';

const app = express();

// Security Headers via Helmet
app.use(
  helmet({
    contentSecurityPolicy: false, // Diserahkan ke frontend bundler / proxy
  })
);

// Strict CORS with credentials
app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  })
);

// Body parser with size limits
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Session Store Middleware
app.use(sessionMiddleware);

// CSRF Protection
app.use(verifyCsrf);

// Global Rate Limiter
app.use('/api', apiRateLimiter);

// Health check endpoint
app.get('/api/v1/health', (_req: Request, res: Response) => {
  sendSuccess(res, {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Modular Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', usersRoutes);
app.use('/api/v1/master', masterRoutes);
app.use('/api/v1/patients', patientsRoutes);
app.use('/api/v1/audit-logs', auditRoutes);
app.use('/api/v1/registration', registrationRoutes);
app.use('/api/v1/appointments', appointmentsRoutes);
app.use('/api/v1/medical-records', medicalRecordsRoutes);
app.use('/api/v1/pharmacy', pharmacyRoutes);
app.use('/api/v1/laboratory', laboratoryRoutes);
app.use('/api/v1/billing', billingRoutes);
app.use('/api/v1/reports', reportsRoutes);
app.use('/api/v1/inpatient', inpatientRoutes);

// 404 Handler
app.use((req: Request, res: Response) => {
  sendError(res, 'ROUTE_NOT_FOUND', `Rute ${req.method} ${req.path} tidak ditemukan`, 404);
});

// Centralized Error Handler
app.use(errorHandler);

export default app;
