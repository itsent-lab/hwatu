export default function ShakeBellIcon() {
  return <svg className="shake-status-icon" viewBox="0 0 32 32" aria-hidden="true">
    <path className="bell-handle" d="M12.5 8c0-2.2 1.5-4 3.5-4s3.5 1.8 3.5 4" />
    <path className="bell-body" d="M7 22.5h18c-2.5-2.4-3.6-5.1-3.6-8.7 0-3.7-2.4-6.5-5.4-6.5s-5.4 2.8-5.4 6.5c0 3.6-1.1 6.3-3.6 8.7Z" />
    <path className="bell-highlight" d="M12.5 11.2c-1.1 2.2-.5 6.1-1.8 8.2" />
    <path className="bell-rim" d="M6.5 22.3h19" />
    <circle className="bell-clapper" cx="16" cy="26" r="2.7" />
  </svg>;
}
