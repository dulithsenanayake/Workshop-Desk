import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { z } from 'zod';
import { idParam, objectId } from '../validators/common.js';
import { createWorkshopSchema, updateWorkshopSchema, listWorkshopsQuery } from '../validators/workshop.js';
import { createRegistrationSchema, cancelRegistrationSchema, listRegistrationsQuery } from '../validators/registration.js';
import * as workshops from '../services/workshopService.js';
import { registerAttendee, cancelRegistration } from '../services/registrationService.js';
import { Registration } from '../models/Registration.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();
router.use(authenticate);

// ---- Workshops ----
router.get('/', authorize('workshops:read'), validate(listWorkshopsQuery, 'query'), asyncHandler(async (req, res) => {
  res.json(await workshops.listWorkshops(req.validated.query));
}));

router.get('/:id', authorize('workshops:read'), validate(idParam, 'params'), asyncHandler(async (req, res) => {
  res.json({ data: await workshops.getWorkshop(req.validated.params.id) });
}));

router.post('/', authorize('workshops:write'), validate(createWorkshopSchema), asyncHandler(async (req, res) => {
  res.status(201).json({ data: await workshops.createWorkshop(req.validated.body, req.user) });
}));

router.patch('/:id', authorize('workshops:write'), validate(idParam, 'params'), validate(updateWorkshopSchema), asyncHandler(async (req, res) => {
  res.json({ data: await workshops.updateWorkshop(req.validated.params.id, req.validated.body, req.user) });
}));

// ---- Registrations (nested under a workshop) ----
// Full history: active AND cancelled rows, who registered / cancelled and when.
router.get('/:id/registrations', authorize('registrations:read'), validate(idParam, 'params'), validate(listRegistrationsQuery, 'query'), asyncHandler(async (req, res) => {
  const { id } = req.validated.params;
  const { status, page, limit } = req.validated.query;
  await workshops.getWorkshop(id); // 404 if the workshop doesn't exist
  const filter = { workshop: id, ...(status && { status }) };
  const [data, total] = await Promise.all([
    Registration.find(filter)
      .sort({ registeredAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('registeredBy cancelledBy', 'name email'),
    Registration.countDocuments(filter),
  ]);
  res.json({ data, meta: { page, limit, total } });
}));

router.post('/:id/registrations', authorize('registrations:write'), validate(idParam, 'params'), validate(createRegistrationSchema), asyncHandler(async (req, res) => {
  const registration = await registerAttendee({ workshopId: req.validated.params.id, ...req.validated.body, actor: req.user });
  const workshop = await workshops.getWorkshop(req.validated.params.id);
  res.status(201).json({ data: registration, workshop });
}));

const cancelParams = z.object({ id: objectId, registrationId: objectId });
router.post('/:id/registrations/:registrationId/cancel', authorize('registrations:write'), validate(cancelParams, 'params'), validate(cancelRegistrationSchema), asyncHandler(async (req, res) => {
  const { id, registrationId } = req.validated.params;
  const registration = await cancelRegistration({ workshopId: id, registrationId, reason: req.validated.body.reason, actor: req.user });
  const workshop = await workshops.getWorkshop(id);
  res.json({ data: registration, workshop });
}));

export default router;
