import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import jwt from 'jsonwebtoken';
import config from '../config';

// ─── AppError ────────────────────────────────────────────────────────────────

/**
 * Custom application error class.
 *
 * Use this to throw predictable, operational errors throughout the codebase.
 * The global error handler recognises instances of `AppError` and uses the
 * attached `statusCode` when building the HTTP response.
 *
 * @example
 * ```ts
 * throw new AppError('Store not found', 404);
 * ```
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    // Maintain proper prototype chain for instanceof checks.
    Object.setPrototypeOf(this, AppError.prototype);

    // Capture a clean stack trace (omits the constructor frame).
    Error.captureStackTrace(this, this.constructor);
  }
}

// ─── Helper: structured error response ───────────────────────────────────────

interface ErrorResponseBody {
  status: 'error';
  message: string;
  errors?: Record<string, string[]> | Array<{ field: string; message: string }>;
  stack?: string;
}

/**
 * Build a consistent JSON error response body.
 * In production the stack trace is always omitted.
 */
const buildErrorResponse = (
  message: string,
  errors?: ErrorResponseBody['errors'],
  stack?: string
): ErrorResponseBody => {
  const body: ErrorResponseBody = {
    status: 'error',
    message,
  };

  if (errors) {
    body.errors = errors;
  }

  if (config.nodeEnv !== 'production' && stack) {
    body.stack = stack;
  }

  return body;
};

// ─── Prisma error handling ───────────────────────────────────────────────────

/**
 * Prisma wraps database errors in `PrismaClientKnownRequestError` which
 * carries a `code` property (e.g. "P2002").  We avoid importing Prisma types
 * directly to keep this module loosely coupled; instead we duck-type the error.
 */
interface PrismaKnownError {
  code: string;
  meta?: Record<string, unknown>;
  message: string;
}

const isPrismaKnownError = (error: unknown): error is PrismaKnownError => {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as PrismaKnownError).code === 'string' &&
    (error as PrismaKnownError).code.startsWith('P')
  );
};

const handlePrismaError = (error: PrismaKnownError): { statusCode: number; message: string } => {
  switch (error.code) {
    // Unique constraint violation
    case 'P2002': {
      const target = error.meta?.target;
      const fields = Array.isArray(target) ? target.join(', ') : String(target ?? 'unknown field');
      return {
        statusCode: 409,
        message: `A record with that ${fields} already exists.`,
      };
    }

    // Record not found (e.g. update / delete on a missing row)
    case 'P2025': {
      const cause = error.meta?.cause;
      return {
        statusCode: 404,
        message: typeof cause === 'string' ? cause : 'The requested record was not found.',
      };
    }

    // Foreign key constraint violation
    case 'P2003': {
      const field = error.meta?.field_name;
      return {
        statusCode: 400,
        message: `Invalid reference: the related ${field ?? 'record'} does not exist.`,
      };
    }

    default:
      return {
        statusCode: 500,
        message: 'An unexpected database error occurred.',
      };
  }
};

// ─── Zod error handling ──────────────────────────────────────────────────────

const handleZodError = (
  error: ZodError
): { statusCode: number; message: string; errors: Array<{ field: string; message: string }> } => {
  const fieldErrors = error.issues.map((issue: any) => ({
    field: issue.path.join('.') || 'unknown',
    message: issue.message,
  }));

  return {
    statusCode: 400,
    message: 'Validation failed. Please check the submitted data.',
    errors: fieldErrors,
  };
};

// ─── JWT error handling ──────────────────────────────────────────────────────

const handleJwtError = (error: Error): { statusCode: number; message: string } => {
  if (error instanceof jwt.TokenExpiredError) {
    return {
      statusCode: 401,
      message: 'Token has expired. Please log in again.',
    };
  }

  if (error instanceof jwt.JsonWebTokenError) {
    return {
      statusCode: 401,
      message: 'Invalid token. Please provide a valid token.',
    };
  }

  if (error instanceof jwt.NotBeforeError) {
    return {
      statusCode: 401,
      message: 'Token is not yet active.',
    };
  }

  return {
    statusCode: 401,
    message: 'Authentication error.',
  };
};

// ─── Global error handler middleware ─────────────────────────────────────────

/**
 * Express global error-handling middleware.
 *
 * Mount this **after** all routes so it catches every error that is thrown or
 * passed to `next(error)`.
 *
 * @example
 * ```ts
 * app.use(globalErrorHandler);
 * ```
 */
export const globalErrorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // ── Log the error ────────────────────────────────────────────────────────
  console.error(`[ERROR] ${new Date().toISOString()}:`, {
    name: err.name,
    message: err.message,
    stack: config.nodeEnv !== 'production' ? err.stack : undefined,
  });

  // ── Known operational errors (AppError) ──────────────────────────────────
  if (err instanceof AppError) {
    res.status(err.statusCode).json(
      buildErrorResponse(err.message, undefined, err.stack)
    );
    return;
  }

  // ── Prisma errors ────────────────────────────────────────────────────────
  if (isPrismaKnownError(err)) {
    const { statusCode, message } = handlePrismaError(err);
    res.status(statusCode).json(
      buildErrorResponse(message, undefined, err.message)
    );
    return;
  }

  // ── Zod validation errors ────────────────────────────────────────────────
  if (err instanceof ZodError) {
    const { statusCode, message, errors } = handleZodError(err);
    res.status(statusCode).json(
      buildErrorResponse(message, errors, err.stack)
    );
    return;
  }

  // ── JWT errors ───────────────────────────────────────────────────────────
  if (
    err instanceof jwt.TokenExpiredError ||
    err instanceof jwt.JsonWebTokenError ||
    err instanceof jwt.NotBeforeError
  ) {
    const { statusCode, message } = handleJwtError(err);
    res.status(statusCode).json(
      buildErrorResponse(message, undefined, err.stack)
    );
    return;
  }

  // ── Syntax errors (malformed JSON body) ──────────────────────────────────
  if (err instanceof SyntaxError && 'body' in err) {
    res.status(400).json(
      buildErrorResponse('Invalid JSON in request body.', undefined, err.stack)
    );
    return;
  }

  // ── Fallback: unexpected / non-operational errors ────────────────────────
  const statusCode = 500;
  const message =
    config.nodeEnv === 'production'
      ? 'An unexpected internal server error occurred.'
      : err.message || 'An unexpected internal server error occurred.';

  res.status(statusCode).json(
    buildErrorResponse(message, undefined, err.stack)
  );
};

// ─── Not-found handler ───────────────────────────────────────────────────────

/**
 * Catch-all handler for routes that do not match any defined endpoint.
 * Mount this **after** all routes but **before** the global error handler.
 *
 * @example
 * ```ts
 * app.use(notFoundHandler);
 * app.use(globalErrorHandler);
 * ```
 */
// Alias for coordination with other modules that import { errorHandler }.
export const errorHandler = globalErrorHandler;

export const notFoundHandler = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  next(new AppError(`Cannot ${req.method} ${req.originalUrl}`, 404));
};
