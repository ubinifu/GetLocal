import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

// ─── Types ───────────────────────────────────────────────────────────────────

/** Shape of field-level errors returned on validation failure. */
interface FieldError {
  field: string;
  message: string;
}

/** Structured validation error response body. */
interface ValidationErrorResponse {
  status: 'error';
  message: string;
  errors: FieldError[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Transforms a `ZodError` into a flat array of field-level error objects
 * suitable for API consumers.
 */
const formatZodErrors = (zodError: ZodError): FieldError[] => {
  return zodError.issues.map((issue: any) => ({
    field: issue.path.length > 0 ? issue.path.join('.') : 'unknown',
    message: issue.message,
  }));
};

/**
 * Sends a 400 response with detailed, field-level validation errors.
 */
const sendValidationError = (res: Response, zodError: ZodError): void => {
  const body: ValidationErrorResponse = {
    status: 'error',
    message: 'Validation failed. Please check the submitted data.',
    errors: formatZodErrors(zodError),
  };

  res.status(400).json(body);
};

// ─── validate (req.body) ─────────────────────────────────────────────────────

/**
 * Factory that returns middleware to validate `req.body` against a Zod schema.
 *
 * On success the parsed (and potentially transformed) value replaces
 * `req.body`, giving downstream handlers access to the clean data.
 *
 * On failure the middleware responds with **400 Bad Request** and a JSON body
 * containing an `errors` array with per-field details.
 *
 * @param schema - A Zod schema to validate against.
 *
 * @example
 * ```ts
 * import { z } from 'zod';
 * import { validate } from '../middleware/validate';
 *
 * const createOrderSchema = z.object({
 *   storeId: z.string().uuid(),
 *   items: z.array(z.object({
 *     productId: z.string().uuid(),
 *     quantity: z.number().int().positive(),
 *   })).min(1),
 *   pickupTime: z.string().datetime(),
 * });
 *
 * router.post('/orders', validate(createOrderSchema), createOrderHandler);
 * ```
 */
export const validate = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      sendValidationError(res, result.error);
      return;
    }

    // Replace body with the parsed & transformed value.
    req.body = result.data;
    next();
  };
};

// ─── validateQuery (req.query) ───────────────────────────────────────────────

/**
 * Factory that returns middleware to validate `req.query` against a Zod schema.
 *
 * Useful for search / listing endpoints where filters and pagination parameters
 * must be validated.
 *
 * @param schema - A Zod schema to validate query parameters against.
 *
 * @example
 * ```ts
 * const listStoresQuery = z.object({
 *   lat: z.coerce.number().min(-90).max(90),
 *   lng: z.coerce.number().min(-180).max(180),
 *   radius: z.coerce.number().positive().optional().default(5),
 *   page: z.coerce.number().int().positive().optional().default(1),
 *   limit: z.coerce.number().int().positive().max(100).optional().default(20),
 * });
 *
 * router.get('/stores', validateQuery(listStoresQuery), listStoresHandler);
 * ```
 */
export const validateQuery = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);

    if (!result.success) {
      sendValidationError(res, result.error);
      return;
    }

    // In Express 5 req.query is a getter on the prototype that re-parses
    // the query string each time.  Override it with an own data property
    // so downstream handlers receive the validated & coerced values.
    Object.defineProperty(req, 'query', {
      value: result.data,
      writable: true,
      configurable: true,
    });
    next();
  };
};

// ─── validateParams (req.params) ─────────────────────────────────────────────

/**
 * Factory that returns middleware to validate `req.params` against a Zod schema.
 *
 * Particularly handy for ensuring route parameters like IDs are valid UUIDs.
 *
 * @param schema - A Zod schema to validate route parameters against.
 *
 * @example
 * ```ts
 * const storeParams = z.object({
 *   id: z.string().uuid('Invalid store ID format'),
 * });
 *
 * router.get('/stores/:id', validateParams(storeParams), getStoreHandler);
 * ```
 */
export const validateParams = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.params);

    if (!result.success) {
      sendValidationError(res, result.error);
      return;
    }

    // In Express 5 req.params is a getter on the prototype (same as req.query).
    // Override it with an own data property so downstream handlers get parsed values.
    Object.defineProperty(req, 'params', {
      value: result.data,
      writable: true,
      configurable: true,
    });
    next();
  };
};
