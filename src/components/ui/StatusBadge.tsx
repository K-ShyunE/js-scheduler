import { clsx } from "clsx";
import type { ScheduleStatus, SyncStatus } from "../../types/domain";
import { scheduleStatusLabel, syncStatusLabel } from "../../lib/format";

type StatusBadgeProps =
  | {
      type: "schedule";
      value: ScheduleStatus;
    }
  | {
      type: "sync";
      value: SyncStatus;
    };

export function StatusBadge(props: StatusBadgeProps) {
  const label =
    props.type === "schedule"
      ? scheduleStatusLabel(props.value)
      : syncStatusLabel(props.value);

  return (
    <span
      className={clsx(
        "inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-bold",
        props.value === "synced" && "bg-tertiary-soft text-tertiary",
        props.value === "sync_pending" && "bg-blue-50 text-broadcast-blue",
        props.value === "sync_failed" && "bg-red-50 text-error",
        props.value === "not_synced" && "bg-surface-container-high text-secondary",
        props.value === "scheduled" && "bg-blue-50 text-broadcast-blue",
        props.value === "shipping_ready" && "bg-primary-soft text-primary",
        props.value === "draft" && "bg-surface-container-high text-secondary",
        props.value === "sold" && "bg-tertiary-soft text-tertiary",
        props.value === "shipped" && "bg-surface-container-high text-secondary",
        props.value === "cancelled" && "bg-red-50 text-error",
      )}
    >
      <span className="h-2 w-2 rounded-full bg-current" />
      {label}
    </span>
  );
}

