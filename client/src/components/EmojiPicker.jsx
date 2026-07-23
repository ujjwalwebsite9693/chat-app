import { useState } from "react";
import { EMOJI_CATEGORIES } from "../data/emojiData.js";

export default function EmojiPicker({ onSelect }) {
  const [activeCategory, setActiveCategory] = useState(0);

  return (
    <div className="picker-panel emoji-picker">
      <div className="picker-grid">
        {EMOJI_CATEGORIES[activeCategory].emojis.map((emoji) => (
          <button
            type="button"
            key={emoji}
            className="picker-emoji-btn"
            onClick={() => onSelect(emoji)}
            aria-label={emoji}
          >
            {emoji}
          </button>
        ))}
      </div>
      <div className="picker-tabs">
        {EMOJI_CATEGORIES.map((cat, index) => (
          <button
            type="button"
            key={cat.name}
            className={`picker-tab ${index === activeCategory ? "is-active" : ""}`}
            onClick={() => setActiveCategory(index)}
            title={cat.name}
          >
            {cat.icon}
          </button>
        ))}
      </div>
    </div>
  );
}
