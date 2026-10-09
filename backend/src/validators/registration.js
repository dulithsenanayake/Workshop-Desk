import { z } from 'zod';
import { pagination } from './common.js';

export const createRegistrationSchema = z.object({
  attendeeName: z.string().trim().min(1, 'Name is required').max(100),
  attendeeEmail: z.string().trim().toLowerCase().email('Enter a valid email address'),
});

export const cancelRegistrationSchema = z.object({
  reason: z.string().trim().max(300).optional(),
});

export const listRegistrationsQuery = z.object({
  status: z.enum(['active', 'cancelled']).optional(),
  ...pagination,
  limit: z.coerce.number().int().min(1).max(500).default(200),
});

export const listAuditQuery = z.object({
  entityType: z.enum(['workshop', 'user']).optional(),
  entityId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
  ...pagination,
});
