import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { recordAudit, diff } from '../utils/audit.js';

const SALT_ROUNDS = 12;
export const hashPassword = (plain) => bcrypt.hash(plain, SALT_ROUNDS);

export async function createUser({ name, email, password, role }, actor) {
  const user = await User.create({ name, email, role, passwordHash: await hashPassword(password) });
  await recordAudit({
    actor,
    action: 'user.create',
    entityType: 'user',
    entityId: user._id,
    changes: { role: { from: null, to: role } },
    summary: `Created ${role} account for ${email}`,
  });
  return user;
}

export async function updateUser(id, { password, ...rest }, actor) {
  if (String(id) === String(actor._id) && (rest.role !== undefined || rest.isActive !== undefined)) {
    // Prevents an Admin locking themselves (and so possibly everyone) out of user management.
    throw ApiError.badRequest('You cannot change your own role or disable your own account');
  }

  const user = await User.findById(id);
  if (!user) throw ApiError.notFound('User not found');

  const changes = diff(user, rest, ['name', 'role', 'isActive']);
  Object.assign(user, rest);
  if (password) {
    user.passwordHash = await hashPassword(password);
    changes.password = { from: '[hidden]', to: '[reset]' }; // never log the value
  }
  await user.save();

  if (Object.keys(changes).length > 0) {
    const action = changes.role ? 'user.role_change' : changes.isActive ? 'user.status_change' : 'user.update';
    await recordAudit({
      actor,
      action,
      entityType: 'user',
      entityId: user._id,
      changes,
      summary: `Updated account ${user.email}: ${Object.keys(changes).join(', ')}`,
    });
  }
  return user;
}
