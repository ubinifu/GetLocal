import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { authLimiter } from '../middleware/rateLimiter';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  changePasswordSchema,
} from '../validators/auth.validator';
import * as authController from '../controllers/auth.controller';

const router = Router();

// POST /register - Create a new user account
router.post(
  '/register',
  authLimiter,
  validate(registerSchema),
  authController.register
);

// POST /login - Authenticate and receive tokens
router.post(
  '/login',
  authLimiter,
  validate(loginSchema),
  authController.login
);

// POST /refresh - Refresh an expired access token
router.post(
  '/refresh',
  validate(refreshTokenSchema),
  authController.refreshToken
);

// POST /logout - Invalidate the current session (no auth required; uses refresh token)
router.post(
  '/logout',
  validate(refreshTokenSchema),
  authController.logout
);

// PUT /change-password - Update the authenticated user's password
router.put(
  '/change-password',
  authenticate,
  validate(changePasswordSchema),
  authController.changePassword
);

export default router;
