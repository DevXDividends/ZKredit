import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { api, setAuthToken } from "../api";

const AuthContext = createContext(null);

const TOKEN_KEY = "zkredit_token";

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const applyToken = useCallback((newToken) => {
    if (newToken) {
      localStorage.setItem(TOKEN_KEY, newToken);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
    setAuthToken(newToken);
    setToken(newToken);
  }, []);

  // On mount (or when token changes), fetch the current user to confirm the
  // token's still valid — clears it out if the server rejects it (expired etc).
  useEffect(() => {
    let cancelled = false;
    async function loadUser() {
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }
      setAuthToken(token);
      try {
        const me = await api.me();
        if (!cancelled) setUser(me);
      } catch {
        if (!cancelled) {
          applyToken(null);
          setUser(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadUser();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const signup = async (email, password, fullName) => {
    const res = await api.signup({ email, password, full_name: fullName });
    applyToken(res.access_token);
    setUser(res.user);
    return res.user;
  };

  const login = async (email, password) => {
    const res = await api.login({ email, password });
    applyToken(res.access_token);
    setUser(res.user);
    return res.user;
  };

  const loginWithGoogle = async (credential) => {
    const res = await api.googleAuth({ credential });
    applyToken(res.access_token);
    setUser(res.user);
    return res.user;
  };

  const logout = () => {
    applyToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, token, loading, isAuthenticated: !!user, signup, login, loginWithGoogle, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside an AuthProvider");
  return ctx;
}