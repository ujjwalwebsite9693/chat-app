const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

function resolveUrl(url) {
  if (!url) return "";
  return url.startsWith("http") ? url : `${SOCKET_URL}${url}`;
}

// Renders a user's real photo when they have one, falling back to their
// colored initial otherwise. Used everywhere a person's avatar shows up so
// the "photo doesn't show to other people" bug can't reappear in just one spot.
export default function Avatar({ user, size, className = "", children }) {
  const style = { background: user?.avatarColor || "#5B6EF5" };
  if (size) {
    style.width = size;
    style.height = size;
    style.minWidth = size;
  }

  return (
    <span className={`conversation-avatar ${className}`} style={style}>
      {user?.avatarUrl ? (
        <img src={resolveUrl(user.avatarUrl)} alt="" />
      ) : (
        (user?.username || "?").slice(0, 1).toUpperCase()
      )}
      {children}
    </span>
  );
}
