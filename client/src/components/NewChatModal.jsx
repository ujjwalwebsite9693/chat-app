import { useEffect, useState } from "react";
import { userApi } from "../services/api.js";
import Avatar from "./Avatar.jsx";
import OnlineBadge from "./OnlineBadge.jsx";

export default function NewChatModal({ onClose, onCreatePrivate, onCreateGroup }) {
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState([]);
  const [isGroupMode, setIsGroupMode] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);

  useEffect(() => {
    if (search.trim().length < 3) {
      setUsers([]);
      return;
    }
    const timeout = setTimeout(() => {
      userApi.list(search).then((res) => setUsers(res.data.users));
    }, 250);
    return () => clearTimeout(timeout);
  }, [search]);

  function toggleSelected(userId) {
    setSelectedIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  }

  function handleUserClick(user) {
    if (isGroupMode) {
      toggleSelected(user._id);
    } else {
      onCreatePrivate(user._id);
    }
  }

  function handleCreateGroup() {
    if (!groupName.trim() || selectedIds.length < 2) return;
    onCreateGroup(groupName.trim(), selectedIds);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isGroupMode ? "New group" : "New conversation"}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="modal-tabs">
          <button
            className={!isGroupMode ? "is-active" : ""}
            onClick={() => setIsGroupMode(false)}
          >
            Direct message
          </button>
          <button
            className={isGroupMode ? "is-active" : ""}
            onClick={() => setIsGroupMode(true)}
          >
            Group chat
          </button>
        </div>

        {isGroupMode && (
          <input
            type="text"
            className="modal-input"
            placeholder="Group name"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
          />
        )}

        <input
          type="text"
          className="modal-input"
          placeholder="Enter their exact username"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <p className="settings-hint">
          For privacy, people can only be found by their exact username — nobody is listed by default.
        </p>

        <ul className="modal-user-list">
          {users.map((user) => (
            <li key={user._id}>
              <button
                className={`modal-user-item ${
                  selectedIds.includes(user._id) ? "is-selected" : ""
                }`}
                onClick={() => handleUserClick(user)}
              >
                <Avatar user={user}>
                  <OnlineBadge isOnline={user.isOnline} />
                </Avatar>
                <span>{user.displayName || user.username}</span>
                {isGroupMode && selectedIds.includes(user._id) && (
                  <span className="check-mark">✓</span>
                )}
              </button>
            </li>
          ))}
          {search.trim().length >= 3 && users.length === 0 && (
            <p className="empty-hint">No one found with that exact username.</p>
          )}
        </ul>

        {isGroupMode && (
          <button
            className="btn-primary"
            onClick={handleCreateGroup}
            disabled={!groupName.trim() || selectedIds.length < 2}
          >
            Create group ({selectedIds.length} selected)
          </button>
        )}
      </div>
    </div>
  );
}
