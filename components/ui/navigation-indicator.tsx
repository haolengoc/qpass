import { LoaderCircle } from "lucide-react";

export function NavigationIndicator() {
  return (
    <span
      className="qpass-navigation-indicator"
      role="status"
      aria-live="polite"
      aria-atomic="true"
      data-navigation-indicator
    >
      <LoaderCircle className="qpass-navigation-spinner" size={18} aria-hidden="true" />
      <span>Đang tải…</span>
    </span>
  );
}
