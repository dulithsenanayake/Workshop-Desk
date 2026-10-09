import { useState } from 'react';
import { api } from '../api/client.js';
import { useFetch } from '../hooks/useFetch.js';
import { Alert, Pagination, Spinner } from '../components/ui.jsx';
import { formatDateTime } from '../utils/format.js';

const show = (v) => (v === null || v === undefined || v === '' ? '—' : String(v));

export default function AuditPage() {
  const [entityType, setEntityType] = useState('');
  const [page, setPage] = useState(1);
  const { data, error, loading } = useFetch(() => api.listAudit({ entityType, page }), [entityType, page]);

  return (
    <>
      <div className="page-head">
        <h1>Activity log</h1>
        <label className="inline">Show
          <select value={entityType} onChange={(e) => { setEntityType(e.target.value); setPage(1); }}>
            <option value="">Everything</option>
            <option value="user">Account changes</option>
            <option value="workshop">Workshop changes</option>
          </select>
        </label>
      </div>
      <Alert>{error?.message}</Alert>
      {loading && !data ? <Spinner /> : (
        <section className="panel flush">
          {data?.data.length === 0 ? <p className="empty">Nothing has been logged yet.</p> : (
            <table className="table">
              <thead><tr><th>When</th><th>Who</th><th>What happened</th></tr></thead>
              <tbody>
                {data?.data.map((a) => (
                  <tr key={a._id}>
                    <td>{formatDateTime(a.at)}</td>
                    <td>{a.actorName}</td>
                    <td>
                      {a.summary}
                      {Object.entries(a.changes ?? {}).map(([field, c]) => (
                        <div key={field} className="muted small">{field}: {show(c.from)} → {show(c.to)}</div>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}
      <Pagination meta={data?.meta} onPage={setPage} />
    </>
  );
}
