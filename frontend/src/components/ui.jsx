import { Link, useNavigate } from 'react-router-dom';

export const Alert = ({ children, kind = 'error' }) =>
  children ? <div className={`alert alert-${kind}`} role={kind === 'error' ? 'alert' : 'status'}>{children}</div> : null;

export const Spinner = ({ label = 'Loading…' }) => <p className="muted" role="status">{label}</p>;

export const StatusBadge = ({ status }) => <span className={`badge badge-${status}`}>{status}</span>;

/**
 * One square per seat: filled = taken. This is the main thing front-desk staff scan for,
 * so it is the one visually distinctive element in the app.
 */
export function SeatMeter({ capacity, taken, compact = false }) {
  const left = Math.max(capacity - taken, 0);
  const tone = left === 0 ? 'full' : left <= Math.ceil(capacity * 0.2) ? 'low' : 'open';
  const showPips = capacity <= 30;
  return (
    <div className={`seats seats-${tone}`} aria-label={`${taken} of ${capacity} seats taken`}>
      {showPips ? (
        <div className="pips" aria-hidden="true">
          {Array.from({ length: capacity }, (_, i) => <span key={i} className={i < taken ? 'pip pip-taken' : 'pip'} />)}
        </div>
      ) : (
        <div className="bar" aria-hidden="true"><span style={{ width: `${(taken / capacity) * 100}%` }} /></div>
      )}
      <span className="seats-text">{left === 0 ? 'Full' : compact ? `${left} left` : `${left} of ${capacity} seats left`}</span>
    </div>
  );
}

export function Pagination({ meta, onPage }) {
  if (!meta || meta.total <= meta.limit) return null;
  const pages = Math.ceil(meta.total / meta.limit);
  return (
    <div className="pagination">
      <button className="btn btn-quiet" disabled={meta.page <= 1} onClick={() => onPage(meta.page - 1)}>Previous</button>
      <span className="muted">Page {meta.page} of {pages}</span>
      <button className="btn btn-quiet" disabled={meta.page >= pages} onClick={() => onPage(meta.page + 1)}>Next</button>
    </div>
  );
}

export const BackLink = ({ to, children }) => <Link className="back" to={to}>‹ {children}</Link>;

export function useGoBack(fallback) {
  const navigate = useNavigate();
  return () => navigate(fallback);
}
