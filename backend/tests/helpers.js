import './setupEnv.js';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { connectDb, disconnectDb } from '../src/config/db.js';
import { User } from '../src/models/User.js';
import { Workshop } from '../src/models/Workshop.js';
import { hashPassword } from '../src/services/userService.js';

export const app = createApp();
export const api = () => request(app);

export async function setup() {
  await connectDb();
  await mongoose.connection.dropDatabase();
  await mongoose.connection.syncIndexes();
}
export const teardown = disconnectDb;

export async function makeUser(role) {
  const email = `${role}@test.dev`;
  const password = 'Password123!';
  await User.create({ name: `${role} user`, email, role, passwordHash: await hashPassword(password) });
  const res = await api().post('/api/auth/login').send({ email, password });
  return { token: res.body.token, auth: { Authorization: `Bearer ${res.body.token}` } };
}

export const makeWorkshop = (overrides = {}) =>
  Workshop.create({
    code: `T-${Math.random().toString(36).slice(2, 8)}`,
    title: 'Test workshop',
    instructor: 'Tester',
    startsAt: new Date(Date.now() + 86_400_000),
    capacity: 5,
    ...overrides,
  });
