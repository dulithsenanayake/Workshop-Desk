import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useFetch } from '../hooks/useFetch.js';
import { Alert, BackLink, SeatMeter, Spinner, StatusBadge } from '../components/ui.jsx';
import { formatDateTime, formatLongDate, formatTime } from '../utils/format.js';

export default function WorkshopDetailPage() {
  const { id } = useParams();
  const { can } = useAuth();
  const [view, setView] = useState('');
  const workshop = useFetch(() => api.getWorkshop(id), [id]);
  const regs = useFetch(() => api.listRegistrations(id, { status: view }), [id, view]);

  const refresh = () => { workshop.reload(); regs.reload(); };

  if (workshop.loading && !workshop.data) return <Spinner />;
  if (workshop.error) return <><BackLink to="/workshops">All workshops</BackLink><Alert>{workshop.error.message}</Alert></>;
  const w = workshop.data.data;

  return (
    <>
      <BackLink to="/workshops">All workshops</BackLink>
      <div className="page-head">
        <div>
          <h1>{w.title}</h1>
          <p className="muted">{w.code} · {w.instructor} · {formatLongDate(w.startsAt)}, {formatTime(w.startsAt)}{w.location && ` · ${w.location}`}</p>
        </div>
        <div className="row">
          <StatusBadge status={w.status} />
          {can('workshops:write') && <Link className="btn" to={`/workshops/${w._id}/edit`}>Edit workshop</Link>}
        </div>
      </div>

      {w.description && <p className="lede">{w.description}</p>}

      <div className="detail-grid">
        <section className="panel">
          <h2>Seats</h2>
          <SeatMeter capacity={w.capacity} taken={w.activeCount} />
          {can('registrations:write') && <RegisterForm workshop={w} onDone={refresh} />}
        </section>

        <section className="panel flush">
          <div className="panel-head">
            <h2>Registrations</h2>
            <div className="segmented" role="group" aria-label="Filter registrations">
              {[['', 'All'], ['active', 'Active'], ['cancelled', 'Cancelled']].map(([value, label]) => (
                <button key={label} className={view === value ? 'on' : ''} aria-pressed={view === value} onClick={() => setView(value)}>{label}</button>
              ))}
            </div>
          </div>
          <Alert>{regs.error?.message}</Alert>
          <RegistrationTable workshopId={w._id} rows={regs.data?.data ?? []} canCancel={can('registrations:write')} onChanged={refresh} />
        </section>
      </div>
    </>
  );
}

function RegisterForm({ workshop, onDone }) {
  const [form, setForm] = useState({ attendeeName: '', attendeeEmail: '' });
  const [message, setMessage] = useState({ kind: '', text: '' });
  const [busy, setBusy] = useState(false);
  const full = workshop.activeCount >= workshop.capacity;
  const closed = workshop.status !== 'scheduled';

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return; // guards against double clicks
    setBusy(true);
    setMessage({ kind: '', text: '' });
    try {
      await api.register(workshop._id, form);
      setMessage({ kind: 'success', text: `${form.attendeeName} is registered.` });
      setForm({ attendeeName: '', attendeeEmail: '' });
    } catch (err) {
      setMessage({ kind: 'error', text: err.message });
    } finally {
      setBusy(false);
      onDone(); // always re-sync: someone else may have taken the last seat
    }
  };

  if (closed) return <p className="muted">Registration is closed because this workshop is {workshop.status}.</p>;

  return (
    <form onSubmit={submit} className="stack">
      <h3>Register an attendee</h3>
      {full && <Alert kind="warn">This workshop is full. Cancel a registration to free a seat.</Alert>}
      <Alert kind={message.kind || 'error'}>{message.text}</Alert>
      <label>Name
        <input required maxLength={100} value={form.attendeeName} onChange={(e) => setForm({ ...form, attendeeName: e.target.value })} />
      </label>
      <label>Email
        <input type="email" required value={form.attendeeEmail} onChange={(e) => setForm({ ...form, attendeeEmail: e.target.value })} />
      </label>
      <button className="btn btn-primary" disabled={busy || full}>{busy ? 'Registering…' : 'Register attendee'}</button>
    </form>
  );
}

function RegistrationTable({ workshopId, rows, canCancel, onChanged }) {
  const [error, setError] = useState('');
  const [cancelling, setCancelling] = useState(null);

  const cancel = async (r) => {
    if (!window.confirm(`Cancel the registration for ${r.attendeeName}? Their seat will be freed.`)) return;
    setCancelling(r._id);
    setError('');
    try {
      await api.cancelRegistration(workshopId, r._id);
    } catch (err) {
      setError(err.message);
    } finally {
      setCancelling(null);
      onChanged();
    }
  };

  if (rows.length === 0) return <p className="empty">No registrations yet.</p>;
  return (
    <>
      <Alert>{error}</Alert>
      <table className="table">
        <thead><tr><th>Attendee</th><th>Registered</th><th>Status</th>{canCancel && <th><span className="sr-only">Actions</span></th>}</tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r._id} className={r.status === 'cancelled' ? 'is-cancelled' : ''}>
              <td>{r.attendeeName}<div className="muted small">{r.attendeeEmail}</div></td>
              <td>{formatDateTime(r.registeredAt)}<div className="muted small">by {r.registeredBy?.name ?? 'unknown'}</div></td>
              <td>
                <span className={`badge badge-${r.status === 'active' ? 'scheduled' : 'cancelled'}`}>{r.status}</span>
                {r.status === 'cancelled' && (
                  <div className="muted small">{formatDateTime(r.cancelledAt)} by {r.cancelledBy?.name ?? 'unknown'}{r.cancelReason && ` — ${r.cancelReason}`}</div>
                )}
              </td>
              {canCancel && (
                <td className="right">
                  {r.status === 'active' && <button className="btn btn-danger" disabled={cancelling === r._id} onClick={() => cancel(r)}>Cancel</button>}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
