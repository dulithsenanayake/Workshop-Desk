import { Router } from 'express';
import { User } from '../models/User.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { idParam } from '../validators/common.js';
import { createUserSchema, updateUserSchema } from '../validators/user.js';
import { createUser, updateUser } from '../services/userService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();
router.use(authenticate, authorize('users:manage'));

router.get('/', asyncHandler(async (_req, res) => {
  res.json({ data: await User.find().sort({ createdAt: 1 }) });
}));

router.post('/', validate(createUserSchema), asyncHandler(async (req, res) => {
  res.status(201).json({ data: await createUser(req.validated.body, req.user) });
}));

router.patch('/:id', validate(idParam, 'params'), validate(updateUserSchema), asyncHandler(async (req, res) => {
  res.json({ data: await updateUser(req.validated.params.id, req.validated.body, req.user) });
}));

export default router;
