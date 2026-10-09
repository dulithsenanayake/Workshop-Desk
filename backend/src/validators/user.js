import { z } from 'zod';
import { ROLES } from '../config/permissions.js';

const role = z.enum(Object.values(ROLES));
const password = z.string().min(8, 'Password must be at least 8 characters').max(100);

export const createUserSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().toLowerCase().email(),
  password,
  role,
});

export const updateUserSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    role,
    isActive: z.boolean(),
    password, // admin-initiated password reset
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, 'Provide at least one field to update');
