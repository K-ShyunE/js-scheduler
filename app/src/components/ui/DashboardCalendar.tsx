import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import type { ScheduleView } from "../../types/domain";
import { clsx } from "clsx";
import { Button } from "./Button";

interface DashboardCalendarProps {
  schedules: ScheduleView[];
  onSelectDate: (dateStr: string) => void;
  selectedDate?: string | null;
  onCreate: () => void;
}

export function DashboardCalendar({ schedules, onSelectDate, selectedDate, onCreate }: DashboardCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const todayStr = new Date().toISOString().split("T")[0];

  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay(); // 0: Sun, 1: Mon, ...

    const totalCells = Math.ceil((daysInMonth + startingDayOfWeek) / 7) * 7;
    const days = [];

    for (let i = 0; i < totalCells; i++) {
      if (i < startingDayOfWeek || i >= startingDayOfWeek + daysInMonth) {
        days.push(null); // Empty cell
      } else {
        const date = i - startingDayOfWeek + 1;
        const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(date).padStart(2, "0")}`;
        days.push({
          date,
          dateStr,
        });
      }
    }
    return days;
  }, [currentMonth]);

  const schedulesByDate = useMemo(() => {
    const map = new Map<string, { type: "sale" | "shipment"; schedule: ScheduleView }[]>();

    schedules.forEach((schedule) => {
      // 방송 일정 추가
      if (schedule.saleDate) {
        const list = map.get(schedule.saleDate) || [];
        list.push({ type: "sale", schedule });
        map.set(schedule.saleDate, list);
      }
      // 출고 일정 추가
      if (schedule.shipmentDate) {
        const list = map.get(schedule.shipmentDate) || [];
        list.push({ type: "shipment", schedule });
        map.set(schedule.shipmentDate, list);
      }
    });

    // 정렬 (방송 먼저, 그다음 시간순)
    map.forEach((list) => {
      list.sort((a, b) => {
        if (a.type !== b.type) return a.type === "sale" ? -1 : 1;
        return a.schedule.saleStartTime.localeCompare(b.schedule.saleStartTime);
      });
    });

    return map;
  }, [schedules]);

  const weekDays = ["일", "월", "화", "수", "목", "금", "토"];

  return (
    <div className="flex flex-col bg-surface">
      <div className="p-6 border-b border-border-subtle flex items-center justify-between">
        <div className="flex items-center gap-6">
          <h3 className="text-[18px] font-bold text-text-heading">
            {currentMonth.getFullYear()}년 {currentMonth.getMonth() + 1}월
          </h3>
          <div className="flex items-center border border-border-subtle rounded-lg p-1 bg-surface-container-low">
            <button
              onClick={prevMonth}
              className="p-1 hover:bg-surface-container-high rounded transition-colors text-secondary"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={() => {
                const now = new Date();
                setCurrentMonth(new Date(now.getFullYear(), now.getMonth(), 1));
              }}
              className="px-3 py-1 text-[13px] font-semibold hover:bg-surface-container-high rounded transition-colors"
            >
              오늘
            </button>
            <button
              onClick={nextMonth}
              className="p-1 hover:bg-surface-container-high rounded transition-colors text-secondary"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={onCreate}
            className="h-9 px-4 text-[13px] rounded-lg shadow-none"
          >
            <Plus size={18} />
            일정 추가
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 border-b border-border-subtle">
        {weekDays.map((day, idx) => (
          <div
            key={day}
            className={clsx(
              "py-3 text-center text-[13px] font-bold border-r border-border-subtle last:border-r-0 bg-surface-container-low",
              idx === 0 ? "text-primary" : idx === 6 ? "text-broadcast-blue" : "text-secondary"
            )}
          >
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 bg-surface-container-low/30">
        {calendarDays.map((cell, idx) => {
          if (!cell) {
            return (
              <div 
                key={`empty-${idx}`} 
                className="min-h-[120px] p-2 border-r border-b border-border-subtle last:border-r-0 bg-surface-container-low/10"
              />
            );
          }

          const dayEvents = schedulesByDate.get(cell.dateStr) || [];
          const displayEvents = dayEvents.slice(0, 3);
          const hasMore = dayEvents.length > 3;
          const isSelected = cell.dateStr === selectedDate;
          const isSunday = idx % 7 === 0;
          const isSaturday = idx % 7 === 6;

          return (
            <div
              key={cell.dateStr}
              onClick={() => onSelectDate(cell.dateStr)}
              className={clsx(
                "min-h-[120px] p-2 border-r border-b border-border-subtle last:border-r-0 transition-colors cursor-pointer group flex flex-col",
                isSelected
                  ? "bg-primary-soft/20 ring-1 ring-inset ring-primary/20"
                  : "hover:bg-surface-container-low"
              )}
            >
              <div
                className={clsx(
                  "w-6 h-6 flex items-center justify-center rounded-full text-[13px] font-bold mb-1",
                  isSelected
                    ? "bg-primary text-on-primary"
                    : isSunday
                    ? "text-primary"
                    : isSaturday
                    ? "text-broadcast-blue"
                    : "text-secondary"
                )}
              >
                {cell.date}
              </div>

              <div className="mt-2 space-y-1 flex-1">
                {displayEvents.map((ev, i) => (
                  <div
                    key={`${ev.schedule.id}-${ev.type}-${i}`}
                    className={clsx(
                      "px-2 py-0.5 text-[10px] rounded truncate font-medium",
                      ev.type === "sale"
                        ? "bg-blue-50 text-broadcast-blue"
                        : "bg-tertiary-soft text-tertiary"
                    )}
                  >
                    <span className="font-bold mr-1">{ev.type === "sale" ? "방송:" : "출고:"}</span>
                    {ev.schedule.product.name}
                  </div>
                ))}
                {hasMore && (
                  <div className="text-[10px] text-secondary font-medium pl-1">
                    +{dayEvents.length - 3}건 더보기
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
