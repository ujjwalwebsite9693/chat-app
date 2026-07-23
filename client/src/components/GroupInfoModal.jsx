import { useState } from "react";
import { userApi } from "../services/api.js";
import Avatar from "./Avatar.jsx";
import OnlineBadge from "./OnlineBadge.jsx";

export default function GroupInfoModal({ conversation, currentUserId, onClose, onRename, onAddMembers, onRemoveMember, onLeave, onOpenProfile }) {
  const [groupName, setGroupName] = useState(conversation.groupName);
  const [isAddingMembers, setIsAddingMembers] = useState(false);
  const [search, setSearch] = useState("");
  const [candidates, setCandidates] = useState([]);

  const isAdmin = conversation.groupAdmin === currentUserId || conversation.groupAdmin?._id === currentUserId;

  function handleSearch(value) {
    setSearch(value);
    if (value.trim().length < 3) return setCandidates([]);
    userApi.list(value).then((res) => {
      const memberIds = new Set(conversation.participants.map((p) => p._id));
      setCandidates(res.data.users.filter((u) => !memberIds.has(u._id)));
    });
  }

  function handleRenameSubmit(e) {
    e.preventDefault();
    if (groupName.trim() && groupName !== conversation.groupName) {
      onRename(groupName.trim());
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Group info</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        {isAdmin ? (
          <form onSubmit={handleRenameSubmit} className="group-rename-form">
            <input
              type="text"
              className="modal-input"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              maxLength={40}
            />
            <button type="submit" className="btn-secondary btn-compact">
              Save
            </button>
          </form>
        ) : (
          <p className="group-name-readonly">{conversation.groupName}</p>
        )}

        <div className="group-members-header">
          <span>{conversation.participants.length} members</span>
          {isAdmin && (
            <button className="link-btn" onClick={() => setIsAddingMembers((v) => !v)}>
              {isAddingMembers ? "Cancel" : "+ Add"}
            </button>
          )}
        </div>

        {isAddingMembers && (
          <div className="group-add-members">
            <input
              type="text"
              className="modal-input"
              placeholder="Enter their exact username"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
            />
            <p className="settings-hint">For privacy, people can only be found by their exact username.</p>
            <ul className="modal-user-list">
              {candidates.map((u) => (
                <li key={u._id}>
                  <button
                    className="modal-user-item"
                    onClick={() => {
                      onAddMembers([u._id]);
                      setIsAddingMembers(false);
                      setSearch("");
                      setCandidates([]);
                    }}
                  >
                    <Avatar user={u} />
                    <span>{u.username}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <ul className="modal-user-list group-member-list">
          {conversation.participants.map((member) => {
            const memberIsAdmin =
              conversation.groupAdmin === member._id || conversation.groupAdmin?._id === member._id;
            return (
              <li key={member._id} className="group-member-row">
                <button
                  type="button"
                  className="group-member-identity"
                  onClick={() => onOpenProfile(member)}
                >
                  <Avatar user={member}>
                    <OnlineBadge isOnline={member.isOnline} />
                  </Avatar>
                  <span className="group-member-name">
                    {member.displayName || member.username}
                    {memberIsAdmin && <span className="admin-tag">Admin</span>}
                  </span>
                </button>
                {isAdmin && member._id !== currentUserId && (
                  <button
                    className="icon-btn"
                    onClick={() => onRemoveMember(member._id)}
                    title="Remove from group"
                  >
                    ✕
                  </button>
                )}
              </li>
            );
          })}
        </ul>

        <button className="btn-danger" onClick={onLeave}>
          Leave group
        </button>
      </div>
    </div>
  );
}
