import { useState } from "react";
import { linkifyText } from "../utils/linkify.js";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";
const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

function formatTime(dateString) {
  return new Date(dateString).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(seconds = 0) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function isImage(mimeType = "") {
  return mimeType.startsWith("image/");
}

function replySnippet(replyTo) {
  if (!replyTo) return "";
  if (replyTo.isDeletedForEveryone) return "This message was deleted";
  if (replyTo.text) return replyTo.text;
  if (replyTo.file) return "📎 Attachment";
  if (replyTo.sticker) return "Sticker";
  if (replyTo.gif) return "GIF";
  return "";
}

export default function MessageBubble({
  message,
  isOwn,
  showSender,
  isRead,
  seenAt,
  readCount,
  currentUserId,
  isMenuOpen,
  onToggleMenu,
  onReply,
  onEdit,
  onDelete,
  onToggleReaction,
}) {
  const [showSeenTooltip, setShowSeenTooltip] = useState(false);

  function handleCopy() {
    navigator.clipboard?.writeText(message.text || "");
    onToggleMenu();
  }

  const reactionGroups = (message.reactions || []).reduce((acc, r) => {
    acc[r.emoji] = acc[r.emoji] || { emoji: r.emoji, count: 0, byMe: false };
    acc[r.emoji].count += 1;
    if (r.user === currentUserId || r.user?._id === currentUserId) acc[r.emoji].byMe = true;
    return acc;
  }, {});

  if (message.isDeletedForEveryone) {
    return (
      <div className={`message-row ${isOwn ? "is-own" : ""}`}>
        <div className="message-bubble is-deleted">
          <p className="message-text message-text-deleted">🚫 This message was deleted</p>
          <span className="message-time">{formatTime(message.createdAt)}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`message-row ${isOwn ? "is-own" : ""}`}>
      <div className="message-bubble">
        <button
          type="button"
          className="message-menu-trigger"
          onClick={onToggleMenu}
          aria-label="Message actions"
        >
          ⋮
        </button>

        {isMenuOpen && (
          <>
            <div className="message-menu-backdrop" onClick={onToggleMenu}></div>
            <div className="message-menu">
              <div className="quick-reactions">
                {QUICK_REACTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => {
                      onToggleReaction(message._id, emoji);
                      onToggleMenu();
                    }}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => {
                  onReply(message);
                  onToggleMenu();
                }}
              >
                ↩️ Reply
              </button>
              {message.text && (
                <button type="button" onClick={handleCopy}>
                  📋 Copy text
                </button>
              )}
              {isOwn && message.text && (
                <button
                  type="button"
                  onClick={() => {
                    onEdit(message);
                    onToggleMenu();
                  }}
                >
                  ✏️ Edit
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  onDelete(message, "me");
                  onToggleMenu();
                }}
              >
                🗑️ Delete for me
              </button>
              {isOwn && (
                <button
                  type="button"
                  onClick={() => {
                    onDelete(message, "everyone");
                    onToggleMenu();
                  }}
                >
                  🗑️ Delete for everyone
                </button>
              )}
            </div>
          </>
        )}

        {showSender && !isOwn && (
          <span className="message-sender" style={{ color: message.sender?.avatarColor }}>
            {message.sender?.username}
          </span>
        )}

        {message.replyTo && (
          <div className="message-reply-quote">
            <strong>{message.replyTo.sender?.username || "Message"}</strong>
            <span>{replySnippet(message.replyTo)}</span>
          </div>
        )}

        {message.text && (
          <p className="message-text">
            {linkifyText(message.text).map((part) =>
              part.type === "link" ? (
                <a key={part.key} href={part.href} target="_blank" rel="noreferrer">
                  {part.text}
                </a>
              ) : (
                <span key={part.key}>{part.text}</span>
              )
            )}
          </p>
        )}

        {message.sticker?.url && (
          <div className="message-attachment">
            <img src={message.sticker.url} alt={message.sticker.label} className="attachment-sticker" />
          </div>
        )}

        {message.gif?.url && (
          <div className="message-attachment">
            <img src={message.gif.url} alt="GIF" className="attachment-image" />
          </div>
        )}

        {message.file?.isVoice && (
          <div className="message-attachment voice-message">
            <audio controls src={`${SOCKET_URL}${message.file.url}`}></audio>
            {message.file.durationSeconds != null && (
              <span className="voice-duration">{formatDuration(message.file.durationSeconds)}</span>
            )}
          </div>
        )}

        {message.file?.url && !message.file.isVoice && (
          <div className="message-attachment">
            {isImage(message.file.mimeType) ? (
              <img
                src={`${SOCKET_URL}${message.file.url}`}
                alt={message.file.name}
                className="attachment-image"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.classList.add("attachment-image-broken");
                  e.currentTarget.alt = "⚠️ Image failed to load";
                }}
              />
            ) : (
              <a
                href={`${SOCKET_URL}${message.file.url}`}
                target="_blank"
                rel="noreferrer"
                className="attachment-file"
              >
                📎 {message.file.name}
              </a>
            )}
          </div>
        )}

        {Object.keys(reactionGroups).length > 0 && (
          <div className="reaction-pills">
            {Object.values(reactionGroups).map((r) => (
              <button
                key={r.emoji}
                type="button"
                className={`reaction-pill ${r.byMe ? "is-mine" : ""}`}
                onClick={() => onToggleReaction(message._id, r.emoji)}
              >
                {r.emoji} {r.count}
              </button>
            ))}
          </div>
        )}

        <span className="message-time">
          {message.editedAt && <span className="edited-tag">edited · </span>}
          {formatTime(message.createdAt)}
          {isOwn && (
            <span
              className={`read-tick ${isRead ? "is-read" : ""}`}
              onClick={(e) => {
                if (!isRead) return;
                e.stopPropagation();
                setShowSeenTooltip((v) => !v);
              }}
            >
              {" "}
              {isRead ? "✓✓" : "✓"}
              {showSeenTooltip && isRead && (
                <span className="seen-tooltip">
                  {seenAt ? `Seen at ${formatTime(seenAt)}` : readCount ? `Seen by ${readCount}` : "Seen"}
                </span>
              )}
            </span>
          )}
        </span>
      </div>
    </div>
  );
}