import { Workshop } from '../models/Workshop.js';
import { Registration } from '../models/Registration.js';
import { ApiError } from '../utils/ApiError.js';

/**
 * THE CAPACITY RULE
 * -----------------
 * A workshop can never hold more active registrations than its capacity, even when many requests
 * arrive in the same instant.
 *
 * How: a seat is claimed by ONE atomic conditional update on the workshop document:
 *
 *    updateOne({ _id, status: 'scheduled', activeCount < capacity }, { $inc: { activeCount: 1 } })
 *
 * MongoDB applies single-document updates atomically, so two simultaneous requests for the last seat
 * cannot both match the filter: exactly one wins, the other gets "full". There is no
 * read-then-write window, so no application-level lock is needed and it works across multiple
 * server processes. It also works on a standalone MongoDB (no replica set / transactions required).
 *
 * Only after the seat is claimed do we insert the registration. If that insert fails (e.g. the same
 * attendee is already registered) we hand the seat back. `npm run reconcile` recomputes counts from
 * the registration records as a safety net against a crash between the two steps.
 */
export async function registerAttendee({ workshopId, attendeeName, attendeeEmail, actor }) {
  const claimed = await Workshop.findOneAndUpdate(
    { _id: workshopId, status: 'scheduled', $expr: { $lt: ['$activeCount', '$capacity'] } },
    { $inc: { activeCount: 1 } },
    { new: true },
  );

  if (!claimed) throw await explainRefusal(workshopId);

  try {
    return await Registration.create({
      workshop: workshopId,
      attendeeName,
      attendeeEmail,
      registeredBy: actor._id,
    });
  } catch (err) {
    await releaseSeat(workshopId); // compensate: give the claimed seat back
    if (err?.code === 11000) {
      throw ApiError.conflict(`${attendeeEmail} is already registered for this workshop`);
    }
    throw err;
  }
}

/**
 * Cancellation flips the registration from active -> cancelled atomically (so a double-click or two
 * staff members cancelling at once only free ONE seat), then releases the seat. The row is kept.
 */
export async function cancelRegistration({ workshopId, registrationId, reason, actor }) {
  const cancelled = await Registration.findOneAndUpdate(
    { _id: registrationId, workshop: workshopId, status: 'active' },
    { $set: { status: 'cancelled', cancelledBy: actor._id, cancelledAt: new Date(), cancelReason: reason } },
    { new: true },
  );

  if (!cancelled) {
    const existing = await Registration.exists({ _id: registrationId, workshop: workshopId });
    throw existing ? ApiError.conflict('This registration is already cancelled') : ApiError.notFound('Registration not found');
  }

  await releaseSeat(workshopId);
  return cancelled;
}

export const releaseSeat = (workshopId) =>
  Workshop.updateOne({ _id: workshopId, activeCount: { $gt: 0 } }, { $inc: { activeCount: -1 } });

async function explainRefusal(workshopId) {
  const workshop = await Workshop.findById(workshopId).select('status capacity activeCount');
  if (!workshop) return ApiError.notFound('Workshop not found');
  if (workshop.status !== 'scheduled') return ApiError.conflict(`Registration is closed: this workshop is ${workshop.status}`);
  return ApiError.conflict('This workshop is full');
}

/** Safety net: recompute every workshop's activeCount from the source-of-truth registration rows. */
export async function reconcileSeatCounts() {
  const counts = await Registration.aggregate([
    { $match: { status: 'active' } },
    { $group: { _id: '$workshop', n: { $sum: 1 } } },
  ]);
  const byWorkshop = new Map(counts.map((c) => [String(c._id), c.n]));
  const workshops = await Workshop.find().select('activeCount');
  let fixed = 0;
  for (const w of workshops) {
    const actual = byWorkshop.get(String(w._id)) ?? 0;
    if (w.activeCount !== actual) {
      await Workshop.updateOne({ _id: w._id }, { $set: { activeCount: actual } });
      fixed += 1;
    }
  }
  return { checked: workshops.length, fixed };
}
