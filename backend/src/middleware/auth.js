import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { can } from '../config/permissions.js';
import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const signToken = (user) =>
  jwt.sign({ sub: user._id.toString() }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });

/**
 * Authenticates the bearer token and loads the user from the DB on every request, so a role change
 * or deactivation by an Admin takes effect immediately rather than when the token expires.
 */
export const authenticate = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization ?? '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) throw ApiError.unauthorized();

  let payload;
  try {
    payload = jwt.verify(token, env.jwtSecret);
  } catch {
    throw ApiError.unauthorized('Session expired or invalid. Please sign in again.');
  }

  const user = await User.findById(payload.sub);
  if (!user || !user.isActive) throw ApiError.unauthorized('Account is disabled or no longer exists');
  req.user = user;
  next();
});

/** Authorises by named permission (see config/permissions.js). Must run after `authenticate`. */
export const authorize = (permission) => (req, _res, next) =>
  can(req.user.role, permission) ? next() : next(ApiError.forbidden());
