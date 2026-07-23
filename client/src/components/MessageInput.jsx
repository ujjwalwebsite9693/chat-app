import { useEffect, useRef, useState } from "react";
import { messageApi } from "../services/api.js";
import EmojiPicker from "./EmojiPicker.jsx";
import StickerPicker from "./StickerPicker.jsx";
import GifPicker from "./GifPicker.jsx";
import VoiceRecorderButton from "./VoiceRecorderButton.jsx";

const TYPING_STOP_DELAY = 1500;

function replySnippet(message) {
  if (!message) return "";
  if (message.isDeletedForEveryone) return "This message was deleted";
  if (message.text) return message.text;
  if (message.file) return message.file.isVoice ? "Voice message" : `📎 ${message.file.name}`;
  if (message.sticker) return "Sticker";
  if (message.gif) return "GIF";
  return "";
}

export default function MessageInput({
  onSend,
  onTyping,
  onStopTyping,
  replyingTo,
  onCancelReply,
  editingMessage,
  onSubmitEdit,
  onCancelEdit,
}) {
  const [text, setText] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [activePicker, setActivePicker] = useState(null); // 'emoji' | 'sticker' | 'gif' | null
  const fileInputRef = useRef(null);
  const textInputRef = useRef(null);
  const stopTypingTimeout = useRef(null);

  // Prefill the input when entering edit mode
  useEffect(() => {
    if (editingMessage) {
      setText(editingMessage.text || "");
      textInputRef.current?.focus();
    }
  }, [editingMessage]);

  function togglePicker(name) {
    setActivePicker((current) => (current === name ? null : name));
  }

  function handleChange(e) {
    setText(e.target.value);
    onTyping();

    clearTimeout(stopTypingTimeout.current);
    stopTypingTimeout.current = setTimeout(onStopTyping, TYPING_STOP_DELAY);
  }

  function handleSubmit(e) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;

    if (editingMessage) {
      onSubmitEdit(editingMessage._id, trimmed);
    } else {
      onSend({ text: trimmed, replyTo: replyingTo?._id });
    }

    setText("");
    clearTimeout(stopTypingTimeout.current);
    onStopTyping();
  }

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await messageApi.upload(formData);
      onSend({ text: "", file: res.data.file, replyTo: replyingTo?._id });
    } catch (err) {
      alert(err.response?.data?.message || "Could not upload that file.");
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  }

  async function handleVoiceRecorded(blob, durationSeconds) {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", blob, `voice-${Date.now()}.webm`);
      const res = await messageApi.upload(formData);
      onSend({
        text: "",
        file: { ...res.data.file, isVoice: true, durationSeconds },
        replyTo: replyingTo?._id,
      });
    } catch (err) {
      alert(err.response?.data?.message || "Could not send the voice message.");
    } finally {
      setIsUploading(false);
    }
  }

  function handleEmojiSelect(emoji) {
    setText((prev) => prev + emoji);
    textInputRef.current?.focus();
  }

  function handleStickerSelect(sticker) {
    onSend({ text: "", sticker, replyTo: replyingTo?._id });
    setActivePicker(null);
  }

  function handleGifSelect(gif) {
    onSend({ text: "", gif, replyTo: replyingTo?._id });
    setActivePicker(null);
  }

  const showReplyBar = (replyingTo || editingMessage) && !isUploading;

  return (
    <div className="message-input-area">
      {showReplyBar && (
        <div className="reply-bar">
          <div className="reply-bar-text">
            <strong>{editingMessage ? "Editing message" : `Replying to ${replyingTo.sender?.username || ""}`}</strong>
            <span>{editingMessage ? editingMessage.text : replySnippet(replyingTo)}</span>
          </div>
          <button
            type="button"
            className="icon-btn"
            onClick={editingMessage ? onCancelEdit : onCancelReply}
            aria-label="Cancel"
          >
            ✕
          </button>
        </div>
      )}

      {activePicker && (
        <div className="picker-anchor">
          {activePicker === "emoji" && <EmojiPicker onSelect={handleEmojiSelect} />}
          {activePicker === "sticker" && <StickerPicker onSelect={handleStickerSelect} />}
          {activePicker === "gif" && <GifPicker onSelect={handleGifSelect} />}
        </div>
      )}

      <form className="message-input" onSubmit={handleSubmit}>
        <button
          type="button"
          className="attach-btn"
          title="Emoji"
          onClick={() => togglePicker("emoji")}
        >
          😀
        </button>
        <button
          type="button"
          className="attach-btn"
          title="Stickers"
          onClick={() => togglePicker("sticker")}
        >
          🧷
        </button>
        <button
          type="button"
          className="attach-btn gif-toggle"
          title="GIFs"
          onClick={() => togglePicker("gif")}
        >
          GIF
        </button>

        <button
          type="button"
          className="attach-btn"
          title="Attach a file"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          📎
        </button>
        <input
          ref={fileInputRef}
          type="file"
          hidden
          onChange={handleFileChange}
          accept="image/*,.pdf,.doc,.docx,.txt"
        />

        <input
          ref={textInputRef}
          type="text"
          value={text}
          onChange={handleChange}
          placeholder={isUploading ? "Sending…" : "Write a message"}
          disabled={isUploading}
          autoComplete="off"
        />

        {!text.trim() && !editingMessage && (
          <VoiceRecorderButton onRecorded={handleVoiceRecorded} disabled={isUploading} />
        )}

        <button
          type="submit"
          className="send-btn"
          disabled={!text.trim() || isUploading}
        >
          {editingMessage ? "Save" : "Send"}
        </button>
      </form>
    </div>
  );
}
