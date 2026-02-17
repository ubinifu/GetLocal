import { Request } from 'express';

/**
 * Augment the Express Request interface to include the authenticated user
 * payload that is attached by the authentication middleware.
 */
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
      };
    }
  }
}

export {};
