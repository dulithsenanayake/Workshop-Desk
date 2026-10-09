import { Router } from 'express';
import { AuditLog } from '../models/AuditLog.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { listAuditQuery } from '../validators/registration.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();
router.use(authenticate, authorize('audit:read'));

router.get('/', validate(listAuditQuery, 'query'), asyncHandler(async (req, res) => {
  const { entityType, entityId, page, limit } = req.validated.query;
  const filter = { ...(entityType && { entityType }), ...(entityId && { entityId }) };
  const [data, total] = await Promise.all([
    AuditLog.find(filter).sort({ at: -1 }).skip((page - 1) * limit).limit(limit),
    AuditLog.countDocuments(filter),
  ]);
  res.json({ data, meta: { page, limit, total } });
}));

export default router;
