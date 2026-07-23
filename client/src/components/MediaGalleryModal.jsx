import { useEffect, useState } from "react";
import { messageApi } from "../services/api.js";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

const TITLES = { file: "Files", gif: "GIFs", sticker: "Stickers" };

export default function MediaGalleryModal({ conversationId, type, onClose }) {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    messageApi
      .media(conversationId, type)
      .then((res) => setItems(res.data.messages))
      .finally(() => setIsLoading(false));
  }, [conversationId, type]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{TITLES[type]}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        {isLoading && <p className="empty-hint">Loading…</p>}
        {!isLoading && items.length === 0 && <p className="empty-hint">Nothing here yet.</p>}

        {!isLoading && type === "file" && (
          <ul className="gallery-file-list">
            {items.map((m) => (
              <li key={m._id}>
                <a href={`${SOCKET_URL}${m.file.url}`} target="_blank" rel="noreferrer" className="gallery-file-item">
                  <span>{m.file.mimeType?.startsWith("image/") ? "🖼️" : "📎"}</span>
                  <span className="gallery-file-name">{m.file.name}</span>
                  <span className="gallery-file-date">{new Date(m.createdAt).toLocaleDateString()}</span>
                </a>
              </li>
            ))}
          </ul>
        )}

        {!isLoading && (type === "gif" || type === "sticker") && (
          <div className="gallery-grid">
            {items.map((m) => (
              <img
                key={m._id}
                src={type === "gif" ? m.gif.url : m.sticker.url}
                alt=""
                className="gallery-grid-item"
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
