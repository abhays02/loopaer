import React, { createContext, useContext, useEffect, useState } from "react";
import { API } from "./api";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("loopaer.tok") || null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) { setUser(null); setLoading(false); return; }
    fetch(`${API}/auth/whoami`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((d) => setUser(d.user))
      .catch(() => { localStorage.removeItem("loopaer.tok"); setToken(null); setUser(null); })
      .finally(() => setLoading(false));
  }, [token]);

  const signup = async (email, password, name) => {
    const r = await fetch(`${API}/auth/signup`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password, name }) });
    const d = await r.json();
    if (!r.ok) throw new Error(d.detail || "signup failed");
    localStorage.setItem("loopaer.tok", d.token);
    setToken(d.token); setUser(d.user);
    return d;
  };
  const login = async (email, password) => {
    const r = await fetch(`${API}/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
    const d = await r.json();
    if (!r.ok) throw new Error(d.detail || "login failed");
    localStorage.setItem("loopaer.tok", d.token);
    setToken(d.token); setUser(d.user);
    return d;
  };
  const logout = () => {
    localStorage.removeItem("loopaer.tok");
    setToken(null); setUser(null);
  };

  return (
    <AuthCtx.Provider value={{ token, user, loading, signup, login, logout }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
