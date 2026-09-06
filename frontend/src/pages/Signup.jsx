import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import GoogleSignInButton from "../components/GoogleSignInButton";
import Button from "../components/ui/Button";
import Spinner from "../components/ui/Spinner";
import AuthShowcase from "../components/AuthShowcase";

export default function Signup() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const { signup, loginWithGoogle } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await signup(email, password, fullName);
      toast.success("Account created — let's apply.");
      navigate("/apply", { replace: true });
    } catch (err) {
      setError(err.message || "Sign up failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogle = async (credential) => {
    setError(null);
    try {
      await loginWithGoogle(credential);
      toast.success("Account created — let's apply.");
      navigate("/apply", { replace: true });
    } catch (err) {
      setError(err.message || "Google sign-in failed.");
    }
  };

  return (
    <div className="min-h-[calc(100vh-140px)] grid lg:grid-cols-2">
      <AuthShowcase />

      <div className="flex items-center justify-center px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-sm"
        >
          <div className="font-mono text-xs text-paper-muted tracking-widest uppercase mb-3">Get started</div>
          <h1 className="font-display text-3xl text-paper mb-8">Create an account</h1>

          <div className="mb-6">
            <GoogleSignInButton onCredential={handleGoogle} />
          </div>

          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-ink-border" />
            <span className="text-xs text-paper-dim font-mono">or</span>
            <div className="flex-1 h-px bg-ink-border" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-paper-muted font-mono">Full name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="bg-ink-surface border border-ink-border rounded-xl px-3.5 py-2.5 text-sm text-paper focus:outline-none focus:ring-1 focus:ring-paper focus:border-paper transition-colors"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-paper-muted font-mono">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-ink-surface border border-ink-border rounded-xl px-3.5 py-2.5 text-sm text-paper focus:outline-none focus:ring-1 focus:ring-paper focus:border-paper transition-colors"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-paper-muted font-mono">Password</label>
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-ink-surface border border-ink-border rounded-xl px-3.5 py-2.5 text-sm text-paper focus:outline-none focus:ring-1 focus:ring-paper focus:border-paper transition-colors"
              />
              <span className="text-xs text-paper-dim">At least 8 characters.</span>
            </div>

            {error && (
              <div className="border border-reject/40 bg-reject-bg text-reject text-sm rounded-xl px-4 py-3">
                {error}
              </div>
            )}

            <Button type="submit" disabled={submitting} className="w-full">
              {submitting && <Spinner />}
              {submitting ? "Creating account…" : "Sign up"}
            </Button>
          </form>

          <p className="text-sm text-paper-muted mt-6 text-center">
            Already have an account?{" "}
            <Link to="/login" className="text-paper hover:underline">
              Log in
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
