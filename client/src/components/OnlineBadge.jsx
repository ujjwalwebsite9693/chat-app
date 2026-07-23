export default function OnlineBadge({ isOnline }) {
  return (
    <span className={`online-badge ${isOnline ? "is-online" : ""}`} aria-hidden="true">
      {isOnline && <span className="online-pulse"></span>}
      <span className="online-dot"></span>
    </span>
  );
}
