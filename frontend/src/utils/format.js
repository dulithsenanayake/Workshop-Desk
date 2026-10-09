const dateTime = new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
const dateOnly = new Intl.DateTimeFormat(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

export const formatDateTime = (iso) => (iso ? dateTime.format(new Date(iso)) : '');
export const formatLongDate = (iso) => (iso ? dateOnly.format(new Date(iso)) : '');

/** ISO string -> value for <input type="datetime-local"> in the user's timezone. */
export const toLocalInput = (iso) => {
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/** Monday 00:00 to Sunday 23:59 of the current week, as YYYY-MM-DD strings for date inputs. */
export function thisWeekRange() {
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (d) => toLocalInput(d).slice(0, 10);
  return { from: fmt(monday), to: fmt(sunday) };
}

export const ROLE_LABELS = { admin: 'Admin', manager: 'Manager', staff: 'Front desk' };

const timeOnly = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' });
export const formatTime = (iso) => (iso ? timeOnly.format(new Date(iso)) : '');
