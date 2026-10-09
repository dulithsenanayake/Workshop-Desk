import { before, after, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { api, setup, teardown, makeUser, makeWorkshop } from './helpers.js';
import { Registration } from '../src/models/Registration.js';
import { Workshop } from '../src/models/Workshop.js';

describe('registrations and the capacity rule', () => {
  let staff, manager;
  before(async () => {
    await setup();
    [staff, manager] = await Promise.all([makeUser('staff'), makeUser('manager')]);
  });
  after(teardown);

  const register = (id, n, auth = staff.auth) =>
    api().post(`/api/workshops/${id}/registrations`).set(auth).send({ attendeeName: `Person ${n}`, attendeeEmail: `p${n}@test.dev` });

  it('never exceeds capacity when many requests arrive at once', async () => {
    const workshop = await makeWorkshop({ capacity: 5 });
    const results = await Promise.all(Array.from({ length: 40 }, (_, i) => register(workshop._id, i)));

    const ok = results.filter((r) => r.status === 201).length;
    const full = results.filter((r) => r.status === 409).length;
    assert.equal(ok, 5);
    assert.equal(full, 35);
    assert.equal(await Registration.countDocuments({ workshop: workshop._id, status: 'active' }), 5);
    assert.equal((await Workshop.findById(workshop._id)).activeCount, 5);
  });

  it('refuses the same attendee twice, even simultaneously, without leaking a seat', async () => {
    const workshop = await makeWorkshop({ capacity: 5 });
    const results = await Promise.all(Array.from({ length: 10 }, () => register(workshop._id, 'same')));
    assert.equal(results.filter((r) => r.status === 201).length, 1);
    assert.equal((await Workshop.findById(workshop._id)).activeCount, 1);
  });

  it('cancelling frees a seat, keeps the record, and tracks who/when', async () => {
    const workshop = await makeWorkshop({ capacity: 1 });
    const created = await register(workshop._id, 1);
    assert.equal((await register(workshop._id, 2)).status, 409); // full

    const cancelUrl = `/api/workshops/${workshop._id}/registrations/${created.body.data._id}/cancel`;
    const cancel = await api().post(cancelUrl).set(manager.auth).send({ reason: 'Changed plans' });
    assert.equal(cancel.status, 200);
    assert.equal(cancel.body.data.status, 'cancelled');
    assert.equal(cancel.body.workshop.seatsAvailable, 1);

    assert.equal((await api().post(cancelUrl).set(staff.auth).send({})).status, 409); // no double free
    assert.equal((await register(workshop._id, 2)).status, 201); // seat reusable

    const history = (await api().get(`/api/workshops/${workshop._id}/registrations`).set(staff.auth)).body.data;
    assert.equal(history.length, 2);
    const row = history.find((r) => r.status === 'cancelled');
    assert.ok(row.cancelledAt && row.cancelledBy.name && row.registeredBy.name);
  });

  it('refuses registration for cancelled workshops', async () => {
    const workshop = await makeWorkshop({ status: 'cancelled' });
    assert.equal((await register(workshop._id, 1)).status, 409);
  });

  it('cannot reduce capacity below active registrations', async () => {
    const workshop = await makeWorkshop({ capacity: 5 });
    await register(workshop._id, 1);
    await register(workshop._id, 2);
    assert.equal((await api().patch(`/api/workshops/${workshop._id}`).set(manager.auth).send({ capacity: 1 })).status, 409);
    assert.equal((await api().patch(`/api/workshops/${workshop._id}`).set(manager.auth).send({ capacity: 2 })).status, 200);
  });

  it('filters workshops by seats available, status and date range', async () => {
    await Workshop.deleteMany({});
    const soon = new Date(Date.now() + 2 * 86_400_000);
    const later = new Date(Date.now() + 30 * 86_400_000);
    const full = await makeWorkshop({ capacity: 1, startsAt: soon });
    await makeWorkshop({ capacity: 4, startsAt: soon });
    await makeWorkshop({ capacity: 4, startsAt: later, status: 'completed' });
    await register(full._id, 1);

    const get = async (qs) => (await api().get(`/api/workshops?${qs}`).set(staff.auth)).body;
    assert.equal((await get('hasSeats=true')).meta.total, 2);
    assert.equal((await get('minSeats=3')).meta.total, 2);
    assert.equal((await get('status=completed')).meta.total, 1);
    assert.equal((await get(`from=${new Date().toISOString()}&to=${new Date(Date.now() + 7 * 86_400_000).toISOString()}&hasSeats=true`)).meta.total, 1);
  });
});
