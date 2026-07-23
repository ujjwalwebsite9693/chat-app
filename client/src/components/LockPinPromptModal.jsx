import { useState } from "react";
import { userApi } from "../services/api.js";

export default function LockPinPromptModal({ onClose, onUnlocked }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      const res = await userApi.verifyLockPin(pin);
      if (res.data.valid) {
        onUnlocked();
      } else {
        setError("Incorrect PIN");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Could not verify PIN");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel lock-prompt-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>🔒 Enter PIN</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit} className="settings-form">
          <input
            type="password"
            inputMode="numeric"
            autoFocus
            className="modal-input lock-pin-input"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
            maxLength={6}
            placeholder="••••"
          />
          {error && <p className="form-error">{error}</p>}
          <button type="submit" className="btn-primary" disabled={pin.length < 4 || isSubmitting}>
            Unlock
          </button>
        </form>
      </div>
    </div>
  );
}
