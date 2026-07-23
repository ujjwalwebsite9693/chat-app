import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useAppearance, ACCENT_OPTIONS, WALLPAPER_OPTIONS } from "../context/AppearanceContext.jsx";
import { userApi, messageApi } from "../services/api.js";
import Avatar from "./Avatar.jsx";

const TABS = ["Profile", "Appearance", "Privacy & Security", "About"];

export default function SettingsModal({ onClose }) {
  const { user, updateUser } = useAuth();
  const { theme, accentColor, wallpaper, wallpaperCustomUrl, updateAppearance } = useAppearance();
  const [tab, setTab] = useState("Profile");

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel settings-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Settings</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="modal-tabs settings-tabs">
          {TABS.map((t) => (
            <button key={t} className={tab === t ? "is-active" : ""} onClick={() => setTab(t)}>
              {t}
            </button>
          ))}
        </div>

        <div className="settings-body">
          {tab === "Profile" && <ProfileTab user={user} updateUser={updateUser} />}
          {tab === "Appearance" && (
            <AppearanceTab
              theme={theme}
              accentColor={accentColor}
              wallpaper={wallpaper}
              wallpaperCustomUrl={wallpaperCustomUrl}
              updateAppearance={updateAppearance}
            />
          )}
          {tab === "Privacy & Security" && <PrivacyTab user={user} updateUser={updateUser} />}
          {tab === "About" && <AboutTab onClose={onClose} />}
        </div>
      </div>
    </div>
  );
}

function ProfileTab({ user, updateUser }) {
  const [username, setUsername] = useState(user.username);
  const [displayName, setDisplayName] = useState(user.displayName || "");
  const [bio, setBio] = useState(user.bio || "");
  const [showLastSeen, setShowLastSeen] = useState(user.showLastSeen);
  const [status, setStatus] = useState("");
  const fileInputRef = useRef(null);

  async function handleAvatarChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await userApi.uploadAvatar(formData);
      updateUser(res.data.user);
    } catch (err) {
      setStatus(err.response?.data?.message || "Could not update photo");
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    setStatus("");
    try {
      const res = await userApi.updateProfile({ username, displayName, bio, showLastSeen });
      updateUser(res.data.user);
      setStatus("Saved ✓");
    } catch (err) {
      setStatus(err.response?.data?.message || "Could not save profile");
    }
  }

  return (
    <form className="settings-form" onSubmit={handleSave}>
      <div className="avatar-upload-row">
        <Avatar user={user} size="72px" className="avatar-large" />
        <button type="button" className="btn-secondary btn-compact" onClick={() => fileInputRef.current?.click()}>
          Change photo
        </button>
        <input ref={fileInputRef} type="file" hidden accept="image/*" onChange={handleAvatarChange} />
      </div>

      <label className="field">
        <span>Username</span>
        <input value={username} onChange={(e) => setUsername(e.target.value)} minLength={3} maxLength={24} required />
      </label>

      <label className="field">
        <span>Display name (shown alongside your username)</span>
        <input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          maxLength={40}
          placeholder="e.g. your real name"
        />
      </label>

      <label className="field">
        <span>About / status</span>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          maxLength={140}
          rows={3}
          placeholder="Say something about yourself"
        />
      </label>

      <label className="toggle-row">
        <span>Show my online status &amp; last seen</span>
        <input
          type="checkbox"
          checked={showLastSeen}
          onChange={(e) => setShowLastSeen(e.target.checked)}
        />
      </label>

      {status && <p className="settings-status">{status}</p>}
      <button type="submit" className="btn-primary">
        Save profile
      </button>
    </form>
  );
}

function AppearanceTab({ theme, accentColor, wallpaper, wallpaperCustomUrl, updateAppearance }) {
  const [status, setStatus] = useState("");
  const fileInputRef = useRef(null);

  async function apply(partial) {
    try {
      await updateAppearance(partial);
    } catch (err) {
      setStatus(err.response?.data?.message || "Could not update appearance");
    }
  }

  async function handleCustomWallpaper(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await messageApi.upload(formData);
      await apply({ wallpaper: "custom", wallpaperCustomUrl: res.data.file.url });
    } catch (err) {
      setStatus(err.response?.data?.message || "Could not upload wallpaper");
    }
  }

  return (
    <div className="settings-form">
      <div className="settings-section">
        <span className="settings-label">Theme</span>
        <div className="theme-toggle">
          <button className={theme === "dark" ? "is-active" : ""} onClick={() => apply({ theme: "dark" })}>
            🌙 Dark
          </button>
          <button className={theme === "light" ? "is-active" : ""} onClick={() => apply({ theme: "light" })}>
            ☀️ Light
          </button>
        </div>
      </div>

      <div className="settings-section">
        <span className="settings-label">Accent color</span>
        <div className="accent-swatches">
          {ACCENT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              className={`swatch ${accentColor === opt.value ? "is-active" : ""}`}
              style={{ background: opt.value }}
              title={opt.label}
              onClick={() => apply({ accentColor: opt.value })}
            />
          ))}
        </div>
      </div>

      <div className="settings-section">
        <span className="settings-label">Chat wallpaper</span>
        <div className="wallpaper-grid">
          {WALLPAPER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              className={`wallpaper-swatch wallpaper-${opt.value} ${wallpaper === opt.value ? "is-active" : ""}`}
              onClick={() =>
                opt.value === "custom" ? fileInputRef.current?.click() : apply({ wallpaper: opt.value })
              }
            >
              {opt.label}
            </button>
          ))}
        </div>
        <input ref={fileInputRef} type="file" hidden accept="image/*" onChange={handleCustomWallpaper} />
        {wallpaper === "custom" && wallpaperCustomUrl && (
          <p className="settings-hint">Custom wallpaper applied ✓</p>
        )}
      </div>

      {status && <p className="settings-status">{status}</p>}
    </div>
  );
}

function AboutTab({ onClose }) {
  return (
    <div className="settings-form">
      <div className="settings-section">
        <span className="settings-label">Relay</span>
        <p className="settings-hint">
          A real-time chat app built with React, Node.js, Express, Socket.IO, and MongoDB.
        </p>
      </div>
      <div className="settings-section">
        <Link to="/developer" className="btn-secondary" onClick={onClose}>
          👨‍💻 About the developer
        </Link>
      </div>
    </div>
  );
}

function PrivacyTab({ user, updateUser }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [status, setStatus] = useState("");
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [pin, setPin] = useState("");
  const [pinStatus, setPinStatus] = useState("");

  useEffect(() => {
    userApi.listBlocked().then((res) => setBlockedUsers(res.data.blockedUsers));
  }, []);

  async function handlePasswordSubmit(e) {
    e.preventDefault();
    setStatus("");
    try {
      await userApi.changePassword({ currentPassword, newPassword });
      setStatus("Password updated ✓");
      setCurrentPassword("");
      setNewPassword("");
    } catch (err) {
      setStatus(err.response?.data?.message || "Could not change password");
    }
  }

  async function handleUnblock(userId) {
    await userApi.unblockUser(userId);
    setBlockedUsers((prev) => prev.filter((u) => u._id !== userId));
  }

  async function handleSetPin(e) {
    e.preventDefault();
    setPinStatus("");
    try {
      await userApi.setLockPin(pin);
      updateUser({ hasLockPin: true });
      setPinStatus(user.hasLockPin ? "PIN updated ✓" : "Chat Lock enabled ✓");
      setPin("");
    } catch (err) {
      setPinStatus(err.response?.data?.message || "Could not set PIN");
    }
  }

  async function handleRemovePin() {
    if (!confirm("Remove your lock PIN? Any locked chats will become visible again.")) return;
    await userApi.removeLockPin();
    updateUser({ hasLockPin: false, lockedConversations: [] });
    setPinStatus("Chat Lock disabled");
  }

  return (
    <div className="settings-form">
      <form onSubmit={handlePasswordSubmit} className="settings-section">
        <span className="settings-label">Change password</span>
        <label className="field">
          <span>Current password</span>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />
        </label>
        <label className="field">
          <span>New password</span>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            minLength={6}
            required
          />
        </label>
        <button type="submit" className="btn-primary">
          Update password
        </button>
        {status && <p className="settings-status">{status}</p>}
      </form>

      <form onSubmit={handleSetPin} className="settings-section">
        <span className="settings-label">Chat Lock PIN</span>
        <p className="settings-hint">
          {user.hasLockPin
            ? "Chat Lock is on. Locked chats are hidden until you enter this PIN."
            : "Set a 4-6 digit PIN to be able to lock individual chats out of view."}
        </p>
        <label className="field">
          <span>{user.hasLockPin ? "New PIN" : "Create PIN"}</span>
          <input
            type="password"
            inputMode="numeric"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
            maxLength={6}
            placeholder="4-6 digits"
          />
        </label>
        <button type="submit" className="btn-primary" disabled={pin.length < 4}>
          {user.hasLockPin ? "Update PIN" : "Enable Chat Lock"}
        </button>
        {user.hasLockPin && (
          <button type="button" className="btn-danger" onClick={handleRemovePin}>
            Disable Chat Lock
          </button>
        )}
        {pinStatus && <p className="settings-status">{pinStatus}</p>}
      </form>

      <div className="settings-section">
        <span className="settings-label">Blocked users</span>
        {blockedUsers.length === 0 && <p className="empty-hint">You haven't blocked anyone.</p>}
        <ul className="modal-user-list">
          {blockedUsers.map((u) => (
            <li key={u._id} className="group-member-row">
              <Avatar user={u} />
              <span className="group-member-name">{u.username}</span>
              <button className="link-btn" onClick={() => handleUnblock(u._id)}>
                Unblock
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
