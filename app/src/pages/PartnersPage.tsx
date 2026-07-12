import { useState, useEffect } from "react";
import { Store, Handshake, GripVertical } from "lucide-react";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { PageHeader } from "../components/ui/PageHeader";
import type { Channel, Partner } from "../types/domain";

interface PartnersPageProps {
  channels: Channel[];
  partners: Partner[];
  onCreateChannel: (name: string, alias?: string) => Promise<void>;
  onUpdateChannel: (id: string, updates: { name?: string; alias?: string; isActive?: boolean; displayOrder?: number }) => Promise<void>;
  onCreatePartner: (name: string, alias?: string) => Promise<void>;
  onUpdatePartner: (id: string, updates: { name?: string; alias?: string; isActive?: boolean; displayOrder?: number }) => Promise<void>;
  onDeleteChannel: (id: string) => Promise<{ message: string; softDeleted: boolean }>;
  onDeletePartner: (id: string) => Promise<{ message: string; softDeleted: boolean }>;
  onRestoreChannel: (id: string) => Promise<void>;
  onRestorePartner: (id: string) => Promise<void>;
}

export function PartnersPage({
  channels,
  partners,
  onCreateChannel,
  onUpdateChannel,
  onCreatePartner,
  onUpdatePartner,
  onDeleteChannel,
  onDeletePartner,
  onRestoreChannel,
  onRestorePartner,
}: PartnersPageProps) {
  const [activeTab, setActiveTab] = useState<"channels" | "partners">("channels");
  const [showTrash, setShowTrash] = useState(false);
  const activeChannels = channels.filter((channel) => channel.isActive && !channel.deletedAt);
  const activePartners = partners.filter((partner) => partner.isActive && !partner.deletedAt);

  // Channels drag and drop local state
  const [localChannels, setLocalChannels] = useState<Channel[]>([]);
  const [draggedChannelIndex, setDraggedChannelIndex] = useState<number | null>(null);

  // Sync channels with props
  useEffect(() => {
    const filtered = channels.filter((c) => (showTrash ? !!c.deletedAt : !c.deletedAt));
    const sorted = [...filtered].sort((a, b) => a.displayOrder - b.displayOrder);
    setLocalChannels(sorted);
  }, [channels, showTrash]);

  // Channels edit state
  const [newChannelName, setNewChannelName] = useState("");
  const [newChannelAlias, setNewChannelAlias] = useState("");
  const [editingChannelId, setEditingChannelId] = useState<string | null>(null);
  const [editingChannelName, setEditingChannelName] = useState("");
  const [editingChannelAlias, setEditingChannelAlias] = useState("");
  const [isSubmittingChannel, setIsSubmittingChannel] = useState(false);

  // Partners drag and drop local state
  const [localPartners, setLocalPartners] = useState<Partner[]>([]);
  const [draggedPartnerIndex, setDraggedPartnerIndex] = useState<number | null>(null);

  // Sorting state for partners
  const [partnerSortBy, setPartnerSortBy] = useState<"custom" | "name" | "alias">("custom");
  const [partnerSortOrder, setPartnerSortOrder] = useState<"asc" | "desc">("asc");

  // Sync partners with props & sort settings
  useEffect(() => {
    const filtered = partners.filter((p) => (showTrash ? !!p.deletedAt : !p.deletedAt));
    const sorted = [...filtered];
    if (partnerSortBy === "custom") {
      sorted.sort((a, b) => a.displayOrder - b.displayOrder);
    } else {
      sorted.sort((a, b) => {
        const valA = (partnerSortBy === "name" ? a.name : a.contactName || "").trim().toLowerCase();
        const valB = (partnerSortBy === "name" ? b.name : b.contactName || "").trim().toLowerCase();
        if (valA < valB) return partnerSortOrder === "asc" ? -1 : 1;
        if (valA > valB) return partnerSortOrder === "asc" ? 1 : -1;
        return 0;
      });
    }
    setLocalPartners(sorted);
  }, [partners, partnerSortBy, partnerSortOrder, showTrash]);

  // Partners edit state
  const [newPartnerName, setNewPartnerName] = useState("");
  const [newPartnerAlias, setNewPartnerAlias] = useState("");
  const [editingPartnerId, setEditingPartnerId] = useState<string | null>(null);
  const [editingPartnerName, setEditingPartnerName] = useState("");
  const [editingPartnerAlias, setEditingPartnerAlias] = useState("");
  const [isSubmittingPartner, setIsSubmittingPartner] = useState(false);

  // HTML5 Drag and Drop handlers for channels
  function handleChannelDragStart(e: React.DragEvent, index: number) {
    setDraggedChannelIndex(index);
    e.dataTransfer.effectAllowed = "move";
  }

  function handleChannelDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    if (draggedChannelIndex === null || draggedChannelIndex === index) return;

    const list = [...localChannels];
    const draggedItem = list[draggedChannelIndex];
    list.splice(draggedChannelIndex, 1);
    list.splice(index, 0, draggedItem);
    
    setDraggedChannelIndex(index);
    setLocalChannels(list);
  }

  async function handleChannelDragEnd() {
    if (draggedChannelIndex === null) return;
    setDraggedChannelIndex(null);

    // Save orders sequentially to server
    for (let i = 0; i < localChannels.length; i++) {
      const channel = localChannels[i];
      const nextOrder = i + 1;
      if (channel.displayOrder !== nextOrder) {
        await onUpdateChannel(channel.id, { displayOrder: nextOrder });
      }
    }
  }

  // HTML5 Drag and Drop handlers for partners
  function handlePartnerDragStart(e: React.DragEvent, index: number) {
    if (partnerSortBy !== "custom") {
      setPartnerSortBy("custom");
      setPartnerSortOrder("asc");
    }
    setDraggedPartnerIndex(index);
    e.dataTransfer.effectAllowed = "move";
  }

  function handlePartnerDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    if (draggedPartnerIndex === null || draggedPartnerIndex === index) return;

    const list = [...localPartners];
    const draggedItem = list[draggedPartnerIndex];
    list.splice(draggedPartnerIndex, 1);
    list.splice(index, 0, draggedItem);

    setDraggedPartnerIndex(index);
    setLocalPartners(list);
  }

  async function handlePartnerDragEnd() {
    if (draggedPartnerIndex === null) return;
    setDraggedPartnerIndex(null);

    // Save orders sequentially to server
    for (let i = 0; i < localPartners.length; i++) {
      const partner = localPartners[i];
      const nextOrder = i + 1;
      if (partner.displayOrder !== nextOrder) {
        await onUpdatePartner(partner.id, { displayOrder: nextOrder });
      }
    }
  }

  // Create Channel click
  async function handleCreateChannelClick() {
    if (!newChannelName.trim()) return;
    setIsSubmittingChannel(true);
    try {
      await onCreateChannel(newChannelName.trim(), newChannelAlias.trim() || undefined);
      setNewChannelName("");
      setNewChannelAlias("");
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmittingChannel(false);
    }
  }

  // Save Channel Edit
  async function handleSaveChannelEdit(id: string) {
    if (!editingChannelName.trim()) return;
    try {
      await onUpdateChannel(id, {
        name: editingChannelName.trim(),
        alias: editingChannelAlias.trim() || undefined,
      });
      setEditingChannelId(null);
    } catch (e) {
      console.error(e);
    }
  }

  // Create Partner click
  async function handleCreatePartnerClick() {
    if (!newPartnerName.trim()) return;
    setIsSubmittingPartner(true);
    try {
      await onCreatePartner(newPartnerName.trim(), newPartnerAlias.trim() || undefined);
      setNewPartnerName("");
      setNewPartnerAlias("");
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmittingPartner(false);
    }
  }

  // Save Partner Edit
  async function handleSavePartnerEdit(id: string) {
    if (!editingPartnerName.trim()) return;
    try {
      await onUpdatePartner(id, {
        name: editingPartnerName.trim(),
        alias: editingPartnerAlias.trim() || undefined,
      });
      setEditingPartnerId(null);
    } catch (e) {
      console.error(e);
    }
  }

  async function handleDeleteChannelClick(id: string, name: string) {
    if (!window.confirm(`'${name}' 채널을 삭제하시겠습니까?\n\n이미 일정에 사용 중인 채널은 숨김(Soft Delete) 처리됩니다.`)) return;
    try {
      const res = await onDeleteChannel(id);
      alert(res.message);
    } catch (e) {
      alert(e instanceof Error ? e.message : "삭제 중 오류가 발생했습니다.");
    }
  }

  async function handleDeletePartnerClick(id: string, name: string) {
    if (!window.confirm(`'${name}' 파트너를 삭제하시겠습니까?\n\n이미 일정/상품에 사용 중인 파트너는 숨김(Soft Delete) 처리됩니다.`)) return;
    try {
      const res = await onDeletePartner(id);
      alert(res.message);
    } catch (e) {
      alert(e instanceof Error ? e.message : "삭제 중 오류가 발생했습니다.");
    }
  }

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

        <div className="ml-auto flex items-center">
          <label className="flex items-center gap-2 cursor-pointer text-sm font-bold text-secondary hover:text-primary transition">
            <input
              type="checkbox"
              checked={showTrash}
              onChange={(e) => setShowTrash(e.target.checked)}
              className="rounded text-primary border-border focus:ring-primary w-4 h-4"
            />
            휴지통 보기
          </label>
        </div>
      </div>

      {activeTab === "channels" ? (
        <Card className="w-full">
          <div className="flex items-center justify-between border-b border-border-subtle px-6 py-5">
            <div>
              <h3 className="text-lg font-bold">쇼핑 채널 목록</h3>
              <p className="mt-1 text-sm text-secondary">
                {activeChannels.length}개의 활성 채널이 등록되어 있습니다. (행을 드래그하여 순서를 변경할 수 있습니다.)
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[600px]">
              <thead className="bg-surface-container text-xs font-bold uppercase tracking-wide text-secondary">
                <tr>
                  <th className="px-6 py-4 w-[80px]">순서</th>
                  <th className="px-4 py-4 w-[100px]">상태</th>
                  <th className="px-4 py-4">채널 이름</th>
                  <th className="px-4 py-4">에일리어스 (단축명)</th>
                  <th className="px-6 py-4 text-right w-[150px]">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {/* 빠른 추가 행 */}
                <tr className="bg-surface-container-low/50">
                  <td className="px-6 py-4 text-secondary/40">
                    <GripVertical size={20} className="opacity-30" />
                  </td>
                  <td className="px-4 py-4">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-bold text-broadcast-blue">
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                      NEW
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <input
                      className="w-full max-w-[240px] rounded border border-border px-3 py-1.5 text-sm bg-white focus:outline-none"
                      onChange={(e) => setNewChannelName(e.target.value)}
                      placeholder="채널 이름 입력..."
                      value={newChannelName}
                    />
                  </td>
                  <td className="px-4 py-4">
                    <input
                      className="w-full max-w-[180px] rounded border border-border px-3 py-1.5 text-sm bg-white focus:outline-none"
                      onChange={(e) => setNewChannelAlias(e.target.value)}
                      placeholder="에일리어스..."
                      value={newChannelAlias}
                    />
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end min-w-[120px] whitespace-nowrap">
                      <Button
                        className="h-8 px-3 text-xs whitespace-nowrap"
                        disabled={isSubmittingChannel || !newChannelName.trim()}
                        onClick={handleCreateChannelClick}
                        variant="secondary"
                      >
                        추가
                      </Button>
                    </div>
                  </td>
                </tr>

                {localChannels.map((channel, index) => {
                  const isEditing = editingChannelId === channel.id;
                  return (
                    <tr
                      draggable={!isEditing}
                      onDragStart={(e) => handleChannelDragStart(e, index)}
                      onDragOver={(e) => handleChannelDragOver(e, index)}
                      onDragEnd={handleChannelDragEnd}
                      className={`transition ${
                        draggedChannelIndex === index
                          ? "opacity-40 bg-surface-container-low"
                          : "hover:bg-surface-container-low"
                      }`}
                      key={channel.id}
                    >
                      <td className="px-6 py-5">
                        <GripVertical
                          size={20}
                          className="cursor-grab active:cursor-grabbing text-secondary hover:text-primary transition"
                        />
                      </td>
                      <td className="px-4 py-5">
                        <button
                          onClick={() => onUpdateChannel(channel.id, { isActive: !channel.isActive })}
                          className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-bold transition hover:opacity-80 ${
                            channel.isActive
                              ? "bg-green-50 text-emerald-600"
                              : "bg-gray-100 text-secondary"
                          }`}
                          type="button"
                        >
                          <span className={`h-2 w-2 rounded-full ${channel.isActive ? "bg-emerald-500" : "bg-gray-400"}`} />
                          {channel.isActive ? "ON" : "OFF"}
                        </button>
                      </td>
                      <td className="px-4 py-5">
                        {isEditing ? (
                          <input
                            className="w-full max-w-[240px] rounded border border-border px-3 py-1.5 text-sm bg-white focus:outline-none"
                            onChange={(e) => setEditingChannelName(e.target.value)}
                            value={editingChannelName}
                          />
                        ) : (
                          <div className="font-bold">{channel.name}</div>
                        )}
                      </td>
                      <td className="px-4 py-5 text-sm font-semibold italic text-primary">
                        {isEditing ? (
                          <input
                            className="w-full max-w-[180px] rounded border border-border px-3 py-1.5 text-sm bg-white focus:outline-none"
                            onChange={(e) => setEditingChannelAlias(e.target.value)}
                            value={editingChannelAlias}
                          />
                        ) : (
                          channel.alias ?? "-"
                        )}
                      </td>
                      <td className="px-6 py-5 text-right">
                        {isEditing ? (
                          <div className="flex justify-end gap-2 min-w-[120px] whitespace-nowrap">
                            <Button
                              className="h-8 px-3 text-xs whitespace-nowrap font-bold"
                              disabled={!editingChannelName.trim()}
                              onClick={() => handleSaveChannelEdit(channel.id)}
                              variant="primary"
                            >
                              저장
                            </Button>
                            <Button
                              className="h-8 px-3 text-xs whitespace-nowrap"
                              onClick={() => setEditingChannelId(null)}
                              variant="secondary"
                            >
                              취소
                            </Button>
                          </div>
                        ) : (
                          <div className="flex justify-end gap-2 min-w-[120px] whitespace-nowrap">
                            {showTrash ? (
                              <Button
                                className="h-8 px-3 text-xs whitespace-nowrap hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200"
                                onClick={() => onRestoreChannel(channel.id)}
                                variant="secondary"
                              >
                                복구
                              </Button>
                            ) : (
                              <Button
                                className="h-8 px-3 text-xs whitespace-nowrap hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                                onClick={() => handleDeleteChannelClick(channel.id, channel.name)}
                                variant="secondary"
                              >
                                삭제
                              </Button>
                            )}
                            <Button
                              className="h-8 px-3 text-xs whitespace-nowrap"
                              onClick={() => {
                                setEditingChannelId(channel.id);
                                setEditingChannelName(channel.name);
                                setEditingChannelAlias(channel.alias || "");
                              }}
                              variant="secondary"
                            >
                              수정
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <Card className="w-full">
          <div className="flex items-center justify-between border-b border-border-subtle px-6 py-5">
            <div>
              <h3 className="text-lg font-bold">비즈니스 파트너 목록</h3>
              <p className="mt-1 text-sm text-secondary">
                {activePartners.length}개의 활성 파트너가 등록되어 있습니다. (행을 드래그하여 순서를 변경하거나 정렬할 수 있습니다.)
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-secondary">정렬:</span>
              <select
                className="rounded border border-border px-3 py-1 text-sm bg-white focus:outline-none"
                onChange={(e) => {
                  if (e.target.value === "custom") {
                    setPartnerSortBy("custom");
                  } else {
                    const [by, order] = e.target.value.split("-") as ["name" | "alias", "asc" | "desc"];
                    setPartnerSortBy(by);
                    setPartnerSortOrder(order);
                  }
                }}
                value={partnerSortBy === "custom" ? "custom" : `${partnerSortBy}-${partnerSortOrder}`}
              >
                <option value="custom">사용자 순서 (드래그 순)</option>
                <option value="name-asc">이름 오름차순</option>
                <option value="name-desc">이름 내림차순</option>
                <option value="alias-asc">약칭 오름차순</option>
                <option value="alias-desc">약칭 내림차순</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[600px]">
              <thead className="bg-surface-container text-xs font-bold uppercase tracking-wide text-secondary">
                <tr>
                  <th className="px-6 py-4 w-[80px]">순서</th>
                  <th className="px-4 py-4 w-[100px]">상태</th>
                  <th className="px-4 py-4">파트너 이름</th>
                  <th className="px-4 py-4">약칭 (에일리어스)</th>
                  <th className="px-6 py-4 text-right w-[150px]">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {/* 빠른 추가 행 */}
                <tr className="bg-surface-container-low/50">
                  <td className="px-6 py-4 text-secondary/40">
                    <GripVertical size={20} className="opacity-30" />
                  </td>
                  <td className="px-4 py-4">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-bold text-broadcast-blue">
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                      NEW
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <input
                      className="w-full max-w-[280px] rounded border border-border px-3 py-1.5 text-sm bg-white focus:outline-none"
                      onChange={(e) => setNewPartnerName(e.target.value)}
                      placeholder="업체 이름 입력..."
                      value={newPartnerName}
                    />
                  </td>
                  <td className="px-4 py-4">
                    <input
                      className="w-full max-w-[180px] rounded border border-border px-3 py-1.5 text-sm bg-white focus:outline-none"
                      onChange={(e) => setNewPartnerAlias(e.target.value)}
                      placeholder="약칭 입력..."
                      value={newPartnerAlias}
                    />
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end min-w-[120px] whitespace-nowrap">
                      <Button
                        className="h-8 px-3 text-xs whitespace-nowrap"
                        disabled={isSubmittingPartner || !newPartnerName.trim()}
                        onClick={handleCreatePartnerClick}
                        variant="secondary"
                      >
                        추가
                      </Button>
                    </div>
                  </td>
                </tr>

                {localPartners.map((partner, index) => {
                  const isEditing = editingPartnerId === partner.id;
                  return (
                    <tr
                      draggable={!isEditing}
                      onDragStart={(e) => handlePartnerDragStart(e, index)}
                      onDragOver={(e) => handlePartnerDragOver(e, index)}
                      onDragEnd={handlePartnerDragEnd}
                      className={`transition ${
                        draggedPartnerIndex === index
                          ? "opacity-40 bg-surface-container-low"
                          : "hover:bg-surface-container-low"
                      }`}
                      key={partner.id}
                    >
                      <td className="px-6 py-5">
                        <GripVertical
                          size={20}
                          className="cursor-grab active:cursor-grabbing text-secondary hover:text-primary transition"
                        />
                      </td>
                      <td className="px-4 py-5">
                        <button
                          onClick={() => onUpdatePartner(partner.id, { isActive: !partner.isActive })}
                          className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-bold transition hover:opacity-80 ${
                            partner.isActive
                              ? "bg-green-50 text-emerald-600"
                              : "bg-gray-100 text-secondary"
                          }`}
                          type="button"
                        >
                          <span className={`h-2 w-2 rounded-full ${partner.isActive ? "bg-emerald-500" : "bg-gray-400"}`} />
                          {partner.isActive ? "ON" : "OFF"}
                        </button>
                      </td>
                      <td className="px-6 py-5">
                        {isEditing ? (
                          <input
                            className="w-full max-w-[280px] rounded border border-border px-3 py-1.5 text-sm bg-white focus:outline-none"
                            onChange={(e) => setEditingPartnerName(e.target.value)}
                            value={editingPartnerName}
                          />
                        ) : (
                          <div className="font-bold text-text-heading">{partner.name}</div>
                        )}
                      </td>
                      <td className="px-4 py-5 text-sm font-semibold italic text-primary">
                        {isEditing ? (
                          <input
                            className="w-full max-w-[180px] rounded border border-border px-3 py-1.5 text-sm bg-white focus:outline-none"
                            onChange={(e) => setEditingPartnerAlias(e.target.value)}
                            value={editingPartnerAlias}
                          />
                        ) : (
                          partner.contactName ?? "-"
                        )}
                      </td>
                      <td className="px-6 py-5 text-right">
                        {isEditing ? (
                          <div className="flex justify-end gap-2 min-w-[120px] whitespace-nowrap">
                            <Button
                              className="h-8 px-3 text-xs whitespace-nowrap font-bold"
                              disabled={!editingPartnerName.trim()}
                              onClick={() => handleSavePartnerEdit(partner.id)}
                              variant="primary"
                            >
                              저장
                            </Button>
                            <Button
                              className="h-8 px-3 text-xs whitespace-nowrap"
                              onClick={() => setEditingPartnerId(null)}
                              variant="secondary"
                            >
                              취소
                            </Button>
                          </div>
                        ) : (
                          <div className="flex justify-end gap-2 min-w-[120px] whitespace-nowrap">
                            {showTrash ? (
                              <Button
                                className="h-8 px-3 text-xs whitespace-nowrap hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200"
                                onClick={() => onRestorePartner(partner.id)}
                                variant="secondary"
                              >
                                복구
                              </Button>
                            ) : (
                              <Button
                                className="h-8 px-3 text-xs whitespace-nowrap hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                                onClick={() => handleDeletePartnerClick(partner.id, partner.name)}
                                variant="secondary"
                              >
                                삭제
                              </Button>
                            )}
                            <Button
                              className="h-8 px-3 text-xs whitespace-nowrap"
                              onClick={() => {
                                setEditingPartnerId(partner.id);
                                setEditingPartnerName(partner.name);
                                setEditingPartnerAlias(partner.contactName || "");
                              }}
                              variant="secondary"
                            >
                              수정
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </>
  );
}
