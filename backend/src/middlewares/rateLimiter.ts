import rateLimit from 'express-rate-limit';

export const authRateLimiter = rateLimit({
  windowMs: 0, // 15 menit
  max: 10, // Maksimal 10 request per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Terlalu banyak percobaan autentikasi. Silakan coba 15 menit lagi.',
    },
  },
});

export const apiRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 menit
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Batas pemanggilan API terlampaui. Silakan tunggu sebentar.',
    },
  },
});
