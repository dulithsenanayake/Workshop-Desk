import { AuditLog } from '../models/AuditLog.js';

/** Record "who did what, when". `changes` is a map of field -> { from, to }. */
export const recordAudit = ({ actor, action, entityType, entityId, changes = {}, summary = '' }) =>
  AuditLog.create({ actor: actor._id, actorName: actor.name, action, entityType, entityId, changes, summary });

/** Build a { field: {from,to} } diff containing only fields that actually changed. */
export function diff(before, after, fields) {
  const changes = {};
  for (const f of fields) {
    if (after[f] === undefined) continue;
    const a = before[f] instanceof Date ? before[f].toISOString() : before[f];
    const b = after[f] instanceof Date ? after[f].toISOString() : after[f];
    if (String(a) !== String(b)) changes[f] = { from: a, to: b };
  }
  return changes;
}
