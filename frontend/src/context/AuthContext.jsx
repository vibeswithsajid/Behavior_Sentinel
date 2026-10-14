import { createContext, useContext, useState, useEffect, useCallback } from "react";
import axios from "axios";

const AuthContext = createContext(null);

const API_BASE = "http://localhost:8000";

export function AuthProvider({ children }) {
  const [user, setUser]   = useState(null);   // { user_id, role, name, department, token }
  const [loading, setLoading] = useState(true);

  // Restore session from localStorage on mount, or auto-login as demo manager
  useEffect(() => {
    const isLoggedOut = sessionStorage.getItem("bs_logged_out");
    const stored = localStorage.getItem("bs_user");
    if (stored) {
      try {
        setUser(JSON.parse(stored));
        setLoading(false);
        return;
      } catch {
        localStorage.removeItem("bs_user");
      }
    }

    if (isLoggedOut) {
      setLoading(false);
      return;
    }

    // Auto-login as manager for seamless demo evaluation
    axios
      .post(`${API_BASE}/api/login`, { username: "manager", password: "manager123" })
      .then((resp) => {
        const data = resp.data;
        const userData = {
          user_id:    data.user_id,
          role:       data.role,
          name:       data.name,
          department: data.department,
          token:      data.token,
        };
        localStorage.setItem("bs_user", JSON.stringify(userData));
        setUser(userData);
      })
      .catch((err) => {
        console.error("Auto login error:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const login = useCallback(async (username, password) => {
    sessionStorage.removeItem("bs_logged_out");
    const resp = await axios.post(`${API_BASE}/api/login`, { username, password });
    const data = resp.data;
    const userData = {
      user_id:    data.user_id,
      role:       data.role,
      name:       data.name,
      department: data.department,
      token:      data.token,
    };
    localStorage.setItem("bs_user", JSON.stringify(userData));
    setUser(userData);
    return userData;
  }, []);

  const logout = useCallback(() => {
    sessionStorage.setItem("bs_logged_out", "true");
    localStorage.removeItem("bs_user");
    setUser(null);
  }, []);

  // Role helpers
  const hasRole = useCallback((minRole) => {
    const levels = { intern: 1, junior: 2, senior_manager: 3, manager: 4 };
    return (levels[user?.role] || 0) >= (levels[minRole] || 0);
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
