import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import Background from "./ui/Background";

function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2.5 group">
      <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:rotate-[-8deg]">
        <svg viewBox="0 0 24 24" className="w-4 h-4 text-ink" fill="currentColor">
          <path d="M7 3h10l-4.5 6H17L9 21l1.6-8H7z" />
        </svg>
      </div>
      <span className="font-display font-semibold text-lg tracking-tight text-paper">
        ZK<span className="text-paper-muted">redit</span>
      </span>
    </Link>
  );
}

function NavLink({ to, children }) {
  const location = useLocation();
  const active = location.pathname === to;
  return (
    <Link to={to} className="relative px-3.5 py-2 text-sm font-medium text-paper-muted hover:text-paper transition-colors">
      {children}
      {active && (
        <motion.span
          layoutId="nav-underline"
          className="absolute left-3.5 right-3.5 -bottom-[1px] h-px bg-paper"
          transition={{ type: "spring", stiffness: 400, damping: 32 }}
        />
      )}
    </Link>
  );
}

export default function Layout({ children }) {
  const { user, isAuthenticated, logout, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setMenuOpen(false), [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="min-h-screen flex flex-col relative">
      <Background />

      <header
        className={`sticky top-0 z-50 transition-all duration-300 ${
          scrolled ? "bg-ink/80 backdrop-blur-xl border-b border-ink-border" : "bg-transparent border-b border-transparent"
        }`}
      >
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Logo />

          <nav className="hidden md:flex items-center gap-1">
            <NavLink to="/apply">Apply</NavLink>
            <NavLink to="/bank">Bank Ledger</NavLink>
            <NavLink to="/network">Network</NavLink>
            <NavLink to="/team">Team</NavLink>

            {!loading && isAuthenticated && (
              <div className="flex items-center gap-3 ml-3 pl-3 border-l border-ink-border">
                <span className="text-xs text-paper-muted font-mono hidden lg:inline">
                  {user?.full_name || user?.email}
                </span>
                <button
                  onClick={handleLogout}
                  className="text-sm text-paper-muted hover:text-paper px-3 py-2 rounded-full transition-colors"
                >
                  Log out
                </button>
              </div>
            )}

            {!loading && !isAuthenticated && (
              <div className="flex items-center gap-2 ml-3 pl-3 border-l border-ink-border">
                <NavLink to="/login">Log in</NavLink>
                <Link
                  to="/signup"
                  className="text-sm px-4 py-2 rounded-full bg-accent text-ink font-semibold hover:bg-accent-dim transition-colors"
                >
                  Sign up
                </Link>
              </div>
            )}
          </nav>

          <button
            className="md:hidden w-9 h-9 flex items-center justify-center rounded-full border border-ink-border"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            <div className="w-4 flex flex-col gap-1">
              <span className={`h-px bg-paper transition-transform ${menuOpen ? "translate-y-1.5 rotate-45" : ""}`} />
              <span className={`h-px bg-paper transition-opacity ${menuOpen ? "opacity-0" : "opacity-100"}`} />
              <span className={`h-px bg-paper transition-transform ${menuOpen ? "-translate-y-1.5 -rotate-45" : ""}`} />
            </div>
          </button>
        </div>

        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="md:hidden overflow-hidden border-t border-ink-border bg-ink/95 backdrop-blur-xl"
            >
              <div className="px-6 py-4 flex flex-col gap-1">
                <NavLink to="/apply">Apply</NavLink>
                <NavLink to="/bank">Bank Ledger</NavLink>
                <NavLink to="/network">Network</NavLink>
                <NavLink to="/team">Team</NavLink>
                {!loading && isAuthenticated ? (
                  <button onClick={handleLogout} className="text-left px-3.5 py-2 text-sm text-paper-muted hover:text-paper">
                    Log out ({user?.full_name || user?.email})
                  </button>
                ) : (
                  <>
                    <NavLink to="/login">Log in</NavLink>
                    <NavLink to="/signup">Sign up</NavLink>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <AnimatePresence mode="wait">
        <motion.main
          key={location.pathname}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="flex-1"
        >
          {children}
        </motion.main>
      </AnimatePresence>

      <footer className="border-t border-ink-border py-8 mt-16">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-accent flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-3 h-3 text-ink" fill="currentColor">
                <path d="M7 3h10l-4.5 6H17L9 21l1.6-8H7z" />
              </svg>
            </div>
            <span className="font-display text-sm text-paper-muted">ZKredit</span>
          </div>
          <p className="text-xs text-paper-dim font-mono text-center">
            Model decisions are cryptographically provable, not just logged.
          </p>
          <div className="flex items-center gap-4 text-xs text-paper-dim font-mono">
            <span>© {new Date().getFullYear()}</span>
            <span className="w-1 h-1 rounded-full bg-ink-border" />
            <span>Built on zero-knowledge proofs</span>
          </div>
        </div>
      </footer>
    </div>
  );
}