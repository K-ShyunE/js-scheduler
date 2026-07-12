import { useState } from "react";
import { Edit3, List as ListIcon, Search, RefreshCw, ArrowDown, ArrowUp } from "lucide-react";
import { Card } from "../components/ui/Card";
import { PageHeader } from "../components/ui/PageHeader";
import { StatusBadge } from "../components/ui/StatusBadge";
import { formatDateLong } from "../lib/format";
import type { ScheduleView, Channel, Partner } from "../types/domain";

interface ScheduleListPageProps {
  query: string;
  schedules: ScheduleView[];
  setQuery: (query: string) => void;
  channels: Channel[];
  partners: Partner[];
  channelFilter: string;
  setChannelFilter: (val: string) => void;
  partnerFilter: string;
  setPartnerFilter: (val: string) => void;
  sortBy: string;
  setSortBy: (val: string) => void;
  sortOrder: "ASC" | "DESC";
  setSortOrder: (val: "ASC" | "DESC") => void;
  onEdit: (schedule: ScheduleView) => void;
  onSync: (schedule: ScheduleView) => Promise<void>;
}

export function ScheduleListPage({
  query,
  schedules,
  setQuery,
  channels,
  partners,
  channelFilter,
  setChannelFilter,
  partnerFilter,
  setPartnerFilter,
  sortBy,
  setSortBy,
  sortOrder,
  setSortOrder,
  onEdit,
  onSync,
}: ScheduleListPageProps) {
  const [syncingId, setSyncingId] = useState<string | null>(null);

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "ASC" ? "DESC" : "ASC");
    } else {
      setSortBy(field);
      setSortOrder("DESC");
    }
  };

  const renderSortIcon = (field: string) => {
    if (sortBy !== field) return null;
    return sortOrder === "ASC" ? <ArrowUp size={14} className="inline ml-1" /> : <ArrowDown size={14} className="inline ml-1" />;
  };

  const handleSyncClick = async (schedule: ScheduleView) => {
    if (syncingId) return;
    setSyncingId(schedule.id);
    try {
      await onSync(schedule);
    } finally {
      setSyncingId(null);
    }
  };

  return (
    <>
      <PageHeader
        description="상품명, 브랜드, 홈쇼핑 채널, 업체 기준으로 판매와 출고 기록을 빠르게 찾습니다."
        eyebrow="Search"
        title={`일정 목록 (${schedules.length}건)`}
      />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <label className="relative flex-1 max-w-xl min-w-[200px]">
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
        
        <div className="flex gap-2">
          <select
            value={channelFilter}
            onChange={(e) => setChannelFilter(e.target.value)}
            className="h-12 rounded border border-border-subtle bg-white px-4 text-sm outline-none transition focus:border-primary-action"
          >
            <option value="">모든 홈쇼핑</option>
            {channels.map((ch) => (
              <option key={ch.id} value={ch.id}>{ch.name}</option>
            ))}
          </select>

          <select
            value={partnerFilter}
            onChange={(e) => setPartnerFilter(e.target.value)}
            className="h-12 rounded border border-border-subtle bg-white px-4 text-sm outline-none transition focus:border-primary-action"
          >
            <option value="">모든 업체</option>
            {partners.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap">
            <thead className="bg-surface-container text-xs font-bold uppercase tracking-wide text-secondary">
              <tr>
                <th className="px-6 py-4 cursor-pointer hover:text-primary transition-colors select-none" onClick={() => handleSort("saleDate")}>
                  판매 일정 {renderSortIcon("saleDate")}
                </th>
                <th className="px-4 py-4">상품명</th>
                <th className="px-4 py-4">채널</th>
                <th className="px-4 py-4">업체</th>
                <th className="px-4 py-4 cursor-pointer hover:text-primary transition-colors select-none" onClick={() => handleSort("shipmentDate")}>
                  출고일 {renderSortIcon("shipmentDate")}
                </th>
                <th className="px-4 py-4">상태</th>
                <th className="px-4 py-4">동기화</th>
                <th className="px-4 py-4 cursor-pointer hover:text-primary transition-colors select-none" onClick={() => handleSort("createdAt")}>
                  등록일자 {renderSortIcon("createdAt")}
                </th>
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
                    <div className="font-bold max-w-[200px] truncate" title={`${schedule.product.brandName} ${schedule.product.name}`}>
                      <span className="text-primary">{schedule.product.brandName}</span>{" "}
                      {schedule.product.name}
                    </div>
                    <div className="mt-1 text-sm text-secondary">수량 {schedule.quantity}개</div>
                  </td>
                  <td className="px-4 py-5 text-sm text-secondary">{schedule.channel.name}</td>
                  <td className="px-4 py-5 text-sm text-secondary">{schedule.partner.name}</td>
                  <td className="px-4 py-5 font-data text-sm">{schedule.shipmentDate ? formatDateLong(schedule.shipmentDate) : '-'}</td>
                  <td className="px-4 py-5">
                    <StatusBadge type="schedule" value={schedule.status} />
                  </td>
                  <td className="px-4 py-5">
                    <StatusBadge type="sync" value={schedule.syncStatus} />
                  </td>
                  <td className="px-4 py-5 font-data text-sm text-secondary">
                    {formatDateLong(schedule.createdAt)}
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        aria-label="동기화 재시도"
                        className={`inline-grid h-9 w-9 place-items-center rounded transition ${syncingId === schedule.id ? 'text-primary opacity-50 cursor-not-allowed' : 'text-secondary hover:bg-white hover:text-primary'}`}
                        type="button"
                        disabled={syncingId === schedule.id}
                        onClick={() => handleSyncClick(schedule)}
                      >
                        <RefreshCw size={18} className={syncingId === schedule.id ? "animate-spin" : ""} />
                      </button>
                      <button
                        aria-label="일정 수정"
                        className="inline-grid h-9 w-9 place-items-center rounded text-secondary transition hover:bg-white hover:text-primary"
                        type="button"
                        onClick={() => onEdit(schedule)}
                      >
                        <Edit3 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
