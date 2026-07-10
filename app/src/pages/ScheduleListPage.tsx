import { Edit3, ListFilter, Search } from "lucide-react";
import { Card } from "../components/ui/Card";
import { PageHeader } from "../components/ui/PageHeader";
import { StatusBadge } from "../components/ui/StatusBadge";
import { formatDateLong } from "../lib/format";
import type { ScheduleView } from "../types/domain";

interface ScheduleListPageProps {
  query: string;
  schedules: ScheduleView[];
  setQuery: (query: string) => void;
  onEdit: (schedule: ScheduleView) => void;
}

export function ScheduleListPage({ query, schedules, setQuery, onEdit }: ScheduleListPageProps) {
  return (
    <>
      <PageHeader
        description="상품명, 브랜드, 홈쇼핑 채널, 업체 기준으로 판매와 출고 기록을 빠르게 찾습니다."
        eyebrow="Search"
        title={`검색 목록 (${schedules.length}건)`}
      />

      <div className="mb-6 flex items-center justify-between gap-4">
        <label className="relative w-full max-w-xl">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-secondary"
            size={20}
          />
          <input
            className="h-12 w-full rounded border border-border-subtle bg-white pl-10 pr-4 text-sm outline-none transition focus:border-primary-action focus:ring-4 focus:ring-primary-action/10"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="예: 다이슨, Home Shopping+, 출고 준비"
            value={query}
          />
        </label>
        <button className="inline-flex h-12 items-center gap-2 rounded border border-border-subtle bg-white px-4 text-sm font-bold text-secondary transition hover:text-text-heading">
          <ListFilter size={18} />
          필터
        </button>
      </div>

      <Card>
        <table className="w-full text-left">
          <thead className="bg-surface-container text-xs font-bold uppercase tracking-wide text-secondary">
            <tr>
              <th className="px-6 py-4">판매 일정</th>
              <th className="px-4 py-4">상품명</th>
              <th className="px-4 py-4">채널</th>
              <th className="px-4 py-4">업체</th>
              <th className="px-4 py-4">출고일</th>
              <th className="px-4 py-4">상태</th>
              <th className="px-4 py-4">동기화</th>
              <th className="px-6 py-4 text-right">액션</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {schedules.map((schedule) => (
              <tr className="transition hover:bg-surface-container-low" key={schedule.id}>
                <td className="px-6 py-5 font-data text-sm">
                  <div className="font-bold">{formatDateLong(schedule.saleDate)}</div>
                  <div className="mt-1 text-secondary">
                    {schedule.saleStartTime} - {schedule.saleEndTime}
                  </div>
                </td>
                <td className="px-4 py-5">
                  <div className="font-bold">
                    <span className="text-primary">{schedule.product.brandName}</span>{" "}
                    {schedule.product.name}
                  </div>
                  <div className="mt-1 text-sm text-secondary">수량 {schedule.quantity}개</div>
                </td>
                <td className="px-4 py-5 text-sm text-secondary">{schedule.channel.name}</td>
                <td className="px-4 py-5 text-sm text-secondary">{schedule.partner.name}</td>
                <td className="px-4 py-5 font-data text-sm">{formatDateLong(schedule.shipmentDate)}</td>
                <td className="px-4 py-5">
                  <StatusBadge type="schedule" value={schedule.status} />
                </td>
                <td className="px-4 py-5">
                  <StatusBadge type="sync" value={schedule.syncStatus} />
                </td>
                <td className="px-6 py-5 text-right">
                  <button
                    aria-label="일정 수정"
                    className="inline-grid h-9 w-9 place-items-center rounded text-secondary transition hover:bg-white hover:text-primary"
                    type="button"
                    onClick={() => onEdit(schedule)}
                  >
                    <Edit3 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}

