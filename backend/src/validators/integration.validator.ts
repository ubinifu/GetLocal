import { z } from 'zod';

// ---------------------------------------------------------------------------
// Create Integration
// ---------------------------------------------------------------------------
export const createIntegrationSchema = z.object({
  type: z.enum(['SQUARE', 'SHOPIFY', 'TOAST', 'CUSTOM_REST']),
  apiKey: z.string().max(500, 'API key must not exceed 500 characters').optional(),
  apiSecret: z.string().max(500, 'API secret must not exceed 500 characters').optional(),
  webhookUrl: z.url('Invalid webhook URL format').optional(),
  syncInterval: z
    .int('Sync interval must be an integer')
    .min(5, 'Sync interval must be at least 5 minutes')
    .max(1440, 'Sync interval must not exceed 1440 minutes')
    .default(30),
  config: z.record(z.string(), z.unknown()).default({}),
});

export type CreateIntegrationInput = z.infer<typeof createIntegrationSchema>;

// ---------------------------------------------------------------------------
// Update Integration
// ---------------------------------------------------------------------------
export const updateIntegrationSchema = z.object({
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  apiKey: z.string().max(500, 'API key must not exceed 500 characters').optional(),
  apiSecret: z.string().max(500, 'API secret must not exceed 500 characters').optional(),
  webhookUrl: z.url('Invalid webhook URL format').nullable().optional(),
  syncInterval: z
    .int('Sync interval must be an integer')
    .min(5, 'Sync interval must be at least 5 minutes')
    .max(1440, 'Sync interval must not exceed 1440 minutes')
    .optional(),
  config: z.record(z.string(), z.unknown()).optional(),
});

export type UpdateIntegrationInput = z.infer<typeof updateIntegrationSchema>;

// ---------------------------------------------------------------------------
// Integration Query (filter / paginate)
// ---------------------------------------------------------------------------
export const integrationQuerySchema = z.object({
  type: z.enum(['SQUARE', 'SHOPIFY', 'TOAST', 'CUSTOM_REST']).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'ERROR']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100, 'Limit must not exceed 100').default(20),
});

export type IntegrationQueryInput = z.infer<typeof integrationQuerySchema>;
