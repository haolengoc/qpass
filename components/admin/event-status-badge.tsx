import type { DerivedEventState } from "@/lib/time/event-state";
import { cn } from "@/lib/utils/cn";

const labels: Record<DerivedEventState, string> = {
  CANCELLED: "Đã hủy",
  DRAFT: "Bản nháp",
  COMPLETED: "Đã kết thúc",
  ONGOING: "Đang diễn ra",
  NOT_OPEN_YET: "Chưa mở đăng ký",
  OPEN: "Đang mở đăng ký",
  FULL: "Đã đủ chỗ",
  CLOSED: "Đã đóng đăng ký"
};

const colors: Record<DerivedEventState, string> = {
  CANCELLED: "bg-red-50 text-red-700 ring-red-200",
  DRAFT: "bg-slate-100 text-slate-700 ring-slate-200",
  COMPLETED: "bg-zinc-100 text-zinc-700 ring-zinc-200",
  ONGOING: "bg-amber-50 text-amber-800 ring-amber-200",
  NOT_OPEN_YET: "bg-blue-50 text-blue-700 ring-blue-200",
  OPEN: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  FULL: "bg-orange-50 text-orange-800 ring-orange-200",
  CLOSED: "bg-zinc-100 text-zinc-700 ring-zinc-200"
};

export function EventStatusBadge({ state }: { state: DerivedEventState }) {
  return (
    <span
      className={cn(
        "inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset",
        colors[state]
      )}
    >
      {labels[state]}
    </span>
  );
}

