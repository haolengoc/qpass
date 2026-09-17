"use client";

import { CheckCircle2, CircleAlert, Info, X } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";

type ToastVariant = "success" | "error" | "info";

export type ToastInput = {
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
};

type ToastItem = ToastInput & {
  id: string;
  variant: ToastVariant;
  duration: number;
};

type ToastContextValue = {
  showToast: (toast: ToastInput) => string;
  dismissToast: (id: string) => void;
};

const FLASH_KEY = "qpass:flash-toast";
const ToastContext = createContext<ToastContextValue | null>(null);

function toastId() {
  return typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;
}

export function queueToast(toast: ToastInput) {
  try {
    sessionStorage.setItem(FLASH_KEY, JSON.stringify(toast));
  } catch {
    // Restricted browser storage must not block the completed action.
  }
}

function consumeQueuedToast() {
  try {
    const stored = sessionStorage.getItem(FLASH_KEY);
    sessionStorage.removeItem(FLASH_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored) as ToastInput;
    return typeof parsed.title === "string" && parsed.title.trim() ? parsed : null;
  } catch {
    return null;
  }
}

function ToastCard({ toast, onDismiss }: { toast: ToastItem; onDismiss: () => void }) {
  useEffect(() => {
    const timeout = window.setTimeout(onDismiss, toast.duration);
    return () => window.clearTimeout(timeout);
  }, [onDismiss, toast.duration]);

  const Icon = toast.variant === "success"
    ? CheckCircle2
    : toast.variant === "error"
      ? CircleAlert
      : Info;
  const tone = toast.variant === "success"
    ? "border-emerald-200 text-emerald-800"
    : toast.variant === "error"
      ? "border-red-200 text-red-800"
      : "border-sky-200 text-sky-800";
  const progress = toast.variant === "success"
    ? "bg-emerald-500"
    : toast.variant === "error"
      ? "bg-red-500"
      : "bg-sky-500";

  return (
    <div
      className={`qpass-toast pointer-events-auto relative overflow-hidden rounded-xl border bg-white shadow-xl ${tone}`}
      data-variant={toast.variant}
      role={toast.variant === "error" ? "alert" : "status"}
      aria-live={toast.variant === "error" ? "assertive" : "polite"}
      aria-atomic="true"
    >
      <div className="flex items-start gap-3 px-4 py-3.5 pr-11">
        <span className="qpass-toast-icon" aria-hidden="true"><Icon className="h-5 w-5" /></span>
        <div className="min-w-0">
          <p className="font-semibold leading-5">{toast.title}</p>
          {toast.description ? (
            <p className="mt-1 text-sm leading-5 text-slate-600">{toast.description}</p>
          ) : null}
        </div>
      </div>
      <button
        type="button"
        className="absolute right-2 top-2 rounded-md p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={onDismiss}
        aria-label="Đóng thông báo"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
      <span
        className={`qpass-toast-progress absolute inset-x-0 bottom-0 h-1 origin-left ${progress}`}
        style={{ animationDuration: `${toast.duration}ms` }}
        aria-hidden="true"
      />
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback((input: ToastInput) => {
    const toast: ToastItem = {
      ...input,
      id: toastId(),
      variant: input.variant ?? "success",
      duration: input.duration ?? 5000
    };
    setToasts((current) => [...current.slice(-2), toast]);
    return toast.id;
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect -- Hydrate a one-time message after a full-page authentication redirect. */
  useEffect(() => {
    const queued = consumeQueuedToast();
    if (queued) showToast(queued);
  }, [showToast]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const value = useMemo(() => ({ showToast, dismissToast }), [dismissToast, showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="qpass-toast-viewport" aria-label="Thông báo">
        {toasts.map((toast) => (
          <ToastCard
            key={toast.id}
            toast={toast}
            onDismiss={() => dismissToast(toast.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const value = useContext(ToastContext);
  if (!value) throw new Error("useToast must be used within ToastProvider.");
  return value;
}
