import rateLimit from 'express-rate-limit';

/**
 * General-purpose rate limiter for all API endpoints.
 * Allows 100 requests per 15-minute window per IP address.
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 100 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'error',
    message: 'Too many requests. Please try again after 15 minutes.',
  },
  validate: { xForwardedForHeader: false },
});

/**
 * Stricter rate limiter for authentication-related endpoints.
 * Allows 20 requests per 15-minute window per IP address.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 20 : 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'error',
    message: 'Too many authentication attempts. Please try again after 15 minutes.',
  },
  validate: { xForwardedForHeader: false },
});
