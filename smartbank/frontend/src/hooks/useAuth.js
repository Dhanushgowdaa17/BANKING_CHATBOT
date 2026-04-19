import React, { createContext, useContext, useState, useCallback } from "react";
import api from "../utils/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("token"));
  const [user, setUser] = useState(() => { try { return JSON.parse(localStorage.getItem("user")); } catch { return null; } });

  const login = useCallback(async (username, password) => {
    const res = await api.post("/auth/login", { username, password });
    const { token: tok, ...userData } = res.data;
    localStorage.setItem("token", tok);
    localStorage.setItem("user", JSON.stringify(userData));
    setToken(tok); setUser(userData);
    return userData;
  }, []);

  const signup = useCallback(async (data) => {
    const res = await api.post("/auth/signup", data);
    const { token: tok, ...userData } = res.data;
    localStorage.setItem("token", tok);
    localStorage.setItem("user", JSON.stringify(userData));
    setToken(tok); setUser(userData);
    return userData;
  }, []);

  const logout = useCallback(() => {
    localStorage.clear();
    setToken(null); setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ token, user, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() { return useContext(AuthContext); }
