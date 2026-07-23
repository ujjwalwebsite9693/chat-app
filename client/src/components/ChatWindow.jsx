import { useEffect, useRef, useState } from "react";
import MessageBubble from "./MessageBubble.jsx";
import MessageInput from "./MessageInput.jsx";
import TypingIndicator from "./TypingIndicator.jsx";
import MessageSearchPanel from "./MessageSearchPanel.jsx";
import Avatar from "./Avatar.jsx";
import OnlineBadge from "./OnlineBadge.jsx";

function getHeaderInfo(conversation, currentUserId, nicknames) {
  if (conversation.isSelfNote) {
    return { title: "Saved Messages", subtitle: "Only visible to you", isOnline: null, other: null };
  }
  if (conversation.isGroup) {
    const onlineCount = conversation.participants.filter((p) => p.isOnline).length;
    return {
      title: conversation.groupName,
      subtitle: `${conversation.participants.length} members · ${onlineCount} online`,
      isOnline: null,
      other: null,
    };
  }
  const other = conversation.participants.find((p) => p._id !== currentUserId);
  const title = (other && nicknames?.[other._id]) || other?.displayName || other?.username || "Unknown user";
  return {
    title,
    subtitle: other?.showLastSeen === false ? "" : other?.isOnline ? "Online" : "Offline",
    isOnline: other?.showLastSeen === false ? null : other?.isOnline,
    other,
  };
}

export default function ChatWindow({
  conversation,
  messages,
  currentUserId,
  typingUsers,
  nicknames,
  onSend,
  onTyping,
  onStopTyping,
  onBack,
  onOpenGroupInfo,
  onOpenProfile,
  onBlockUser,
  replyingTo,
  onReply,
  onCancelReply,
  editingMessage,
  onEdit,
  onCancelEdit,
  onSubmitEdit,
  onDelete,
  onToggleReaction,
}) {
  const scrollRef = useRef(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [showSearch, setShowSearch] = useState(false);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, typingUsers.length]);

  useEffect(() => {
    setOpenMenuId(null);
    setShowSearch(false);
  }, [conversation?._id]);

  if (!conversation) {
    return (
      <div className="chat-window chat-window-empty">
        <div className="empty-state">
          <span className="signal-bars" aria-hidden="true">
            <i></i>
            <i></i>
            <i></i>
            <i></i>
          </span>
          <h2>Pick a conversation</h2>
          <p>Choose someone from the sidebar, or start a new chat to get going.</p>
        </div>
      </div>
    );
  }

  const header = getHeaderInfo(conversation, currentUserId, nicknames);
  const isGroup = conversation.isGroup;

  function jumpToMessage(messageId) {
    setShowSearch(false);
    requestAnimationFrame(() => {
      const el = document.getElementById(`message-${messageId}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add("message-highlight");
        setTimeout(() => el.classList.remove("message-highlight"), 1600);
      }
    });
  }

  return (
    <div className="chat-window">
      <div className="chat-header">
        <button className="back-btn" onClick={onBack} aria-label="Back to conversations">
          ←
        </button>
        <button
          type="button"
          className="chat-header-identity"
          onClick={() => {
            if (!isGroup && !conversation.isSelfNote && header.other) {
              onOpenProfile(header.other);
            }
          }}
          disabled={isGroup || conversation.isSelfNote}
        >
          {conversation.isSelfNote ? (
            <span className="conversation-avatar" style={{ background: "#F5A623" }}>📌</span>
          ) : isGroup ? (
            <span className="conversation-avatar" style={{ background: conversation.groupAvatarColor || "#5B6EF5" }}>
              {header.title.slice(0, 1).toUpperCase()}
            </span>
          ) : (
            <Avatar user={header.other}>
              {header.isOnline !== null && <OnlineBadge isOnline={header.isOnline} />}
            </Avatar>
          )}
          <span className="chat-header-info">
            <span className="chat-header-title">{header.title}</span>
            <span className="chat-header-subtitle">{header.subtitle}</span>
          </span>
        </button>
        <button className="icon-btn chat-header-action" onClick={() => setShowSearch((v) => !v)} title="Search in chat">
          🔍
        </button>
        {isGroup && (
          <button className="icon-btn chat-header-action" onClick={() => onOpenGroupInfo(conversation)} title="Group info">
            ℹ️
          </button>
        )}
        {!isGroup && !conversation.isSelfNote && (
          <button
            className="icon-btn chat-header-action"
            onClick={() => {
              const other = conversation.participants.find((p) => p._id !== currentUserId);
              if (other && confirm(`Block ${other.username}? They won't be able to message you.`)) {
                onBlockUser(other._id);
              }
            }}
            title="Block user"
          >
            🚫
          </button>
        )}
      </div>

      {showSearch && (
        <MessageSearchPanel
          conversationId={conversation._id}
          onClose={() => setShowSearch(false)}
          onJumpToMessage={jumpToMessage}
        />
      )}

      <div className="message-list" ref={scrollRef}>
        {messages.length === 0 && (
          <p className="empty-hint centered">
            {conversation.isSelfNote ? "Save notes, links, or files for later 📌" : "No messages yet — say hello 👋"}
          </p>
        )}
        {messages.map((message, index) => {
          const prev = messages[index - 1];
          const showSender = isGroup && (!prev || prev.sender?._id !== message.sender?._id);
          const isOwn = message.sender?._id === currentUserId;
          const readByOthers = (message.readBy || []).filter(
            (r) => r.user !== currentUserId && r.user?._id !== currentUserId
          );
          const isRead = isOwn && readByOthers.length > 0;
          const seenAt = isRead && !isGroup ? readByOthers[0]?.readAt : null;
          return (
            <div key={message._id} id={`message-${message._id}`}>
              <MessageBubble
                message={message}
                isOwn={isOwn}
                showSender={showSender}
                isRead={isRead}
                seenAt={seenAt}
                readCount={isGroup ? readByOthers.length : null}
                currentUserId={currentUserId}
                isMenuOpen={openMenuId === message._id}
                onToggleMenu={() => setOpenMenuId((cur) => (cur === message._id ? null : message._id))}
                onReply={onReply}
                onEdit={onEdit}
                onDelete={onDelete}
                onToggleReaction={onToggleReaction}
              />
            </div>
          );
        })}

        {typingUsers.length > 0 && (
          <TypingIndicator
            label={
              typingUsers.length === 1
                ? `${typingUsers[0]} is typing…`
                : `${typingUsers.join(", ")} are typing…`
            }
          />
        )}
      </div>

      <MessageInput
        onSend={onSend}
        onTyping={onTyping}
        onStopTyping={onStopTyping}
        replyingTo={replyingTo}
        onCancelReply={onCancelReply}
        editingMessage={editingMessage}
        onSubmitEdit={onSubmitEdit}
        onCancelEdit={onCancelEdit}
      />
    </div>
  );
}
