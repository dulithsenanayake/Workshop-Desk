import { Router } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { User } from '../models/User.js';
import { authenticate, signToken } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { loginSchema } from '../validators/auth.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { env } from '../config/env.js';
import { can, PERMISSIONS } from '../config/permissions.js';

const router = Router();

// Slows down password guessing. Disabled in tests so suites aren't throttled.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => env.isTest,
  message: { error: { message: 'Too many login attempts. Try again in a few minutes.' } },
});

// Compared when the email is unknown so response time doesn't reveal which emails exist.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 12);

router.post(
  '/login',
  loginLimiter,
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const { email, password } = req.validated.body;
    const user = await User.findOne({ email }).select('+passwordHash');
    const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
    if (!user || !ok || !user.isActive) throw ApiError.unauthorized('Invalid email or password');
    res.json({ token: signToken(user), user });
  }),
);

router.get('/me', authenticate, (req, res) => {
  const permissions = Object.keys(PERMISSIONS).filter((p) => can(req.user.role, p));
  res.json({ user: req.user, permissions });
});

export default router;
