import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { getSocket } from "../services/socket.js";
import { conversationApi, messageApi, userApi } from "../services/api.js";
import Sidebar from "../components/Sidebar.jsx";
import ChatWindow from "../components/ChatWindow.jsx";
import NewChatModal from "../components/NewChatModal.jsx";
import GroupInfoModal from "../components/GroupInfoModal.jsx";
import SettingsModal from "../components/SettingsModal.jsx";
import ProfileViewModal from "../components/ProfileViewModal.jsx";
import LockPinPromptModal from "../components/LockPinPromptModal.jsx";

export default function ChatDashboard() {
  const { user, logout, updateUser } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [typingMap, setTypingMap] = useState({}); // conversationId -> { userId: username }
  const [unreadCounts, setUnreadCounts] = useState({}); // conversationId -> count
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [groupInfoConversation, setGroupInfoConversation] = useState(null);
  const [profileView, setProfileView] = useState(null); // { user, conversationId, showMessageButton }
  const [replyingTo, setReplyingTo] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [showLockPrompt, setShowLockPrompt] = useState(false);
  const [unlockedSession, setUnlockedSession] = useState(false);

  const activeConversationRef = useRef(null);
  activeConversationRef.current = activeConversation;

  const pinnedIds = useMemo(
    () => new Set((user.pinnedConversations || []).map((id) => id?._id || id)),
    [user.pinnedConversations]
  );
  const mutedIds = useMemo(
    () => new Set((user.mutedConversations || []).map((id) => id?._id || id)),
    [user.mutedConversations]
  );
  const lockedIds = useMemo(
    () => new Set((user.lockedConversations || []).map((id) => id?._id || id)),
    [user.lockedConversations]
  );
  const nicknames = useMemo(() => {
    const map = {};
    (user.contactNicknames || []).forEach((entry) => {
      const id = entry.user?._id || entry.user;
      if (entry.nickname) map[id] = entry.nickname;
    });
    return map;
  }, [user.contactNicknames]);

  // --- Load the conversation list once on mount ---
  useEffect(() => {
    conversationApi.list().then((res) => setConversations(res.data.conversations));
  }, []);

  // --- Ask for permission to show desktop notifications for new messages ---
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  function notify(title, body) {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(title, { body });
    }
  }

  // --- Load message history + join the room whenever the active chat changes ---
  useEffect(() => {
    if (!activeConversation) return;

    const socket = getSocket();
    socket?.emit("join_conversation", activeConversation._id);

    messageApi.history(activeConversation._id).then((res) => setMessages(res.data.messages));

    setUnreadCounts((prev) => ({ ...prev, [activeConversation._id]: 0 }));
    setReplyingTo(null);
    setEditingMessage(null);

    return () => {
      socket?.emit("leave_conversation", activeConversation._id);
    };
  }, [activeConversation?._id]);

  // --- Mark the latest incoming message as read while the chat is open ---
  useEffect(() => {
    if (!activeConversation || messages.length === 0) return;
    const last = messages[messages.length - 1];
    if (last.sender?._id !== user.id) {
      getSocket()?.emit("mark_read", {
        conversationId: activeConversation._id,
        messageId: last._id,
      });
    }
  }, [messages, activeConversation?._id, user.id]);

  // --- Wire up socket listeners once ---
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    function handleReceiveMessage(message) {
      if (activeConversationRef.current?._id === message.conversation) {
        setMessages((prev) => [...prev, message]);
      }
    }

    function handleMessageEdited(updatedMessage) {
      setMessages((prev) => prev.map((m) => (m._id === updatedMessage._id ? updatedMessage : m)));
    }

    function handleMessageDeleted({ messageId, scope }) {
      if (scope === "everyone") {
        setMessages((prev) =>
          prev.map((m) =>
            m._id === messageId
              ? { ...m, isDeletedForEveryone: true, text: "", file: null, sticker: null, gif: null, reactions: [] }
              : m
          )
        );
      } else {
        setMessages((prev) => prev.filter((m) => m._id !== messageId));
      }
    }

    function handleReactionUpdated({ messageId, reactions }) {
      setMessages((prev) => prev.map((m) => (m._id === messageId ? { ...m, reactions } : m)));
    }

    function handleMessageRead({ messageId, userId: readerId, readAt }) {
      setMessages((prev) =>
        prev.map((m) => {
          if (m._id !== messageId) return m;
          const readBy = m.readBy || [];
          const existingIndex = readBy.findIndex((r) => (r.user?._id || r.user) === readerId);
          const nextReadBy =
            existingIndex >= 0
              ? readBy.map((r, i) => (i === existingIndex ? { ...r, readAt } : r))
              : [...readBy, { user: readerId, readAt }];
          return { ...m, readBy: nextReadBy };
        })
      );
    }

    function handleConversationUpdated({ conversationId, lastMessage }) {
      setConversations((prev) => {
        const exists = prev.some((c) => c._id === conversationId);
        if (!exists) {
          conversationApi.list().then((res) => setConversations(res.data.conversations));
          return prev;
        }
        return prev.map((c) => (c._id === conversationId ? { ...c, lastMessage } : c));
      });

      const isActive = activeConversationRef.current?._id === conversationId;
      const isOwnMessage = lastMessage.sender?._id === user.id;
      const isMuted = (user.mutedConversations || []).some((id) => (id?._id || id) === conversationId);

      if (!isActive && !isOwnMessage) {
        setUnreadCounts((prev) => ({
          ...prev,
          [conversationId]: (prev[conversationId] || 0) + 1,
        }));
        if (!isMuted) {
          notify(
            lastMessage.sender?.username || "New message",
            lastMessage.text || (lastMessage.file ? `Sent a file: ${lastMessage.file.name}` : "Sent something new")
          );
        }
      }
    }

    function handleStatusChanged({ userId, isOnline, lastSeen }) {
      setConversations((prev) =>
        prev.map((c) => ({
          ...c,
          participants: c.participants.map((p) =>
            p._id === userId ? { ...p, isOnline, lastSeen } : p
          ),
        }))
      );
    }

    function handleUserTyping({ conversationId, userId, username }) {
      setTypingMap((prev) => ({
        ...prev,
        [conversationId]: { ...prev[conversationId], [userId]: username },
      }));
    }

    function handleUserStopTyping({ conversationId, userId }) {
      setTypingMap((prev) => {
        const next = { ...(prev[conversationId] || {}) };
        delete next[userId];
        return { ...prev, [conversationId]: next };
      });
    }

    function handleGroupUpdated({ conversationId }) {
      conversationApi.list().then((res) => {
        setConversations(res.data.conversations);
        if (activeConversationRef.current?._id === conversationId) {
          const updated = res.data.conversations.find((c) => c._id === conversationId);
          setActiveConversation(updated || null);
          setGroupInfoConversation((prev) => (prev && prev._id === conversationId ? updated : prev));
        }
      });
    }

    socket.on("receive_message", handleReceiveMessage);
    socket.on("message_edited", handleMessageEdited);
    socket.on("message_deleted", handleMessageDeleted);
    socket.on("message_reaction_updated", handleReactionUpdated);
    socket.on("message_read", handleMessageRead);
    socket.on("conversation_updated", handleConversationUpdated);
    socket.on("user_status_changed", handleStatusChanged);
    socket.on("user_typing", handleUserTyping);
    socket.on("user_stop_typing", handleUserStopTyping);
    socket.on("group_updated", handleGroupUpdated);

    return () => {
      socket.off("receive_message", handleReceiveMessage);
      socket.off("message_edited", handleMessageEdited);
      socket.off("message_deleted", handleMessageDeleted);
      socket.off("message_reaction_updated", handleReactionUpdated);
      socket.off("message_read", handleMessageRead);
      socket.off("conversation_updated", handleConversationUpdated);
      socket.off("user_status_changed", handleStatusChanged);
      socket.off("user_typing", handleUserTyping);
      socket.off("user_stop_typing", handleUserStopTyping);
      socket.off("group_updated", handleGroupUpdated);
    };
  }, [user.id, user.mutedConversations]);

  const handleSend = useCallback(
    ({ text, file, sticker, gif, replyTo }) => {
      const socket = getSocket();
      if (!activeConversation || !socket) return;
      socket.emit("send_message", {
        conversationId: activeConversation._id,
        text,
        file,
        sticker,
        gif,
        replyTo,
      });
      setReplyingTo(null);
    },
    [activeConversation]
  );

  const handleSubmitEdit = useCallback((messageId, text) => {
    getSocket()?.emit("edit_message", { messageId, text }, (response) => {
      if (response?.error) alert(response.error);
    });
    setEditingMessage(null);
  }, []);

  const handleDeleteMessage = useCallback((message, scope) => {
    if (scope === "everyone" && !confirm("Delete this message for everyone?")) return;
    getSocket()?.emit("delete_message", { messageId: message._id, scope }, (response) => {
      if (response?.error) alert(response.error);
    });
  }, []);

  const handleToggleReaction = useCallback((messageId, emoji) => {
    getSocket()?.emit("toggle_reaction", { messageId, emoji });
  }, []);

  const handleStartReply = useCallback((message) => {
    setEditingMessage(null);
    setReplyingTo(message);
  }, []);

  const handleStartEdit = useCallback((message) => {
    setReplyingTo(null);
    setEditingMessage(message);
  }, []);

  const handleTyping = useCallback(() => {
    if (!activeConversation) return;
    getSocket()?.emit("typing", {
      conversationId: activeConversation._id,
      username: user.username,
    });
  }, [activeConversation, user.username]);

  const handleStopTyping = useCallback(() => {
    if (!activeConversation) return;
    getSocket()?.emit("stop_typing", { conversationId: activeConversation._id });
  }, [activeConversation]);

  async function handleCreatePrivate(participantId) {
    try {
      const res = await conversationApi.createPrivate(participantId);
      const conversation = res.data.conversation;
      setConversations((prev) => {
        const exists = prev.some((c) => c._id === conversation._id);
        return exists ? prev : [conversation, ...prev];
      });
      setActiveConversation(conversation);
      setShowNewChatModal(false);
    } catch (err) {
      alert(err.response?.data?.message || "Could not start that conversation");
    }
  }

  async function handleCreateGroup(groupName, participantIds) {
    const res = await conversationApi.createGroup(groupName, participantIds);
    const conversation = res.data.conversation;
    setConversations((prev) => [conversation, ...prev]);
    setActiveConversation(conversation);
    setShowNewChatModal(false);
  }

  async function handleTogglePin(conversationId, isPinned) {
    const res = isPinned
      ? await userApi.unpinConversation(conversationId)
      : await userApi.pinConversation(conversationId);
    updateUser({ pinnedConversations: res.data.pinnedConversations });
  }

  async function handleToggleMute(conversationId, isMuted) {
    const res = isMuted
      ? await userApi.unmuteConversation(conversationId)
      : await userApi.muteConversation(conversationId);
    updateUser({ mutedConversations: res.data.mutedConversations });
  }

  async function handleToggleLock(conversationId, isLocked) {
    try {
      const res = isLocked
        ? await userApi.unlockConversation(conversationId)
        : await userApi.lockConversation(conversationId);
      updateUser({ lockedConversations: res.data.lockedConversations });
    } catch (err) {
      alert(err.response?.data?.message || "Could not update lock status");
    }
  }

  function handleOpenLockedChats() {
    if (!user.hasLockPin) {
      alert("Set a Chat Lock PIN in Settings → Privacy & Security first.");
      return;
    }
    setShowLockPrompt(true);
  }

  async function handleDeleteChat(conversationId) {
    if (!confirm("Delete this chat? It'll disappear from your list until there's new activity.")) return;
    await conversationApi.hide(conversationId);
    setConversations((prev) => prev.filter((c) => c._id !== conversationId));
    if (activeConversation?._id === conversationId) setActiveConversation(null);
  }

  function handleNicknameSaved(userId, nickname) {
    updateUser({
      contactNicknames: [
        ...(user.contactNicknames || []).filter((n) => (n.user?._id || n.user) !== userId),
        ...(nickname ? [{ user: userId, nickname }] : []),
      ],
    });
  }

  async function handleBlockUser(userId) {
    const res = await userApi.blockUser(userId);
    updateUser({ blockedUsers: res.data.blockedUsers });
    if (activeConversation && activeConversation.participants.some((p) => p._id === userId)) {
      setActiveConversation(null);
    }
  }

  function handleOpenProfileFromChat(profileUser) {
    setProfileView({ user: profileUser, conversationId: activeConversation._id, showMessageButton: false });
  }

  function handleOpenProfileFromGroup(profileUser) {
    setProfileView({ user: profileUser, conversationId: groupInfoConversation._id, showMessageButton: true });
  }

  async function handleMessagePrivatelyFromProfile(userId) {
    setProfileView(null);
    setGroupInfoConversation(null);
    await handleCreatePrivate(userId);
  }

  async function handleBlockFromProfile(userId) {
    setProfileView(null);
    await handleBlockUser(userId);
  }

  function notifyGroupParticipants(conversation) {
    getSocket()?.emit("group_updated", {
      conversationId: conversation._id,
      participantIds: conversation.participants.map((p) => p._id || p),
    });
  }

  async function handleRenameGroup(groupName) {
    const res = await conversationApi.rename(groupInfoConversation._id, groupName);
    const updated = res.data.conversation;
    setConversations((prev) => prev.map((c) => (c._id === updated._id ? updated : c)));
    setGroupInfoConversation(updated);
    if (activeConversation?._id === updated._id) setActiveConversation(updated);
    notifyGroupParticipants(updated);
  }

  async function handleAddMembers(participantIds) {
    const res = await conversationApi.addMembers(groupInfoConversation._id, participantIds);
    const updated = res.data.conversation;
    setConversations((prev) => prev.map((c) => (c._id === updated._id ? updated : c)));
    setGroupInfoConversation(updated);
    if (activeConversation?._id === updated._id) setActiveConversation(updated);
    notifyGroupParticipants(updated);
  }

  async function handleRemoveMember(userId) {
    const res = await conversationApi.removeMember(groupInfoConversation._id, userId);
    const updated = res.data.conversation;
    setConversations((prev) => prev.map((c) => (c._id === updated._id ? updated : c)));
    setGroupInfoConversation(updated);
    if (activeConversation?._id === updated._id) setActiveConversation(updated);
    // Notify remaining members AND the person who was just removed
    getSocket()?.emit("group_updated", {
      conversationId: updated._id,
      participantIds: [...updated.participants.map((p) => p._id || p), userId],
    });
  }

  async function handleLeaveGroup() {
    const conversation = groupInfoConversation;
    await conversationApi.leave(conversation._id);
    setConversations((prev) => prev.filter((c) => c._id !== conversation._id));
    if (activeConversation?._id === conversation._id) setActiveConversation(null);
    setGroupInfoConversation(null);
    notifyGroupParticipants(conversation);
  }

  const activeTypingUsers = Object.values(typingMap[activeConversation?._id] || {});

  return (
    <div className={`app-shell ${activeConversation ? "show-chat" : ""}`}>
      <Sidebar
        user={user}
        conversations={conversations}
        activeId={activeConversation?._id}
        unreadCounts={unreadCounts}
        pinnedIds={pinnedIds}
        mutedIds={mutedIds}
        lockedIds={lockedIds}
        unlockedSession={unlockedSession}
        nicknames={nicknames}
        onSelect={setActiveConversation}
        onNewChat={() => setShowNewChatModal(true)}
        onLogout={logout}
        onOpenSettings={() => setShowSettingsModal(true)}
        onTogglePin={handleTogglePin}
        onToggleMute={handleToggleMute}
        onToggleLock={handleToggleLock}
        onDeleteChat={handleDeleteChat}
        onOpenLockedChats={handleOpenLockedChats}
      />

      <ChatWindow
        conversation={activeConversation}
        messages={messages}
        currentUserId={user.id}
        typingUsers={activeTypingUsers}
        nicknames={nicknames}
        onSend={handleSend}
        onTyping={handleTyping}
        onStopTyping={handleStopTyping}
        onBack={() => setActiveConversation(null)}
        onOpenGroupInfo={setGroupInfoConversation}
        onOpenProfile={handleOpenProfileFromChat}
        onBlockUser={handleBlockUser}
        replyingTo={replyingTo}
        onReply={handleStartReply}
        onCancelReply={() => setReplyingTo(null)}
        editingMessage={editingMessage}
        onEdit={handleStartEdit}
        onCancelEdit={() => setEditingMessage(null)}
        onSubmitEdit={handleSubmitEdit}
        onDelete={handleDeleteMessage}
        onToggleReaction={handleToggleReaction}
      />

      {showNewChatModal && (
        <NewChatModal
          onClose={() => setShowNewChatModal(false)}
          onCreatePrivate={handleCreatePrivate}
          onCreateGroup={handleCreateGroup}
        />
      )}

      {groupInfoConversation && (
        <GroupInfoModal
          conversation={groupInfoConversation}
          currentUserId={user.id}
          onClose={() => setGroupInfoConversation(null)}
          onRename={handleRenameGroup}
          onAddMembers={handleAddMembers}
          onRemoveMember={handleRemoveMember}
          onLeave={handleLeaveGroup}
          onOpenProfile={handleOpenProfileFromGroup}
        />
      )}

      {profileView && (
        <ProfileViewModal
          profileUser={profileView.user}
          conversationId={profileView.conversationId}
          isOwn={profileView.user._id === user.id}
          currentNickname={nicknames[profileView.user._id]}
          onNicknameSaved={handleNicknameSaved}
          onClose={() => setProfileView(null)}
          onMessagePrivately={profileView.showMessageButton ? handleMessagePrivatelyFromProfile : undefined}
          onBlock={profileView.user._id !== user.id ? handleBlockFromProfile : undefined}
        />
      )}

      {showLockPrompt && (
        <LockPinPromptModal
          onClose={() => setShowLockPrompt(false)}
          onUnlocked={() => {
            setUnlockedSession(true);
            setShowLockPrompt(false);
          }}
        />
      )}

      {showSettingsModal && <SettingsModal onClose={() => setShowSettingsModal(false)} />}
    </div>
  );
}
