import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import config from '../config';

// ─── Types ───────────────────────────────────────────────────────────────────

/** Shape of the JWT payload stored in the token. */
export interface JwtUserPayload {
  id: string;
  email: string;
  role: string;
}

/** Convenience type for routes that require an authenticated user on `req`. */
export interface AuthenticatedRequest extends Request {
  user: JwtUserPayload;
}

// ─── authenticate ────────────────────────────────────────────────────────────

/**
 * Authentication middleware.
 *
 * Extracts the JWT from the `Authorization: Bearer <token>` header, verifies
 * it against `JWT_SECRET`, and attaches the decoded user payload (`id`,
 * `email`, `role`) to `req.user`.
 *
 * Responds with **401 Unauthorized** when:
 * - The `Authorization` header is missing or does not start with "Bearer ".
 * - The token is invalid, malformed, or expired.
 */
export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required. Please provide a valid Bearer token.',
      });
      return;
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required. Token is missing.',
      });
      return;
    }

    const decoded = jwt.verify(token, config.jwtSecret) as JwtUserPayload;

    // Attach the user payload to the request object.
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
    };

    next();
  } catch (error) {
    // Let the global error handler deal with specific JWT error classes
    // (TokenExpiredError, JsonWebTokenError, etc.).  However, we still
    // return 401 here directly so callers get a clear authentication error
    // even if there is no global error handler mounted yet.
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        status: 'error',
        message: 'Token has expired. Please log in again.',
      });
      return;
    }

    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        status: 'error',
        message: 'Invalid token. Please provide a valid token.',
      });
      return;
    }

    if (error instanceof jwt.NotBeforeError) {
      res.status(401).json({
        status: 'error',
        message: 'Token is not yet active.',
      });
      return;
    }

    // Unexpected errors bubble up to the global error handler.
    next(error);
  }
};

// ─── authorize ───────────────────────────────────────────────────────────────

/**
 * Role-based authorisation middleware factory.
 *
 * Must be used **after** `authenticate` so that `req.user` is available.
 *
 * @param roles - One or more role strings that are allowed access.
 * @returns Express middleware that responds with **403 Forbidden** when the
 *          authenticated user's role is not in the allowed list.
 *
 * @example
 * ```ts
 * router.delete(
 *   '/products/:id',
 *   authenticate,
 *   authorize('admin', 'store_owner'),
 *   deleteProductHandler,
 * );
 * ```
 */
export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Guard: ensure the user has been authenticated first.
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required. Please log in first.',
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        status: 'error',
        message: `Access denied. Required role(s): ${roles.join(', ')}. Your role: ${req.user.role}.`,
      });
      return;
    }

    next();
  };
};
