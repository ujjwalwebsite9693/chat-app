import { useEffect, useState } from "react";
import { gifApi } from "../services/api.js";

export default function GifPicker({ onSelect }) {
  const [query, setQuery] = useState("");
  const [gifs, setGifs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    gifApi
      .trending()
      .then((res) => setGifs(res.data.gifs))
      .catch((err) => setError(err.response?.data?.message || "Couldn't load GIFs"))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setIsLoading(true);
      const request = query.trim() ? gifApi.search(query) : gifApi.trending();
      request
        .then((res) => setGifs(res.data.gifs))
        .catch((err) => setError(err.response?.data?.message || "Couldn't load GIFs"))
        .finally(() => setIsLoading(false));
    }, 350);
    return () => clearTimeout(timeout);
  }, [query]);

  return (
    <div className="picker-panel gif-picker">
      <input
        type="text"
        className="modal-input"
        placeholder="Search GIFs"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {error && <p className="empty-hint">{error}</p>}
      {!error && isLoading && <p className="empty-hint">Loading…</p>}
      {!error && !isLoading && gifs.length === 0 && (
        <p className="empty-hint">No GIFs found.</p>
      )}

      <div className="gif-grid">
        {gifs.map((gif) => (
          <button
            type="button"
            key={gif.id}
            className="gif-btn"
            onClick={() => onSelect(gif)}
            title={gif.title}
          >
            <img src={gif.previewUrl} alt={gif.title} loading="lazy" />
          </button>
        ))}
      </div>
    </div>
  );
}
