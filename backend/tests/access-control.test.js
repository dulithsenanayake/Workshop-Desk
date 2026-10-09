import { before, after, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { api, setup, teardown, makeUser, makeWorkshop } from './helpers.js';

describe('access control (enforced by the backend)', () => {
  let admin, manager, staff, workshop;
  before(async () => {
    await setup();
    [admin, manager, staff] = await Promise.all(['admin', 'manager', 'staff'].map(makeUser));
    workshop = await makeWorkshop();
  });
  after(teardown);

  const body = { code: 'NEW-1', title: 'New', instructor: 'X', startsAt: new Date(Date.now() + 1e8).toISOString(), capacity: 10 };

  it('rejects unauthenticated requests', async () => {
    assert.equal((await api().get('/api/workshops')).status, 401);
  });

  it('only Admin can create users', async () => {
    const user = { name: 'N', email: 'n@test.dev', password: 'Password123!', role: 'staff' };
    assert.equal((await api().post('/api/users').set(manager.auth).send(user)).status, 403);
    assert.equal((await api().post('/api/users').set(staff.auth).send(user)).status, 403);
    assert.equal((await api().post('/api/users').set(admin.auth).send(user)).status, 201);
  });

  it('only Manager can add / edit workshops', async () => {
    assert.equal((await api().post('/api/workshops').set(staff.auth).send(body)).status, 403);
    assert.equal((await api().post('/api/workshops').set(admin.auth).send(body)).status, 403);
    assert.equal((await api().post('/api/workshops').set(manager.auth).send(body)).status, 201);
    assert.equal((await api().patch(`/api/workshops/${workshop._id}`).set(staff.auth).send({ title: 'Hack' })).status, 403);
  });

  it('Admin cannot view workshops or registrations; Manager and Staff can', async () => {
    assert.equal((await api().get('/api/workshops').set(admin.auth)).status, 403);
    assert.equal((await api().get(`/api/workshops/${workshop._id}/registrations`).set(admin.auth)).status, 403);
    assert.equal((await api().get('/api/workshops').set(staff.auth)).status, 200);
    assert.equal((await api().get('/api/workshops').set(manager.auth)).status, 200);
  });

  it('Admin cannot register attendees', async () => {
    const res = await api().post(`/api/workshops/${workshop._id}/registrations`).set(admin.auth).send({ attendeeName: 'A', attendeeEmail: 'a@x.dev' });
    assert.equal(res.status, 403);
  });

  it('a disabled account loses access immediately', async () => {
    const users = (await api().get('/api/users').set(admin.auth)).body.data;
    const target = users.find((u) => u.role === 'staff' && u.email === 'staff@test.dev');
    assert.equal((await api().patch(`/api/users/${target._id}`).set(admin.auth).send({ isActive: false })).status, 200);
    assert.equal((await api().get('/api/workshops').set(staff.auth)).status, 401);
  });

  it('Admin cannot change their own role', async () => {
    const me = (await api().get('/api/auth/me').set(admin.auth)).body.user;
    assert.equal((await api().patch(`/api/users/${me._id}`).set(admin.auth).send({ role: 'staff' })).status, 400);
  });
});
