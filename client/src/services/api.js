import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
});

// Attach the JWT to every request once the user is logged in
export function setAuthToken(token) {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
}

export const authApi = {
  register: (data) => api.post("/auth/register", data),
  login: (data) => api.post("/auth/login", data),
  me: () => api.get("/auth/me"),
};

export const userApi = {
  list: (search = "") => api.get("/users", { params: { search } }),
  updateProfile: (data) => api.patch("/users/me", data),
  uploadAvatar: (formData) =>
    api.post("/users/me/avatar", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  changePassword: (data) => api.patch("/users/me/password", data),
  pinConversation: (conversationId) => api.post(`/users/me/pinned/${conversationId}`),
  unpinConversation: (conversationId) => api.delete(`/users/me/pinned/${conversationId}`),
  muteConversation: (conversationId) => api.post(`/users/me/muted/${conversationId}`),
  unmuteConversation: (conversationId) => api.delete(`/users/me/muted/${conversationId}`),
  blockUser: (userId) => api.post(`/users/me/blocked/${userId}`),
  unblockUser: (userId) => api.delete(`/users/me/blocked/${userId}`),
  listBlocked: () => api.get("/users/me/blocked"),
  setLockPin: (pin) => api.patch("/users/me/lock-pin", { pin }),
  removeLockPin: () => api.delete("/users/me/lock-pin"),
  verifyLockPin: (pin) => api.post("/users/me/verify-lock-pin", { pin }),
  lockConversation: (conversationId) => api.post(`/users/me/locked/${conversationId}`),
  unlockConversation: (conversationId) => api.delete(`/users/me/locked/${conversationId}`),
  setNickname: (userId, nickname) => api.post(`/users/me/nickname/${userId}`, { nickname }),
  removeNickname: (userId) => api.delete(`/users/me/nickname/${userId}`),
};

export const conversationApi = {
  list: () => api.get("/conversations"),
  createPrivate: (participantId) => api.post("/conversations", { participantId }),
  createGroup: (groupName, participantIds) =>
    api.post("/conversations", { groupName, participantIds }),
  rename: (conversationId, groupName) =>
    api.patch(`/conversations/${conversationId}`, { groupName }),
  addMembers: (conversationId, participantIds) =>
    api.post(`/conversations/${conversationId}/members`, { participantIds }),
  removeMember: (conversationId, userId) =>
    api.delete(`/conversations/${conversationId}/members/${userId}`),
  leave: (conversationId) => api.post(`/conversations/${conversationId}/leave`),
  memberStats: (conversationId, userId) => api.get(`/conversations/${conversationId}/stats/${userId}`),
  hide: (conversationId) => api.post(`/conversations/${conversationId}/hide`),
};

export const messageApi = {
  history: (conversationId) => api.get(`/messages/${conversationId}`),
  search: (conversationId, q) => api.get(`/messages/${conversationId}/search`, { params: { q } }),
  media: (conversationId, type) => api.get(`/messages/${conversationId}/media`, { params: { type } }),
  upload: (formData) =>
    api.post("/messages/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
};

export const gifApi = {
  search: (q) => api.get("/gifs/search", { params: { q } }),
  trending: () => api.get("/gifs/trending"),
};

export default api;
