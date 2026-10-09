/* Dev-only seed: demo accounts + sample workshops. Safe to run repeatedly. */
import { connectDb, disconnectDb } from '../src/config/db.js';
import { env } from '../src/config/env.js';
import { ROLES } from '../src/config/permissions.js';
import { User } from '../src/models/User.js';
import { Workshop } from '../src/models/Workshop.js';
import { hashPassword } from '../src/services/userService.js';
import { registerAttendee } from '../src/services/registrationService.js';

const DEMO_PASSWORD = 'Password123!';

async function upsertUser({ name, email, role, password }) {
  const existing = await User.findOne({ email });
  if (existing) return existing;
  return User.create({ name, email, role, passwordHash: await hashPassword(password) });
}

const at = (daysFromNow, hour) => {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  d.setHours(hour, 0, 0, 0);
  return d;
};

await connectDb();

const admin = await upsertUser({ name: 'Ada Admin', email: env.seedAdminEmail, role: ROLES.ADMIN, password: env.seedAdminPassword });
const manager = await upsertUser({ name: 'Maya Manager', email: 'manager@example.com', role: ROLES.MANAGER, password: DEMO_PASSWORD });
const staff = await upsertUser({ name: 'Sam Staff', email: 'staff@example.com', role: ROLES.STAFF, password: DEMO_PASSWORD });

const samples = [
  { code: 'POT-101', title: 'Intro to Wheel Pottery', instructor: 'Lena Okafor', startsAt: at(1, 10), capacity: 12, location: 'Central Studio', description: 'Throwing basics on the wheel. Aprons provided.' },
  { code: 'COD-201', title: 'Python for Beginners', instructor: 'Dev Patel', startsAt: at(2, 18), capacity: 20, location: 'North Branch - Lab 2', description: 'Variables, loops and a first small project.' },
  { code: 'FIT-110', title: 'Saturday Morning Circuit', instructor: 'Marcus Reid', startsAt: at(3, 8), capacity: 3, location: 'East Hall', description: 'High-energy circuit training. Almost full - good for testing the capacity rule.' },
  { code: 'COD-305', title: 'Build a Website with HTML & CSS', instructor: 'Dev Patel', startsAt: at(5, 14), capacity: 15, location: 'North Branch - Lab 1' },
  { code: 'POT-210', title: 'Glazing Techniques', instructor: 'Lena Okafor', startsAt: at(9, 11), capacity: 10, location: 'Central Studio' },
  { code: 'FIT-050', title: 'Gentle Yoga', instructor: 'Priya Nair', startsAt: at(-6, 9), capacity: 18, location: 'East Hall', status: 'completed' },
  { code: 'COD-150', title: 'Intro to Data Analysis', instructor: 'Dev Patel', startsAt: at(7, 17), capacity: 16, location: 'North Branch - Lab 2', status: 'cancelled' },
];

for (const s of samples) {
  const exists = await Workshop.exists({ code: s.code });
  if (!exists) await Workshop.create({ ...s, createdBy: manager._id, updatedBy: manager._id });
}

// Fill FIT-110 to capacity and give POT-101 a few attendees, through the real service (same code path as the API).
const fitness = await Workshop.findOne({ code: 'FIT-110' });
const pottery = await Workshop.findOne({ code: 'POT-101' });
const attendees = [
  [fitness, 'Nora Whitfield', 'nora@example.com'],
  [fitness, 'Omar Haddad', 'omar@example.com'],
  [fitness, 'Chen Wei', 'chen@example.com'],
  [pottery, 'Isla Brennan', 'isla@example.com'],
  [pottery, 'Tomas Ruiz', 'tomas@example.com'],
];
for (const [workshop, attendeeName, attendeeEmail] of attendees) {
  try {
    await registerAttendee({ workshopId: workshop._id, attendeeName, attendeeEmail, actor: staff });
  } catch (err) {
    if (err.status !== 409) throw err; // already seeded
  }
}

console.log('Seed complete.\n');
console.log(`  Admin    ${admin.email} / ${env.seedAdminPassword}`);
console.log(`  Manager  ${manager.email} / ${DEMO_PASSWORD}`);
console.log(`  Staff    ${staff.email} / ${DEMO_PASSWORD}`);
await disconnectDb();
