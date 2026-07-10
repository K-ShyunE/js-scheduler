import type { ScheduleStatus, SyncStatus } from "../types/domain";

export function formatDate(value: string) {
  if (!value) return "-";
  try {
    const d = new Date(`${value}T00:00:00+09:00`);
    if (isNaN(d.getTime())) return "-";
    return new Intl.DateTimeFormat("ko-KR", {
      month: "2-digit",
      day: "2-digit",
      weekday: "short",
    }).format(d);
  } catch {
    return "-";
  }
}

export function formatDateLong(value: string) {
  if (!value) return "-";
  try {
    const d = new Date(`${value}T00:00:00+09:00`);
    if (isNaN(d.getTime())) return "-";
    return new Intl.DateTimeFormat("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      weekday: "short",
    }).format(d);
  } catch {
    return "-";
  }
}

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function scheduleStatusLabel(status: ScheduleStatus) {
  const labels: Record<ScheduleStatus, string> = {
    draft: "임시",
    scheduled: "판매 예정",
    sold: "판매 완료",
    shipping_ready: "출고 준비",
    shipped: "출고 완료",
    cancelled: "취소",
  };

  return labels[status];
}

export function syncStatusLabel(status: SyncStatus) {
  const labels: Record<SyncStatus, string> = {
    not_synced: "미전송",
    synced: "동기화 완료",
    sync_failed: "실패",
    sync_pending: "대기",
  };

  return labels[status];
}

