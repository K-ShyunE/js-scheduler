import { ArrowRight, CalendarClock, CircleAlert, PackageCheck, Plus, RefreshCw } from "lucide-react";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { PageHeader } from "../components/ui/PageHeader";
import { StatusBadge } from "../components/ui/StatusBadge";
import { formatDate, formatDateTime } from "../lib/format";
import type { ScheduleView, SyncLog } from "../types/domain";

interface DashboardPageProps {
  isLoading: boolean;
  onCreate: () => void;
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
  schedules,
  stats,
  syncLogs,
}: DashboardPageProps) {
  const upcoming = schedules.slice(0, 5);

  return (
    <>
      <PageHeader
        action={
          <Button onClick={onCreate}>
            <Plus size={18} />
            신규 일정 등록
          </Button>
        }
        description="상품 판매 일정과 출고 일정을 한 곳에서 확인하고, Google Sheets와 Calendar 공유 상태를 추적합니다."
        eyebrow="Operations Dashboard"
        title="홈쇼핑 일정 대시보드"
      />

      <section className="mb-6 grid grid-cols-4 gap-4">
        <MetricCard icon={CalendarClock} label="등록 일정" value={`${stats.total}건`} tone="primary" />
        <MetricCard icon={RefreshCw} label="판매 예정" value={`${stats.scheduledCount}건`} tone="blue" />
        <MetricCard icon={PackageCheck} label="출고 준비" value={`${stats.readyCount}건`} tone="green" />
        <MetricCard
          icon={CircleAlert}
          label="동기화 상태"
          value={stats.syncHealth}
          tone={stats.failedSyncCount > 0 ? "red" : "green"}
        />
      </section>

      <section className="grid grid-cols-[1fr_360px] gap-6">
        <Card>
          <div className="flex items-center justify-between border-b border-border-subtle px-6 py-5">
            <div>
              <h3 className="text-lg font-bold">다가오는 판매 및 출고</h3>
              <p className="mt-1 text-sm text-secondary">
                수기 다이어리에서 가장 자주 확인하던 항목을 우선 배치했습니다.
              </p>
            </div>
            <Button variant="secondary">전체 보기</Button>
          </div>

          <div className="overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-surface-container text-xs font-bold uppercase tracking-wide text-secondary">
                <tr>
                  <th className="px-6 py-4">판매일</th>
                  <th className="px-4 py-4">상품</th>
                  <th className="px-4 py-4">채널</th>
                  <th className="px-4 py-4">출고일</th>
                  <th className="px-4 py-4">상태</th>
                  <th className="px-6 py-4">Google</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {isLoading ? (
                  <tr>
                    <td className="px-6 py-10 text-center text-sm text-secondary" colSpan={6}>
                      데이터를 불러오는 중입니다.
                    </td>
                  </tr>
                ) : null}
                {!isLoading && upcoming.map((schedule) => (
                  <tr className="transition hover:bg-surface-container-low" key={schedule.id}>
                    <td className="px-6 py-5 font-data text-sm font-semibold">
                      {formatDate(schedule.saleDate)}
                      <div className="mt-1 text-xs text-secondary">
                        {schedule.saleStartTime} - {schedule.saleEndTime}
                      </div>
                    </td>
                    <td className="px-4 py-5">
                      <div className="font-bold">{schedule.product.name}</div>
                      <div className="mt-1 text-sm text-secondary">{schedule.product.brandName}</div>
                    </td>
                    <td className="px-4 py-5 text-sm text-secondary">{schedule.channel.name}</td>
                    <td className="px-4 py-5 font-data text-sm">{formatDate(schedule.shipmentDate)}</td>
                    <td className="px-4 py-5">
                      <StatusBadge type="schedule" value={schedule.status} />
                    </td>
                    <td className="px-6 py-5">
                      <StatusBadge type="sync" value={schedule.syncStatus} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold">Google Sync Health</h3>
                <p className="mt-1 text-sm text-secondary">Sheets와 Calendar 작성 대기/실패 상태</p>
              </div>
              <div className="rounded-full bg-tertiary-soft p-3 text-tertiary">
                <RefreshCw size={20} />
              </div>
            </div>
            <div className="mt-6 h-2 overflow-hidden rounded-full bg-surface-container">
              <div className="h-full w-[82%] bg-tertiary" />
            </div>
            <div className="mt-4 flex justify-between text-sm">
              <span className="text-secondary">동기화 준비율</span>
              <span className="font-bold text-tertiary">82%</span>
            </div>
          </Card>

          <Card>
            <div className="border-b border-border-subtle px-6 py-5">
              <h3 className="text-lg font-bold">최근 동기화 기록</h3>
            </div>
            <div className="divide-y divide-border-subtle">
              {syncLogs.slice(0, 4).map((log) => (
                <div className="px-6 py-4" key={log.id}>
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-bold">{log.message}</p>
                    <ArrowRight className="shrink-0 text-secondary" size={17} />
                  </div>
                  <p className="mt-1 text-xs text-secondary">
                    {log.target === "sheets" ? "Google Sheets" : "Google Calendar"} ·{" "}
                    {formatDateTime(log.createdAt)}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </section>
    </>
  );
}

interface MetricCardProps {
  icon: typeof CalendarClock;
  label: string;
  tone: "primary" | "blue" | "green" | "red";
  value: string;
}

function MetricCard({ icon: Icon, label, tone, value }: MetricCardProps) {
  const toneClass = {
    primary: "text-primary bg-primary-soft",
    blue: "text-broadcast-blue bg-blue-50",
    green: "text-tertiary bg-tertiary-soft",
    red: "text-error bg-red-50",
  }[tone];

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-secondary">{label}</p>
          <p className="mt-3 text-[31px] font-extrabold leading-9 text-primary">{value}</p>
        </div>
        <div className={`rounded-lg p-3 ${toneClass}`}>
          <Icon size={20} />
        </div>
      </div>
    </Card>
  );
}

