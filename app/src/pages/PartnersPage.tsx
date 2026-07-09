import { useState } from "react";
import { GripVertical, Handshake, PlusCircle, Store, Plus } from "lucide-react";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { PageHeader } from "../components/ui/PageHeader";
import type { Channel, Partner } from "../types/domain";

interface PartnersPageProps {
  channels: Channel[];
  partners: Partner[];
}

export function PartnersPage({ channels, partners }: PartnersPageProps) {
  const [activeTab, setActiveTab] = useState<"channels" | "partners">("channels");
  const activeChannels = channels.filter((channel) => channel.isActive);

  return (
    <>
      <PageHeader
        description="홈쇼핑 채널과 비즈니스 파트너 업체를 관리합니다. 대시보드와 일정 등록 시 적용되는 목록입니다."
        eyebrow="Management"
        title="채널 및 파트너 관리"
      />

      {/* 상단 탭 헤더 */}
      <div className="mb-6 border-b border-border-subtle flex gap-6">
        <button
          onClick={() => setActiveTab("channels")}
          className={`pb-4 text-sm font-bold border-b-2 transition flex items-center gap-2 px-1 ${
            activeTab === "channels"
              ? "border-primary text-primary"
              : "border-transparent text-secondary hover:text-primary"
          }`}
        >
          <Store size={18} />
          홈쇼핑 채널 관리
        </button>
        <button
          onClick={() => setActiveTab("partners")}
          className={`pb-4 text-sm font-bold border-b-2 transition flex items-center gap-2 px-1 ${
            activeTab === "partners"
              ? "border-primary text-primary"
              : "border-transparent text-secondary hover:text-primary"
          }`}
        >
          <Handshake size={18} />
          비즈니스 파트너 관리
        </button>
      </div>

      {activeTab === "channels" ? (
        <Card className="w-full">
          <div className="flex items-center justify-between border-b border-border-subtle px-6 py-5">
            <div>
              <h3 className="text-lg font-bold">쇼핑 채널 목록</h3>
              <p className="mt-1 text-sm text-secondary">
                {activeChannels.length}개의 활성 채널이 등록되어 있습니다.
              </p>
            </div>
            <Button variant="secondary">
              <Plus size={16} /> 채널 추가
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[600px]">
              <thead className="bg-surface-container text-xs font-bold uppercase tracking-wide text-secondary">
                <tr>
                  <th className="px-6 py-4 w-[80px]">순서</th>
                  <th className="px-4 py-4 w-[120px]">상태</th>
                  <th className="px-4 py-4">채널 이름 / ID</th>
                  <th className="px-4 py-4">에일리어스 (단축명)</th>
                  <th className="px-6 py-4 text-right w-[100px]">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                <tr className="bg-surface-container-low/50">
                  <td className="px-6 py-4 text-primary">
                    <PlusCircle size={18} />
                  </td>
                  <td className="px-4 py-4 text-sm font-bold">빠른 추가</td>
                  <td className="px-4 py-4">
                    <input className="w-full max-w-[240px] rounded border border-border px-3 py-1.5 text-sm bg-white focus:outline-none" placeholder="이름 입력..." />
                  </td>
                  <td className="px-4 py-4">
                    <input className="w-full max-w-[180px] rounded border border-border px-3 py-1.5 text-sm bg-white focus:outline-none" placeholder="에일리어스..." />
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Button className="h-9 px-3" variant="ghost">
                      추가
                    </Button>
                  </td>
                </tr>
                {channels.map((channel) => (
                  <tr className="transition hover:bg-surface-container-low" key={channel.id}>
                    <td className="px-6 py-5 text-secondary">
                      <GripVertical size={20} />
                    </td>
                    <td className="px-4 py-5">
                      <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-broadcast-blue">
                        <span className="h-2 w-2 rounded-full bg-current" />
                        {channel.isActive ? "READY" : "OFF"}
                      </span>
                    </td>
                    <td className="px-4 py-5">
                      <div className="font-bold">{channel.name}</div>
                      <div className="mt-1 text-xs text-secondary">ID: {channel.id}</div>
                    </td>
                    <td className="px-4 py-5 text-sm font-semibold italic text-primary">
                      {channel.alias ?? "-"}
                    </td>
                    <td className="px-6 py-5 text-right">
                      <button className="text-sm font-bold text-secondary hover:text-primary" type="button">
                        수정
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <Card className="w-full">
          <div className="flex items-center justify-between border-b border-border-subtle px-6 py-5">
            <div>
              <h3 className="text-lg font-bold">비즈니스 파트너 목록</h3>
              <p className="mt-1 text-sm text-secondary">일정 등록 및 제품 관리에 연결된 공급 업체 리스트입니다.</p>
            </div>
            <Button variant="secondary">
              <Plus size={16} /> 파트너 추가
            </Button>
          </div>

          <div className="divide-y divide-border-subtle">
            <div className="px-6 py-4 bg-surface-container-low/50 flex flex-wrap gap-4 items-center justify-between">
              <div className="flex-1 flex gap-3 min-w-[300px]">
                <input className="flex-1 rounded border border-border px-3 py-1.5 text-sm bg-white focus:outline-none" placeholder="업체 이름..." />
                <input className="w-[150px] rounded border border-border px-3 py-1.5 text-sm bg-white focus:outline-none" placeholder="담당자..." />
                <input className="w-[180px] rounded border border-border px-3 py-1.5 text-sm bg-white focus:outline-none" placeholder="연락처..." />
              </div>
              <Button className="h-9 px-4" variant="ghost">빠른 파트너 추가</Button>
            </div>
            
            {partners.map((partner) => (
              <div className="px-6 py-5 transition hover:bg-surface-container-low" key={partner.id}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-base font-bold text-text-heading">{partner.name}</p>
                    <p className="mt-1 text-sm text-secondary">
                      담당자: <span className="font-semibold text-text-heading">{partner.contactName ?? "미등록"}</span>
                      {partner.contactPhone && ` · 연락처: ${partner.contactPhone}`}
                    </p>
                  </div>
                  <span className="rounded-full bg-surface-container px-3 py-1 text-xs font-bold uppercase text-secondary border border-border-subtle">
                    {partner.type}
                  </span>
                </div>
                {partner.memo ? (
                  <p className="mt-3 rounded-lg bg-surface-container-low px-4 py-3 text-sm text-secondary leading-relaxed border border-border-subtle/50">
                    {partner.memo}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </Card>
      )}
    </>
  );
}

