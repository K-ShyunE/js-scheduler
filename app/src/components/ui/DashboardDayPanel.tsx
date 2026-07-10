import { X } from "lucide-react";
import type { ScheduleView } from "../../types/domain";
import { formatDate } from "../../lib/format";
import { StatusBadge } from "./StatusBadge";

interface DashboardDayPanelProps {
  dateStr: string;
  schedules: ScheduleView[];
  onClose: () => void;
}

export function DashboardDayPanel({ dateStr, schedules, onClose }: DashboardDayPanelProps) {
  // Extract schedules that happen on this day (either sale or shipment)
  const dayEvents = schedules.reduce((acc, schedule) => {
    if (schedule.saleDate === dateStr) {
      acc.push({ type: "sale", schedule });
    }
    if (schedule.shipmentDate === dateStr) {
      acc.push({ type: "shipment", schedule });
    }
    return acc;
  }, [] as { type: "sale" | "shipment"; schedule: ScheduleView }[]);

  // Sort: Broadcast first, then by time
  dayEvents.sort((a, b) => {
    if (a.type !== b.type) return a.type === "sale" ? -1 : 1;
    return a.schedule.saleStartTime.localeCompare(b.schedule.saleStartTime);
  });

  return (
    <div className="flex flex-col h-full bg-surface border-l border-border-subtle shadow-xl">
      <div className="flex items-center justify-between px-6 py-5 border-b border-border-subtle">
        <div>
          <h2 className="text-lg font-bold text-text-heading">{formatDate(dateStr)} 일정</h2>
          <p className="text-sm text-secondary mt-1">총 {dayEvents.length}건의 일정이 있습니다.</p>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-full hover:bg-surface-container text-secondary transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {dayEvents.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-secondary">
            <p>이 날짜에 등록된 일정이 없습니다.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {dayEvents.map((ev, idx) => (
              <div
                key={`${ev.schedule.id}-${ev.type}-${idx}`}
                className="bg-surface-container-lowest border border-border-subtle rounded-lg p-4"
              >
                <div className="flex items-start justify-between mb-3">
                  <span
                    className={`text-xs font-bold px-2 py-1 rounded ${
                      ev.type === "sale"
                        ? "bg-blue-50 text-broadcast-blue"
                        : "bg-tertiary-soft text-tertiary"
                    }`}
                  >
                    {ev.type === "sale" ? "방송 일정" : "출고 일정"}
                  </span>
                  <StatusBadge type="schedule" value={ev.schedule.status} />
                </div>

                <h3 className="font-bold text-text-heading mb-1">{ev.schedule.product.name}</h3>
                <p className="text-sm text-secondary mb-3">
                  {ev.schedule.product.brandName} · {ev.schedule.channel.name}
                </p>

                <div className="grid grid-cols-2 gap-y-2 text-sm">
                  <div className="text-secondary">방송 시간</div>
                  <div className="font-medium text-right">
                    {ev.schedule.saleStartTime} - {ev.schedule.saleEndTime}
                  </div>
                  
                  <div className="text-secondary">수량</div>
                  <div className="font-medium text-right">{ev.schedule.quantity.toLocaleString()}개</div>

                  {ev.type === "sale" && ev.schedule.shipmentDate && (
                    <>
                      <div className="text-secondary">출고일</div>
                      <div className="font-medium text-right">{formatDate(ev.schedule.shipmentDate)}</div>
                    </>
                  )}
                  {ev.type === "shipment" && (
                    <>
                      <div className="text-secondary">방송일</div>
                      <div className="font-medium text-right">{formatDate(ev.schedule.saleDate)}</div>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
