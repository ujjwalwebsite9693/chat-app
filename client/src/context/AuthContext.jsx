import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { authApi, setAuthToken } from "../services/api.js";
import { connectSocket, disconnectSocket } from "../services/socket.js";

const AuthContext = createContext(null);

const TOKEN_KEY = "relay_token";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore the session on first load if a token was saved
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setIsLoading(false);
      return;
    }

    setAuthToken(token);
    authApi
      .me()
      .then((res) => {
        setUser(res.data.user);
        connectSocket(token);
      })
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY);
        setAuthToken(null);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await authApi.login({ email, password });
    const { user: loggedInUser, token } = res.data;
    localStorage.setItem(TOKEN_KEY, token);
    setAuthToken(token);
    connectSocket(token);
    setUser(loggedInUser);
    return loggedInUser;
  }, []);

  const register = useCallback(async (username, email, password) => {
    const res = await authApi.register({ username, email, password });
    const { user: newUser, token } = res.data;
    localStorage.setItem(TOKEN_KEY, token);
    setAuthToken(token);
    connectSocket(token);
    setUser(newUser);
    return newUser;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setAuthToken(null);
    disconnectSocket();
    setUser(null);
  }, []);

  // Merge partial fields (from profile edits, appearance changes, etc.)
  // into the current user without a full refetch.
  const updateUser = useCallback((partialUser) => {
    setUser((prev) => (prev ? { ...prev, ...partialUser } : prev));
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
