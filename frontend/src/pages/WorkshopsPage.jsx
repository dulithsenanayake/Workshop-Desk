import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useFetch } from '../hooks/useFetch.js';
import { Alert, Pagination, SeatMeter, Spinner, StatusBadge } from '../components/ui.jsx';
import { formatDateTime, thisWeekRange } from '../utils/format.js';

const EMPTY = { q: '', from: '', to: '', status: '', hasSeats: false, page: 1 };

export default function WorkshopsPage() {
  const { can } = useAuth();
  const navigate = useNavigate();
  const [filters, setFilters] = useState({ ...EMPTY, status: 'scheduled', hasSeats: true });
  const [debouncedQ, setDebouncedQ] = useState('');

  // Wait for a pause in typing before searching.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(filters.q), 300);
    return () => clearTimeout(t);
  }, [filters.q]);

  const { data, error, loading } = useFetch(
    () =>
      api.listWorkshops({
        q: debouncedQ,
        status: filters.status,
        hasSeats: filters.hasSeats,
        page: filters.page,
        // Dates are local-day boundaries so "to" includes the whole last day.
        from: filters.from ? new Date(`${filters.from}T00:00:00`).toISOString() : '',
        to: filters.to ? new Date(`${filters.to}T23:59:59`).toISOString() : '',
      }),
    [debouncedQ, filters.status, filters.hasSeats, filters.from, filters.to, filters.page],
  );

  const set = (patch) => setFilters((f) => ({ ...f, page: 1, ...patch }));

  return (
    <>
      <div className="page-head">
        <h1>Workshops</h1>
        {can('workshops:write') && <Link className="btn btn-primary" to="/workshops/new">Add workshop</Link>}
      </div>

      <section className="panel filters" aria-label="Find workshops">
        <label className="grow">Search
          <input type="search" placeholder="Code, title or instructor" value={filters.q} onChange={(e) => set({ q: e.target.value })} />
        </label>
        <label>From
          <input type="date" value={filters.from} onChange={(e) => set({ from: e.target.value })} />
        </label>
        <label>To
          <input type="date" value={filters.to} onChange={(e) => set({ to: e.target.value })} />
        </label>
        <label>Status
          <select value={filters.status} onChange={(e) => set({ status: e.target.value })}>
            <option value="">Any</option>
            <option value="scheduled">Scheduled</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </label>
        <label className="check">
          <input type="checkbox" checked={filters.hasSeats} onChange={(e) => set({ hasSeats: e.target.checked })} />
          Only with seats left
        </label>
        <div className="filter-actions">
          <button type="button" className="btn" onClick={() => set({ ...thisWeekRange(), status: 'scheduled', hasSeats: true })}>This week with seats</button>
          <button type="button" className="btn btn-quiet" onClick={() => { setFilters(EMPTY); }}>Clear all</button>
        </div>
      </section>

      <Alert>{error?.message}</Alert>
      {loading && !data ? <Spinner /> : (
        <section className="panel flush" aria-busy={loading}>
          {data?.data.length === 0 ? (
            <p className="empty">No workshops match these filters. Try widening the dates or turning off “Only with seats left”.</p>
          ) : (
            <table className="table table-clickable">
              <thead>
                <tr><th>Workshop</th><th>When &amp; where</th><th>Seats</th><th>Status</th></tr>
              </thead>
              <tbody>
                {data?.data.map((w) => (
                  <tr key={w._id} onClick={() => navigate(`/workshops/${w._id}`)}>
                    <td>
                      <Link to={`/workshops/${w._id}`} onClick={(e) => e.stopPropagation()} className="row-title">{w.title}</Link>
                      <div className="muted small">{w.code} · {w.instructor}</div>
                    </td>
                    <td>{formatDateTime(w.startsAt)}<div className="muted small">{w.location}</div></td>
                    <td><SeatMeter capacity={w.capacity} taken={w.activeCount} compact /></td>
                    <td><StatusBadge status={w.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}
      <Pagination meta={data?.meta} onPage={(page) => setFilters((f) => ({ ...f, page }))} />
    </>
  );
}
