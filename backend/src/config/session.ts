import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import { env } from './env.js';

const PgSession = connectPgSimple(session);

export const sessionMiddleware = session({
  store: new PgSession({
    conString: env.DATABASE_URL,
    tableName: 'session',
    createTableIfMissing: false, // Ditangani oleh skema Prisma
  }),
  name: 'simrs_sid',
  secret: env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  rolling: true, // Reset expiry tiap kali ada request aktif
  cookie: {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 8 * 60 * 60 * 1000, // 8 jam
  },
});

declare module 'express-session' {
  interface SessionData {
    userId?: string;
    username?: string;
    roles?: string[];
    permissions?: string[];
    csrfSecret?: string;
  }
}
