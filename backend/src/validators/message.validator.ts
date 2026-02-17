import { z } from 'zod';

// ---------------------------------------------------------------------------
// Send Message
// ---------------------------------------------------------------------------
export const sendMessageSchema = z.object({
  content: z
    .string()
    .min(1, 'Message content cannot be empty')
    .max(2000, 'Message must not exceed 2000 characters'),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;

// ---------------------------------------------------------------------------
// Message Query (paginate)
// ---------------------------------------------------------------------------
export const messageQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100, 'Limit must not exceed 100').default(50),
});

export type MessageQueryInput = z.infer<typeof messageQuerySchema>;
