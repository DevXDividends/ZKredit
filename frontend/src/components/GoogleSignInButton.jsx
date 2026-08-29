import { useEffect, useRef, useState } from "react";

export default function GoogleSignInButton({ onCredential }) {
  const buttonRef = useRef(null);
  const [ready, setReady] = useState(false);
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  useEffect(() => {
    if (!clientId) return;
    if (window.google?.accounts?.id) {
      setReady(true);
      return;
    }
    // The GSI script tag is async/defer, so it may not be loaded yet on
    // first render — poll briefly until it is.
    const interval = setInterval(() => {
      if (window.google?.accounts?.id) {
        setReady(true);
        clearInterval(interval);
      }
    }, 100);
    return () => clearInterval(interval);
  }, [clientId]);

  useEffect(() => {
    if (!ready || !buttonRef.current) return;
    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: (response) => onCredential(response.credential),
    });
    window.google.accounts.id.renderButton(buttonRef.current, {
      theme: "filled_black",
      size: "large",
      width: 336,
      text: "continue_with",
    });
  }, [ready, clientId, onCredential]);

  if (!clientId) {
    return (
      <div className="text-xs text-paper-dim font-mono border border-ink-border rounded px-3 py-3 text-center">
        Google sign-in isn't configured (VITE_GOOGLE_CLIENT_ID missing).
      </div>
    );
  }

  return <div ref={buttonRef} className="flex justify-center" />;
}