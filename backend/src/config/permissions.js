/**
 * Single source of truth for the permission matrix in the brief.
 * Anything not listed here is refused by the backend.
 */
export const ROLES = Object.freeze({
  ADMIN: 'admin',
  MANAGER: 'manager',
  STAFF: 'staff',
});

export const PERMISSIONS = Object.freeze({
  'users:manage': [ROLES.ADMIN],
  'audit:read': [ROLES.ADMIN],
  'workshops:write': [ROLES.MANAGER],
  'workshops:read': [ROLES.MANAGER, ROLES.STAFF],
  'registrations:write': [ROLES.MANAGER, ROLES.STAFF],
  'registrations:read': [ROLES.MANAGER, ROLES.STAFF],
});

export const can = (role, permission) => PERMISSIONS[permission]?.includes(role) ?? false;
