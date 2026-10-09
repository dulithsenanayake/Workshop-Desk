import { z } from 'zod';
import { WORKSHOP_STATUSES } from '../models/Workshop.js';
import { pagination } from './common.js';

const fields = {
  code: z.string().trim().min(2).max(20).regex(/^[A-Za-z0-9_-]+$/, 'Use letters, numbers, - or _').transform((s) => s.toUpperCase()),
  title: z.string().trim().min(1).max(150),
  instructor: z.string().trim().min(1).max(100),
  startsAt: z.coerce.date(),
  durationMinutes: z.coerce.number().int().min(15).max(1440),
  location: z.string().trim().max(100),
  description: z.string().trim().max(1000),
  capacity: z.coerce.number().int().min(1).max(1000),
  status: z.enum(WORKSHOP_STATUSES),
};

export const createWorkshopSchema = z.object({
  ...fields,
  durationMinutes: fields.durationMinutes.default(120),
  location: fields.location.default(''),
  description: fields.description.default(''),
  status: fields.status.default('scheduled'),
});

export const updateWorkshopSchema = z
  .object(fields)
  .partial()
  .refine((v) => Object.keys(v).length > 0, 'Provide at least one field to update');

const bool = z.enum(['true', 'false']).transform((v) => v === 'true');

export const listWorkshopsQuery = z
  .object({
    from: z.coerce.date().optional(), // startsAt >= from
    to: z.coerce.date().optional(), // startsAt <= to
    status: z.enum(WORKSHOP_STATUSES).optional(),
    hasSeats: bool.optional(), // only workshops with at least one free seat
    minSeats: z.coerce.number().int().min(1).optional(), // at least N free seats
    q: z.string().trim().max(100).optional(), // code / title / instructor
    ...pagination,
  })
  .refine((v) => !v.from || !v.to || v.from <= v.to, { message: '"from" must be before "to"', path: ['from'] });
