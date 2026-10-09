import { ZodError } from 'zod';
import mongoose from 'mongoose';
import { ApiError } from '../utils/ApiError.js';
import { env } from '../config/env.js';

export const notFoundHandler = (req, _res, next) => next(ApiError.notFound(`Route ${req.method} ${req.path} not found`));

// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    const details = err.issues.map((i) => ({ field: i.path.join('.'), message: i.message }));
    return res.status(400).json({ error: { message: 'Validation failed', details } });
  }
  if (err instanceof ApiError) {
    return res.status(err.status).json({ error: { message: err.message, details: err.details } });
  }
  if (err instanceof mongoose.Error.CastError) {
    return res.status(400).json({ error: { message: `Invalid ${err.path}` } });
  }
  if (err?.code === 11000) {
    const field = Object.keys(err.keyPattern ?? {})[0] ?? 'value';
    return res.status(409).json({ error: { message: `A record with this ${field} already exists` } });
  }
  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ error: { message: 'Malformed JSON body' } });
  }

  if (!env.isTest) console.error(err);
  return res.status(500).json({ error: { message: 'Internal server error' } });
};
