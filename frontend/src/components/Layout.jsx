import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function NavLink({ to, children }) {
  const location = useLocation();
  const active = location.pathname === to;
  return (
    <Link
      to={to}
      className={`text-sm tracking-wide px-3 py-2 rounded transition-colors ${
        active ? "text-seal-light" : "text-paper-muted hover:text-paper"
      }`}
    >
      {children}
    </Link>
  );
}

export default function Layout({ children }) {
  const { user, isAuthenticated, logout, loading } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-ink-border">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full seal-ring flex items-center justify-center">
              <div className="w-5 h-5 rounded-full bg-ink flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-seal" />
              </div>
            </div>
            <span className="font-serif text-lg tracking-tight text-paper">
              ZK<span className="text-seal-light">redit</span>
            </span>
          </Link>
          <nav className="flex items-center gap-1">
            <NavLink to="/apply">Apply</NavLink>
            <NavLink to="/bank">Bank Ledger</NavLink>

            {!loading && isAuthenticated && (
              <div className="flex items-center gap-3 ml-3 pl-3 border-l border-ink-border">
                <span className="text-xs text-paper-muted font-mono hidden sm:inline">
                  {user?.full_name || user?.email}
                </span>
                <button
                  onClick={handleLogout}
                  className="text-sm text-paper-muted hover:text-paper px-3 py-2 rounded transition-colors"
                >
                  Log out
                </button>
              </div>
            )}

            {!loading && !isAuthenticated && (
              <div className="flex items-center gap-1 ml-3 pl-3 border-l border-ink-border">
                <NavLink to="/login">Log in</NavLink>
                <Link
                  to="/signup"
                  className="text-sm px-3 py-2 rounded bg-seal text-ink font-medium hover:bg-seal-light transition-colors"
                >
                  Sign up
                </Link>
              </div>
            )}
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-ink-border py-6">
        <div className="max-w-5xl mx-auto px-6 text-xs text-paper-dim font-mono">
          Model decisions are cryptographically provable, not just logged.
        </div>
      </footer>
    </div>
  );
}