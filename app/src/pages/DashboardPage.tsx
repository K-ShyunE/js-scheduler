import { useState, useMemo } from "react";
import { ArrowRight, CalendarClock, CircleAlert, PackageCheck, Plus, ShoppingCart, List, ChevronRight, X, Edit3 } from "lucide-react";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { PageHeader } from "../components/ui/PageHeader";
import { formatDate } from "../lib/format";
import type { ScheduleView, SyncLog } from "../types/domain";
import { DashboardCalendar } from "../components/ui/DashboardCalendar";

interface DashboardPageProps {
  isLoading: boolean;
  onCreate: () => void;
  onEdit: (schedule: ScheduleView) => void;
  schedules: ScheduleView[];
  stats: {
    total: number;
    scheduledCount: number;
    readyCount: number;
    failedSyncCount: number;
    syncHealth: string;
  };
  syncLogs: SyncLog[];
}

export function DashboardPage({
  isLoading,
  onCreate,
  onEdit,
  schedules,
  stats,
  syncLogs,
}: DashboardPageProps) {
  const [activeTab, setActiveTab] = useState<string>("calendar");
  const [openDateTabs, setOpenDateTabs] = useState<string[]>([]);
  
  // Drag and drop states
  const [draggedTab, setDraggedTab] = useState<string | null>(null);
  const [dragOverTab, setDragOverTab] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<"left" | "right" | null>(null);

  const derivedStats = useMemo(() => {
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    const next7Days = new Date(today);
    next7Days.setDate(next7Days.getDate() + 7);
    const next7DaysStr = next7Days.toISOString().split("T")[0];

    const upcomingSalesNext7Days = schedules.filter(
      (s) => s.saleDate >= todayStr && s.saleDate <= next7DaysStr
    );

    const thisMonthShipments = schedules.filter(
      (s) => s.shipmentDate && s.shipmentDate >= todayStr && s.status === "shipping_ready"
    );

    return {
      upcomingSalesCount: upcomingSalesNext7Days.length,
      upcomingShipmentsCount: thisMonthShipments.length,
    };
  }, [schedules]);

  // Extract schedules that happen on the currently active date tab (if it's a date)
  const activeDayEvents = useMemo(() => {
    if (activeTab === "calendar") return [];
    
    const dayEvents = schedules.reduce((acc, schedule) => {
      if (schedule.saleDate === activeTab) {
        acc.push({ type: "sale", schedule });
      }
      if (schedule.shipmentDate === activeTab) {
        acc.push({ type: "shipment", schedule });
      }
      return acc;
    }, [] as { type: "sale" | "shipment"; schedule: ScheduleView }[]);

    dayEvents.sort((a, b) => {
      if (a.type !== b.type) return a.type === "sale" ? -1 : 1;
      return a.schedule.saleStartTime.localeCompare(b.schedule.saleStartTime);
    });

    return dayEvents;
  }, [schedules, activeTab]);

  const handleDragStart = (e: React.DragEvent, dateStr: string) => {
    setDraggedTab(dateStr);
    // Setting effectAllowed restricts the type of drop effect that can be applied
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, dateStr: string) => {
    e.preventDefault(); // Necessary to allow dropping
    if (!draggedTab || draggedTab === dateStr) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const midX = rect.left + rect.width / 2;
    
    setDragOverTab(dateStr);
    setDropPosition(e.clientX < midX ? "left" : "right");
  };

  const handleDragLeave = (e: React.DragEvent, dateStr: string) => {
    // Only reset if moving completely out of the tab, ignoring child elements like the X button
    if (dragOverTab === dateStr) {
      // Check if relatedTarget is inside the tab, if so don't reset
      const isChild = e.currentTarget.contains(e.relatedTarget as Node);
      if (!isChild) {
        setDragOverTab(null);
        setDropPosition(null);
      }
    }
  };

  const handleDrop = (e: React.DragEvent, dateStr: string) => {
    e.preventDefault();
    if (!draggedTab || draggedTab === dateStr || !dropPosition) return;

    const newTabs = [...openDateTabs];
    const draggedIdx = newTabs.indexOf(draggedTab);
    newTabs.splice(draggedIdx, 1);
    
    const targetIdx = newTabs.indexOf(dateStr);
    const insertIdx = dropPosition === "left" ? targetIdx : targetIdx + 1;
    newTabs.splice(insertIdx, 0, draggedTab);
    
    setOpenDateTabs(newTabs);
    setDraggedTab(null);
    setDragOverTab(null);
    setDropPosition(null);
  };

  const handleDragEnd = () => {
    setDraggedTab(null);
    setDragOverTab(null);
    setDropPosition(null);
  };

  return (
    <>
      <div className="mb-2 px-8 pt-8">
        <span className="text-primary text-[11px] uppercase tracking-wider font-bold">OPERATIONS DASHBOARD</span>
        <h2 className="text-[32px] font-bold mt-1 text-text-heading leading-[40px]">홈쇼핑 일정 대시보드</h2>
        <p className="text-[14px] text-secondary mt-1">상품 판매 일정과 출고 일정을 캘린더에서 한눈에 확인하고, Google 공유 상태를 추적합니다.</p>
      </div>

      <div className="p-8 space-y-6">
        <section className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-surface-card p-6 border border-border-subtle rounded-xl flex items-start justify-between shadow-sm">
            <div>
              <span className="text-[13px] text-secondary font-semibold uppercase">총 등록 일정</span>
              <div className="flex items-baseline gap-1 mt-2">
                <span className="text-[32px] font-bold text-on-surface leading-tight">{stats.total}</span>
                <span className="text-[18px] font-semibold text-secondary">건</span>
              </div>
            </div>
            <div className="p-3 bg-primary-soft text-primary rounded-xl">
              <CalendarClock size={24} />
            </div>
          </div>
          
          <div className="bg-surface-card p-6 border border-border-subtle rounded-xl flex items-start justify-between shadow-sm">
            <div>
              <span className="text-[13px] text-secondary font-semibold uppercase">최근 7일 방송 예정</span>
              <div className="flex items-baseline gap-1 mt-2">
                <span className="text-[32px] font-bold text-on-surface leading-tight">{derivedStats.upcomingSalesCount}</span>
                <span className="text-[18px] font-semibold text-secondary">건</span>
              </div>
            </div>
            <div className="p-3 bg-blue-50 text-broadcast-blue rounded-xl">
              <ShoppingCart size={24} />
            </div>
          </div>
          
          <div className="bg-surface-card p-6 border border-border-subtle rounded-xl flex items-start justify-between shadow-sm">
            <div>
              <span className="text-[13px] text-secondary font-semibold uppercase">이번 달 출고 대기</span>
              <div className="flex items-baseline gap-1 mt-2">
                <span className="text-[32px] font-bold text-on-surface leading-tight">{derivedStats.upcomingShipmentsCount}</span>
                <span className="text-[18px] font-semibold text-secondary">건</span>
              </div>
            </div>
            <div className="p-3 bg-tertiary-soft text-tertiary rounded-xl">
              <PackageCheck size={24} />
            </div>
          </div>
          
          <div className="bg-surface-card p-6 border border-border-subtle rounded-xl flex items-start justify-between shadow-sm">
            <div>
              <span className="text-[13px] text-secondary font-semibold uppercase">동기화 상태</span>
              <div className="flex items-baseline gap-1 mt-2">
                <span className="text-[32px] font-bold text-tertiary leading-tight">정상</span>
              </div>
            </div>
            <div className="p-3 bg-surface-container-high text-secondary rounded-xl">
              <CircleAlert size={24} />
            </div>
          </div>
        </section>

        {/* Tab Bar Navigation */}
        <div 
          className="flex items-center gap-2 border-b border-border-subtle pb-0 overflow-x-auto select-none"
          onDragLeave={() => {
            // Optional: reset if completely leaves the tab bar
          }}
        >
          <button
            onClick={() => setActiveTab("calendar")}
            className={`px-5 py-3 text-[14px] font-bold rounded-t-lg border-b-2 transition-colors shrink-0 ${
              activeTab === "calendar"
                ? "border-primary text-primary bg-primary-soft/20"
                : "border-transparent text-secondary hover:bg-surface-container-low hover:text-text-heading"
            }`}
          >
            월간 캘린더
          </button>
          
          {openDateTabs.map(dateStr => {
            const isDragging = draggedTab === dateStr;
            const isDragTarget = dragOverTab === dateStr;
            const showLeftLine = isDragTarget && dropPosition === "left";
            const showRightLine = isDragTarget && dropPosition === "right";

            return (
              <div
                key={dateStr}
                draggable
                onDragStart={(e) => handleDragStart(e, dateStr)}
                onDragOver={(e) => handleDragOver(e, dateStr)}
                onDragLeave={(e) => handleDragLeave(e, dateStr)}
                onDrop={(e) => handleDrop(e, dateStr)}
                onDragEnd={handleDragEnd}
                className={`relative flex items-center gap-2 px-4 py-3 text-[14px] font-bold rounded-t-lg border-b-2 transition-colors cursor-pointer group shrink-0 ${
                  activeTab === dateStr
                    ? "border-primary text-primary bg-primary-soft/20"
                    : "border-transparent text-secondary hover:bg-surface-container-low hover:text-text-heading"
                } ${isDragging ? "opacity-30" : "opacity-100"}`}
                onClick={() => setActiveTab(dateStr)}
              >
                {/* Visual Indicators for Drop Position */}
                {showLeftLine && (
                  <div className="absolute left-0 top-2 bottom-2 w-[3px] bg-primary rounded-full z-10 animate-in fade-in" />
                )}
                {showRightLine && (
                  <div className="absolute right-0 top-2 bottom-2 w-[3px] bg-primary rounded-full z-10 animate-in fade-in" />
                )}

                <span className="pointer-events-none">{formatDate(dateStr)}</span>
                <button
                  className={`p-1 rounded-full transition-colors ${
                    activeTab === dateStr 
                      ? "hover:bg-primary-soft text-primary" 
                      : "hover:bg-surface-dim text-secondary"
                  }`}
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent tab click
                    const newTabs = openDateTabs.filter(t => t !== dateStr);
                    setOpenDateTabs(newTabs);
                    if (activeTab === dateStr) {
                      // Switch back to calendar if closing the active tab
                      setActiveTab("calendar");
                    }
                  }}
                >
                  <X size={14} strokeWidth={3} className="pointer-events-none" />
                </button>
              </div>
            );
          })}
        </div>

        {/* Conditional Rendering of Content */}
        <section className="grid grid-cols-1 gap-6">
          {activeTab === "calendar" ? (
            <div className="bg-surface-card border border-border-subtle rounded-xl overflow-hidden shadow-sm animate-in fade-in zoom-in-95 duration-200">
              <DashboardCalendar
                schedules={schedules}
                onSelectDate={(dateStr) => {
                  if (!openDateTabs.includes(dateStr)) {
                    setOpenDateTabs((prev) => [...prev, dateStr]);
                  }
                  setActiveTab(dateStr);
                }}
                selectedDate={null}
                onCreate={onCreate}
              />
            </div>
          ) : (
            <div className="bg-surface-card border border-border-subtle rounded-xl overflow-hidden shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-200">
              <div className="p-6 border-b border-border-subtle flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary-soft text-primary rounded-lg">
                    <List size={24} />
                  </div>
                  <div>
                    <h3 className="text-[18px] font-bold">{formatDate(activeTab)} 상세 일정</h3>
                    <p className="text-[13px] text-secondary mt-1">이 날짜에 예정된 모든 홈쇼핑 방송 및 제품 출고 목록입니다.</p>
                  </div>
                </div>
                <div>
                  <Button 
                    className="h-9 px-3"
                    variant="ghost"
                    onClick={() => setActiveTab("calendar")}
                  >
                    캘린더로 돌아가기
                  </Button>
                </div>
              </div>
              <div className="overflow-x-auto min-h-[400px]">
                <table className="w-full text-left border-collapse text-[13px]">
                  <thead>
                    <tr className="bg-surface-container border-b border-border-subtle">
                      <th className="px-6 py-4 font-semibold text-secondary uppercase whitespace-nowrap">분류</th>
                      <th className="px-6 py-4 font-semibold text-secondary uppercase whitespace-nowrap">시간</th>
                      <th className="px-6 py-4 font-semibold text-secondary uppercase whitespace-nowrap">업체</th>
                      <th className="px-6 py-4 font-semibold text-secondary uppercase whitespace-nowrap">상품명</th>
                      <th className="px-6 py-4 font-semibold text-secondary uppercase whitespace-nowrap">수량</th>
                      <th className="px-6 py-4 font-semibold text-secondary uppercase whitespace-nowrap text-right">상태</th>
                      <th className="px-6 py-4 font-semibold text-secondary uppercase whitespace-nowrap text-right">액션</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle">
                    {activeDayEvents.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-16 text-center">
                          <p className="text-secondary text-base">이 날짜에 등록된 일정이 없습니다.</p>
                        </td>
                      </tr>
                    ) : (
                      activeDayEvents.map((ev, idx) => (
                        <tr key={idx} className="hover:bg-surface-container-low transition-colors group">
                          <td className="px-6 py-4 font-semibold">
                            {ev.type === "sale" ? (
                              <span className="text-broadcast-blue">방송</span>
                            ) : (
                              <span className="text-tertiary">출고</span>
                            )}
                          </td>
                          <td className="px-6 py-4 font-semibold text-on-surface">
                            {ev.type === "sale" ? `${ev.schedule.saleStartTime} - ${ev.schedule.saleEndTime}` : '-'}
                          </td>
                          <td className="px-6 py-4 text-secondary">{ev.schedule.partner.name}</td>
                          <td className="px-6 py-4 text-on-surface font-medium">{ev.schedule.product.name}</td>
                          <td className="px-6 py-4 font-bold text-primary">{ev.schedule.quantity.toLocaleString()}</td>
                          <td className="px-6 py-4 text-right">
                            {ev.type === "sale" ? (
                              <span className="px-2 py-1 bg-blue-50 text-broadcast-blue text-[11px] font-bold rounded">방송예정</span>
                            ) : (
                              <span className="px-2 py-1 bg-tertiary-soft text-tertiary text-[11px] font-bold rounded">출고준비</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              aria-label="일정 수정"
                              className="inline-grid h-8 w-8 place-items-center rounded text-secondary transition hover:bg-white hover:text-primary"
                              type="button"
                              onClick={() => onEdit(ev.schedule)}
                            >
                              <Edit3 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
