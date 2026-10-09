import { Workshop } from '../models/Workshop.js';
import { ApiError } from '../utils/ApiError.js';
import { recordAudit, diff } from '../utils/audit.js';

const AUDITED_FIELDS = ['code', 'title', 'instructor', 'startsAt', 'durationMinutes', 'location', 'description', 'capacity', 'status'];
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export async function listWorkshops(query) {
  const { from, to, status, hasSeats, minSeats, q, page, limit } = query;
  const filter = {};

  if (from || to) filter.startsAt = { ...(from && { $gte: from }), ...(to && { $lte: to }) };
  if (status) filter.status = status;

  // Seats still available = capacity - activeCount (computed in the DB so pagination stays correct).
  const seatsNeeded = minSeats ?? (hasSeats ? 1 : undefined);
  if (seatsNeeded) filter.$expr = { $gte: [{ $subtract: ['$capacity', '$activeCount'] }, seatsNeeded] };

  if (q) {
    const rx = new RegExp(escapeRegex(q), 'i');
    filter.$or = [{ code: rx }, { title: rx }, { instructor: rx }];
  }

  const [data, total] = await Promise.all([
    Workshop.find(filter).sort({ startsAt: 1, _id: 1 }).skip((page - 1) * limit).limit(limit),
    Workshop.countDocuments(filter),
  ]);
  return { data, meta: { page, limit, total, pages: Math.ceil(total / limit) } };
}

export async function getWorkshop(id) {
  const workshop = await Workshop.findById(id);
  if (!workshop) throw ApiError.notFound('Workshop not found');
  return workshop;
}

export async function createWorkshop(input, actor) {
  const workshop = await Workshop.create({ ...input, createdBy: actor._id, updatedBy: actor._id });
  await recordAudit({
    actor,
    action: 'workshop.create',
    entityType: 'workshop',
    entityId: workshop._id,
    summary: `Created workshop ${workshop.code} "${workshop.title}"`,
  });
  return workshop;
}

export async function updateWorkshop(id, input, actor) {
  // Never let capacity drop below the seats already taken. Doing it inside the filter keeps it race-free
  // against registrations happening at the same moment.
  const filter = { _id: id };
  if (input.capacity !== undefined) filter.activeCount = { $lte: input.capacity };

  const before = await Workshop.findOneAndUpdate(
    filter,
    { $set: { ...input, updatedBy: actor._id } },
    { new: false, runValidators: true },
  );

  if (!before) {
    const exists = await Workshop.exists({ _id: id });
    if (!exists) throw ApiError.notFound('Workshop not found');
    throw ApiError.conflict('Capacity cannot be lower than the number of active registrations');
  }

  const changes = diff(before, input, AUDITED_FIELDS);
  if (Object.keys(changes).length > 0) {
    await recordAudit({
      actor,
      action: 'workshop.update',
      entityType: 'workshop',
      entityId: before._id,
      changes,
      summary: `Updated workshop ${before.code}: ${Object.keys(changes).join(', ')}`,
    });
  }
  return Workshop.findById(id);
}
