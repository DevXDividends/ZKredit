import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import GoogleSignInButton from "../components/GoogleSignInButton";

export default function Signup() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const { signup, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await signup(email, password, fullName);
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
      navigate("/apply", { replace: true });
    } catch (err) {
      setError(err.message || "Google sign-in failed.");
    }
  };

  return (
    <div className="max-w-sm mx-auto px-6 py-20">
      <div className="font-mono text-xs text-seal-light tracking-widest uppercase mb-3">
        Get started
      </div>
      <h1 className="font-serif text-3xl text-paper mb-8">Create an account</h1>

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
            className="bg-ink-surface border border-ink-border rounded px-3 py-2 text-sm text-paper focus:outline-none focus:ring-1 focus:ring-seal focus:border-seal"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-paper-muted font-mono">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-ink-surface border border-ink-border rounded px-3 py-2 text-sm text-paper focus:outline-none focus:ring-1 focus:ring-seal focus:border-seal"
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
            className="bg-ink-surface border border-ink-border rounded px-3 py-2 text-sm text-paper focus:outline-none focus:ring-1 focus:ring-seal focus:border-seal"
          />
          <span className="text-xs text-paper-dim">At least 8 characters.</span>
        </div>

        {error && (
          <div className="border border-reject/40 bg-reject-bg text-reject text-sm rounded px-4 py-3">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-2.5 bg-seal text-ink font-medium rounded hover:bg-seal-light transition-colors disabled:opacity-50"
        >
          {submitting ? "Creating account…" : "Sign up"}
        </button>
      </form>

      <p className="text-sm text-paper-muted mt-6 text-center">
        Already have an account?{" "}
        <Link to="/login" className="text-seal-light hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}