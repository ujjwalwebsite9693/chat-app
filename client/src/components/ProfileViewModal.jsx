import { useEffect, useState } from "react";
import { conversationApi, userApi } from "../services/api.js";
import Avatar from "./Avatar.jsx";
import OnlineBadge from "./OnlineBadge.jsx";
import MediaGalleryModal from "./MediaGalleryModal.jsx";

function formatLastSeen(dateString) {
  if (!dateString) return "";
  const diffMs = Date.now() - new Date(dateString).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function ProfileViewModal({
  profileUser,
  conversationId,
  isOwn,
  currentNickname,
  onNicknameSaved,
  onClose,
  onMessagePrivately,
  onBlock,
}) {
  const [stats, setStats] = useState(null);
  const [galleryType, setGalleryType] = useState(null); // 'file' | 'gif' | 'sticker' | null
  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const [nicknameInput, setNicknameInput] = useState(currentNickname || "");

  useEffect(() => {
    if (!conversationId) return;
    conversationApi
      .memberStats(conversationId, profileUser._id)
      .then((res) => setStats(res.data))
      .catch(() => setStats(null));
  }, [conversationId, profileUser._id]);

  const showPresence = profileUser.showLastSeen !== false;

  async function handleSaveNickname() {
    const trimmed = nicknameInput.trim();
    if (trimmed) {
      await userApi.setNickname(profileUser._id, trimmed);
    } else {
      await userApi.removeNickname(profileUser._id);
    }
    onNicknameSaved(profileUser._id, trimmed);
    setIsEditingNickname(false);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel profile-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Profile</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="profile-hero">
          <Avatar user={profileUser} size="88px" className="avatar-xl">
            {showPresence && <OnlineBadge isOnline={profileUser.isOnline} />}
          </Avatar>
          <h3 className="profile-username">{currentNickname || profileUser.displayName || profileUser.username}</h3>
          {(currentNickname || profileUser.displayName) && (
            <p className="profile-handle">@{profileUser.username}</p>
          )}
          {showPresence && (
            <p className="profile-presence">
              {profileUser.isOnline ? "Online now" : profileUser.lastSeen ? `Last seen ${formatLastSeen(profileUser.lastSeen)}` : "Offline"}
            </p>
          )}
        </div>

        {!isOwn && (
          <div className="nickname-row">
            {isEditingNickname ? (
              <>
                <input
                  type="text"
                  className="modal-input"
                  placeholder="Set a custom name (only you see this)"
                  value={nicknameInput}
                  onChange={(e) => setNicknameInput(e.target.value)}
                  maxLength={40}
                />
                <button className="btn-secondary btn-compact" onClick={handleSaveNickname}>
                  Save
                </button>
              </>
            ) : (
              <button className="link-btn" onClick={() => setIsEditingNickname(true)}>
                ✏️ {currentNickname ? "Edit custom name" : "Set a custom name for them"}
              </button>
            )}
          </div>
        )}

        {profileUser.bio && <p className="profile-bio">{profileUser.bio}</p>}

        {conversationId && (
          <>
            <div className="profile-stats">
              <button className="profile-stat" onClick={() => setGalleryType(null)} disabled>
                <strong>{stats ? stats.totalMessages : "…"}</strong>
                <span>Messages</span>
              </button>
              <button className="profile-stat" onClick={() => setGalleryType("file")}>
                <strong>{stats ? stats.totalFiles : "…"}</strong>
                <span>Files</span>
              </button>
              <button className="profile-stat" onClick={() => setGalleryType("gif")}>
                <strong>{stats ? stats.totalGifs : "…"}</strong>
                <span>GIFs</span>
              </button>
              <button className="profile-stat" onClick={() => setGalleryType("sticker")}>
                <strong>{stats ? stats.totalStickers : "…"}</strong>
                <span>Stickers</span>
              </button>
            </div>
            <p className="settings-hint profile-stats-note">
              Stats are just for this conversation. Tap Files/GIFs/Stickers to view them.
            </p>
          </>
        )}

        {!isOwn && (
          <div className="profile-actions">
            {onMessagePrivately && (
              <button className="btn-primary" onClick={() => onMessagePrivately(profileUser._id)}>
                💬 Message privately
              </button>
            )}
            {onBlock && (
              <button className="btn-danger" onClick={() => onBlock(profileUser._id)}>
                🚫 Block user
              </button>
            )}
          </div>
        )}
      </div>

      {galleryType && (
        <MediaGalleryModal
          conversationId={conversationId}
          type={galleryType}
          onClose={() => setGalleryType(null)}
        />
      )}
    </div>
  );
}
