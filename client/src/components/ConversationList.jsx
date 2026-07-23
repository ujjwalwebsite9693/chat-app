import { useState } from "react";
import Avatar from "./Avatar.jsx";
import OnlineBadge from "./OnlineBadge.jsx";

function getConversationLabel(conversation, currentUserId, nicknames) {
  if (conversation.isSelfNote) return "Saved Messages";
  if (conversation.isGroup) return conversation.groupName;
  const other = conversation.participants.find((p) => p._id !== currentUserId);
  if (!other) return "Unknown user";
  return nicknames?.[other._id] || other.displayName || other.username;
}

function getConversationSubtitle(conversation) {
  if (conversation.isSelfNote) return "Notes, links & files for yourself";
  const last = conversation.lastMessage;
  if (!last) return "Say hello 👋";
  if (last.isDeletedForEveryone) return "This message was deleted";
  if (last.sticker) return `${last.sender?.username ? last.sender.username + ": " : ""}Sticker`;
  if (last.gif) return `${last.sender?.username ? last.sender.username + ": " : ""}GIF`;
  if (last.file && !last.text) {
    const label = last.file.isVoice ? "Voice message" : `📎 ${last.file.name}`;
    return `${last.sender?.username ? last.sender.username + ": " : ""}${label}`;
  }
  const prefix = last.sender?.username ? `${last.sender.username}: ` : "";
  return `${prefix}${last.text}`;
}

export default function ConversationList({
  conversations,
  activeId,
  currentUserId,
  unreadCounts,
  pinnedIds,
  mutedIds,
  lockedIds,
  nicknames,
  onSelect,
  onTogglePin,
  onToggleMute,
  onToggleLock,
  onDeleteChat,
}) {
  const [menuFor, setMenuFor] = useState(null);

  if (conversations.length === 0) {
    return <p className="empty-hint">No conversations yet. Start one below.</p>;
  }

  return (
    <ul className="conversation-list">
      {conversations.map((conversation) => {
        const other = !conversation.isGroup && !conversation.isSelfNote
          ? conversation.participants.find((p) => p._id !== currentUserId)
          : null;
        const unread = unreadCounts[conversation._id] || 0;
        const isPinned = pinnedIds?.has(conversation._id);
        const isMuted = mutedIds?.has(conversation._id);
        const isLocked = lockedIds?.has(conversation._id);

        return (
          <li key={conversation._id} className="conversation-item-wrapper">
            <button
              className={`conversation-item ${conversation._id === activeId ? "is-active" : ""}`}
              onClick={() => onSelect(conversation)}
            >
              {conversation.isSelfNote ? (
                <span className="conversation-avatar" style={{ background: "#F5A623" }}>📌</span>
              ) : conversation.isGroup ? (
                <span className="conversation-avatar" style={{ background: conversation.groupAvatarColor || "#5B6EF5" }}>
                  {conversation.groupName.slice(0, 1).toUpperCase()}
                </span>
              ) : (
                <Avatar user={other}>
                  <OnlineBadge isOnline={other?.isOnline} />
                </Avatar>
              )}

              <span className="conversation-meta">
                <span className="conversation-name">
                  {getConversationLabel(conversation, currentUserId, nicknames)}
                  {isPinned && <span className="pin-tag" title="Pinned">📌</span>}
                  {isMuted && <span className="mute-tag" title="Muted">🔕</span>}
                  {isLocked && <span className="mute-tag" title="Locked">🔒</span>}
                </span>
                <span className="conversation-subtitle">
                  {getConversationSubtitle(conversation)}
                </span>
              </span>

              {unread > 0 && <span className="unread-badge">{unread}</span>}
            </button>

            {!conversation.isSelfNote && (
              <div className="conversation-item-menu-wrap">
                <button
                  className="conversation-item-menu-trigger"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuFor(menuFor === conversation._id ? null : conversation._id);
                  }}
                  aria-label="Conversation options"
                >
                  ⋮
                </button>
                {menuFor === conversation._id && (
                  <>
                    <div className="message-menu-backdrop" onClick={() => setMenuFor(null)}></div>
                    <div className="message-menu conversation-item-menu">
                      <button
                        type="button"
                        onClick={() => {
                          onTogglePin(conversation._id, isPinned);
                          setMenuFor(null);
                        }}
                      >
                        {isPinned ? "📌 Unpin" : "📌 Pin"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onToggleMute(conversation._id, isMuted);
                          setMenuFor(null);
                        }}
                      >
                        {isMuted ? "🔔 Unmute" : "🔕 Mute"}
                      </button>
                      {!conversation.isGroup && (
                        <button
                          type="button"
                          onClick={() => {
                            onToggleLock(conversation._id, isLocked);
                            setMenuFor(null);
                          }}
                        >
                          {isLocked ? "🔓 Unlock chat" : "🔒 Lock chat"}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          onDeleteChat(conversation._id);
                          setMenuFor(null);
                        }}
                      >
                        🗑️ Delete chat
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
