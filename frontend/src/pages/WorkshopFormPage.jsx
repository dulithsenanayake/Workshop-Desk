import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client.js';
import { useFetch } from '../hooks/useFetch.js';
import { Alert, BackLink, Spinner } from '../components/ui.jsx';
import { toLocalInput } from '../utils/format.js';

const BLANK = { code: '', title: '', instructor: '', startsAt: '', durationMinutes: 120, location: '', description: '', capacity: 10, status: 'scheduled' };

export default function WorkshopFormPage() {
  const { id } = useParams();
  const editing = Boolean(id);
  const existing = useFetch(() => (editing ? api.getWorkshop(id) : Promise.resolve(null)), [id]);
  if (existing.loading) return <Spinner />;
  if (existing.error) return <Alert>{existing.error.message}</Alert>;
  const initial = existing.data
    ? { ...existing.data.data, startsAt: toLocalInput(existing.data.data.startsAt) }
    : BLANK;
  return <WorkshopForm initial={initial} id={id} />;
}

function WorkshopForm({ initial, id }) {
  const navigate = useNavigate();
  const [form, setForm] = useState(initial);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    const payload = {
      code: form.code,
      title: form.title,
      instructor: form.instructor,
      startsAt: new Date(form.startsAt).toISOString(),
      durationMinutes: Number(form.durationMinutes),
      location: form.location,
      description: form.description,
      capacity: Number(form.capacity),
      status: form.status,
    };
    try {
      const { data } = id ? await api.updateWorkshop(id, payload) : await api.createWorkshop(payload);
      navigate(`/workshops/${data._id}`);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <>
      <BackLink to={id ? `/workshops/${id}` : '/workshops'}>Back</BackLink>
      <h1>{id ? 'Edit workshop' : 'Add workshop'}</h1>
      <form className="panel form-grid" onSubmit={submit}>
        <Alert>{error}</Alert>
        <label>Workshop code<input required value={form.code} onChange={set('code')} placeholder="POT-101" /></label>
        <label>Title<input required value={form.title} onChange={set('title')} /></label>
        <label>Instructor<input required value={form.instructor} onChange={set('instructor')} /></label>
        <label>Location<input value={form.location} onChange={set('location')} placeholder="e.g. Central Studio" /></label>
        <label>Date &amp; time<input type="datetime-local" required value={form.startsAt} onChange={set('startsAt')} /></label>
        <label>Length (minutes)<input type="number" min="15" max="1440" required value={form.durationMinutes} onChange={set('durationMinutes')} /></label>
        <label>Seats (capacity)
          <input type="number" min="1" max="1000" required value={form.capacity} onChange={set('capacity')} />
          {id && <span className="hint">{initial.activeCount} seats are already taken.</span>}
        </label>
        <label>Status
          <select value={form.status} onChange={set('status')}>
            <option value="scheduled">Scheduled (open for registration)</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </label>
        <label className="span-2">Description<textarea rows="3" maxLength={1000} value={form.description} onChange={set('description')} /></label>
        <div className="span-2 row">
          <button className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save workshop'}</button>
          <button type="button" className="btn btn-quiet" onClick={() => navigate(-1)}>Discard</button>
        </div>
      </form>
    </>
  );
}
