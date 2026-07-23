import { useState } from "react";
import ConversationList from "./ConversationList.jsx";
import Avatar from "./Avatar.jsx";
import OnlineBadge from "./OnlineBadge.jsx";

export default function Sidebar({
  user,
  conversations,
  activeId,
  unreadCounts,
  pinnedIds,
  mutedIds,
  lockedIds,
  unlockedSession,
  nicknames,
  onSelect,
  onNewChat,
  onLogout,
  onOpenSettings,
  onTogglePin,
  onToggleMute,
  onToggleLock,
  onDeleteChat,
  onOpenLockedChats,
}) {
  const [filter, setFilter] = useState("");

  const displayLabel = (c) => {
    if (c.isSelfNote) return "saved messages";
    if (c.isGroup) return c.groupName;
    const other = c.participants.find((p) => p._id !== user.id);
    if (!other) return "";
    return nicknames?.[other._id] || other.displayName || other.username;
  };

  const isLocked = (c) => lockedIds?.has(c._id) && !c.isGroup && !c.isSelfNote;

  const visible = conversations.filter((c) => unlockedSession || !isLocked(c));
  const lockedCount = conversations.filter((c) => !unlockedSession && isLocked(c)).length;

  const filtered = visible.filter((c) => {
    if (!filter.trim()) return true;
    return displayLabel(c).toLowerCase().includes(filter.toLowerCase());
  });

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="current-user" onClick={onOpenSettings} role="button" tabIndex={0}>
          <Avatar user={user}>
            <OnlineBadge isOnline />
          </Avatar>
          <span className="current-username">{user.displayName || user.username}</span>
        </div>
        <div className="sidebar-header-actions">
          <button className="icon-btn" onClick={onOpenSettings} title="Settings">
            ⚙️
          </button>
          <button className="icon-btn" onClick={onLogout} title="Log out">
            ⎋
          </button>
        </div>
      </div>

      <div className="sidebar-search">
        <input
          type="text"
          placeholder="Search conversations"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>

      <button className="new-chat-btn" onClick={onNewChat}>
        + New chat
      </button>

      <div className="sidebar-scroll">
        <ConversationList
          conversations={filtered}
          activeId={activeId}
          currentUserId={user.id}
          unreadCounts={unreadCounts}
          pinnedIds={pinnedIds}
          mutedIds={mutedIds}
          lockedIds={lockedIds}
          nicknames={nicknames}
          onSelect={onSelect}
          onTogglePin={onTogglePin}
          onToggleMute={onToggleMute}
          onToggleLock={onToggleLock}
          onDeleteChat={onDeleteChat}
        />
        {lockedCount > 0 && (
          <button className="locked-chats-row" onClick={onOpenLockedChats}>
            🔒 Locked chats ({lockedCount}) — tap to unlock
          </button>
        )}
      </div>
    </aside>
  );
}
