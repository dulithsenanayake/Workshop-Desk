import { useState } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useFetch } from '../hooks/useFetch.js';
import { Alert, Spinner } from '../components/ui.jsx';
import { ROLE_LABELS, formatDateTime } from '../utils/format.js';

const BLANK = { name: '', email: '', password: '', role: 'staff' };

export default function UsersPage() {
  const { user: me } = useAuth();
  const { data, error, loading, reload } = useFetch(() => api.listUsers(), []);
  const [form, setForm] = useState(BLANK);
  const [message, setMessage] = useState({ kind: '', text: '' });
  const [busy, setBusy] = useState(false);

  const run = async (action, success) => {
    setMessage({ kind: '', text: '' });
    try {
      await action();
      if (success) setMessage({ kind: 'success', text: success });
      reload();
      return true;
    } catch (err) {
      setMessage({ kind: 'error', text: err.message });
      return false;
    }
  };

  const create = async (e) => {
    e.preventDefault();
    setBusy(true);
    if (await run(() => api.createUser(form), `Account created for ${form.email}.`)) setForm(BLANK);
    setBusy(false);
  };

  const resetPassword = (u) => {
    const password = window.prompt(`New password for ${u.name} (min. 8 characters):`);
    if (password) run(() => api.updateUser(u._id, { password }), `Password reset for ${u.email}.`);
  };

  return (
    <>
      <div className="page-head"><h1>Accounts</h1></div>
      <Alert kind={message.kind || 'error'}>{message.text}</Alert>

      <form className="panel form-grid" onSubmit={create}>
        <h2 className="span-2">Create an account</h2>
        <label>Name<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
        <label>Email<input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
        <label>Temporary password<input type="password" required minLength={8} autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></label>
        <label>Role
          <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            <option value="staff">Front desk: registers and cancels attendees</option>
            <option value="manager">Manager: also adds and edits workshops</option>
            <option value="admin">Admin: manages accounts only</option>
          </select>
        </label>
        <div className="span-2"><button className="btn btn-primary" disabled={busy}>Create account</button></div>
      </form>

      <Alert>{error?.message}</Alert>
      {loading && !data ? <Spinner /> : (
        <section className="panel flush">
          <table className="table">
            <thead><tr><th>Person</th><th>Role</th><th>Access</th><th><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>
              {data?.data.map((u) => {
                const isMe = u._id === me._id;
                return (
                  <tr key={u._id} className={u.isActive ? '' : 'is-cancelled'}>
                    <td>{u.name}{isMe && <span className="muted"> (you)</span>}<div className="muted small">{u.email} · added {formatDateTime(u.createdAt)}</div></td>
                    <td>
                      <select aria-label={`Role for ${u.name}`} value={u.role} disabled={isMe} title={isMe ? 'You cannot change your own role' : ''}
                        onChange={(e) => run(() => api.updateUser(u._id, { role: e.target.value }), `${u.name} is now ${ROLE_LABELS[e.target.value]}.`)}>
                        {Object.entries(ROLE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                      </select>
                    </td>
                    <td><span className={`badge badge-${u.isActive ? 'scheduled' : 'cancelled'}`}>{u.isActive ? 'active' : 'disabled'}</span></td>
                    <td className="right row">
                      <button className="btn btn-quiet" onClick={() => resetPassword(u)}>Reset password</button>
                      {!isMe && (
                        <button className={u.isActive ? 'btn btn-danger' : 'btn'} onClick={() => run(() => api.updateUser(u._id, { isActive: !u.isActive }), `${u.name} ${u.isActive ? 'disabled' : 'enabled'}.`)}>
                          {u.isActive ? 'Disable' : 'Enable'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}
    </>
  );
}
