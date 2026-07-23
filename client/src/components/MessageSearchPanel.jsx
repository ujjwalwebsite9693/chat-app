import { useEffect, useState } from "react";
import { messageApi } from "../services/api.js";

function snippetOf(message) {
  if (message.text) return message.text;
  if (message.file) return message.file.isVoice ? "🎤 Voice message" : `📎 ${message.file.name}`;
  if (message.sticker) return "Sticker";
  if (message.gif) return "GIF";
  return "";
}

export default function MessageSearchPanel({ conversationId, onClose, onJumpToMessage }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    setIsLoading(true);
    const timeout = setTimeout(() => {
      messageApi
        .search(conversationId, query)
        .then((res) => setResults(res.data.messages))
        .finally(() => setIsLoading(false));
    }, 300);
    return () => clearTimeout(timeout);
  }, [query, conversationId]);

  return (
    <div className="search-panel">
      <div className="search-panel-bar">
        <input
          type="text"
          autoFocus
          placeholder="Search in this chat"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button className="icon-btn" onClick={onClose} aria-label="Close search">
          ✕
        </button>
      </div>

      {query.trim() && (
        <div className="search-results">
          {isLoading && <p className="empty-hint">Searching…</p>}
          {!isLoading && results.length === 0 && <p className="empty-hint">No messages found.</p>}
          {!isLoading &&
            results.map((m) => (
              <button key={m._id} className="search-result-item" onClick={() => onJumpToMessage(m._id)}>
                <strong>{m.sender?.username}</strong>
                <span>{snippetOf(m)}</span>
                <span className="search-result-time">{new Date(m.createdAt).toLocaleString()}</span>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
