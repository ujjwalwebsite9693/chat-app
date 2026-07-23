import { STICKER_PACK } from "../data/stickerData.js";

export default function StickerPicker({ onSelect }) {
  return (
    <div className="picker-panel sticker-picker">
      <div className="picker-grid sticker-grid">
        {STICKER_PACK.map((sticker) => (
          <button
            type="button"
            key={sticker.id}
            className="picker-sticker-btn"
            onClick={() => onSelect(sticker)}
            title={sticker.label}
          >
            <img src={sticker.url} alt={sticker.label} />
          </button>
        ))}
      </div>
    </div>
  );
}
