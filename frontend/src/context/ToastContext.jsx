import { createContext, useCallback, useContext, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const ToastContext = createContext(null);

let idCounter = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const push = useCallback(
    (message, { type = "info", duration = 4000 } = {}) => {
      const id = ++idCounter;
      setToasts((t) => [...t, { id, message, type }]);
      if (duration) setTimeout(() => dismiss(id), duration);
      return id;
    },
    [dismiss]
  );

  const toast = {
    show: push,
    success: (msg, opts) => push(msg, { ...opts, type: "success" }),
    error: (msg, opts) => push(msg, { ...opts, type: "error" }),
    info: (msg, opts) => push(msg, { ...opts, type: "info" }),
  };

  const styles = {
    success: "border-approve/40 text-approve bg-approve-bg",
    error: "border-reject/40 text-reject bg-reject-bg",
    info: "border-ink-border text-paper bg-ink-raised",
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 w-[min(360px,90vw)]">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40, scale: 0.96 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className={`border rounded-xl px-4 py-3 text-sm font-medium shadow-lg backdrop-blur-md cursor-pointer ${styles[t.type]}`}
              onClick={() => dismiss(t.id)}
            >
              {t.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside a ToastProvider");
  return ctx;
}
