import { useState, useEffect } from "react";
import { CalendarCheck, CloudOff, FileSpreadsheet, KeyRound, RefreshCw, CheckCircle2, AlertCircle, Plus, Folder, ChevronRight, ArrowLeft, ChevronDown, User as UserIcon, UploadCloud, FileText } from "lucide-react";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { PageHeader } from "../components/ui/PageHeader";
import { formatDateTime } from "../lib/format";
import type { SyncLog, User } from "../types/domain";
import {
  getGoogleSheets,
  getGoogleCalendars,
  createGoogleSheet,
  createGoogleCalendar
} from "../lib/api";
import { MigrationModal } from "../components/migration/MigrationModal";

interface AccountStatusPageProps {
  onGoogleLogin: () => void;
  onLogout: () => Promise<void>;
  onSaveSettings: (spreadsheetId: string | null, calendarId: string | null, shipmentCalendarId: string | null) => Promise<void>;
  syncLogs: SyncLog[];
  user: User | null;
  channels: any[];
  partners: any[];
  refreshData: () => void;
}

export function AccountStatusPage({
  onGoogleLogin,
  onLogout,
  onSaveSettings,
  syncLogs,
  user,
  channels,
  partners,
  refreshData,
}: AccountStatusPageProps) {
  const isGoogleConnected = !!user?.googleEmail;

  const [sheets, setSheets] = useState<{ id: string; name: string }[]>([]);
  const [calendars, setCalendars] = useState<{ id: string; summary: string; backgroundColor?: string }[]>([]);

  const [selectedSheetId, setSelectedSheetId] = useState<string>("");
  const [selectedCalendarId, setSelectedCalendarId] = useState<string>("");
  const [selectedShipmentCalendarId, setSelectedShipmentCalendarId] = useState<string>("");

  const [isCalendarsLoading, setIsCalendarsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");

  const [showDriveExplorer, setShowDriveExplorer] = useState(false);
  const [driveHistory, setDriveHistory] = useState<{ id: string; name: string }[]>([
    { id: "root", name: "내 드라이브" }
  ]);
  const [driveItems, setDriveItems] = useState<{ id: string; name: string; mimeType: string }[]>([]);
  const [isDriveLoading, setIsDriveLoading] = useState(false);
  const [tempSelectedSheet, setTempSelectedSheet] = useState<{ id: string; name: string } | null>(null);

  const [showCalendarDropdown, setShowCalendarDropdown] = useState(false);
  const [showShipmentCalendarDropdown, setShowShipmentCalendarDropdown] = useState(false);

  const [showSheetModal, setShowSheetModal] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [newSheetTitle, setNewSheetTitle] = useState("");
  const [newCalendarTitle, setNewCalendarTitle] = useState("");
  const [isCreatingSheet, setIsCreatingSheet] = useState(false);
  const [isCreatingCalendar, setIsCreatingCalendar] = useState(false);
  const [creatingCalendarType, setCreatingCalendarType] = useState<"broadcast" | "shipment">("broadcast");
  const [showMigrationModal, setShowMigrationModal] = useState(false);

  const currentFolder = driveHistory[driveHistory.length - 1];

  useEffect(() => {
    if (isGoogleConnected) {
      void loadInitialData();
    }
  }, [isGoogleConnected]);

  useEffect(() => {
    if (user) {
      setSelectedSheetId(user.spreadsheetId || "");
      setSelectedCalendarId(user.calendarId || "");
      setSelectedShipmentCalendarId(user.shipmentCalendarId || "");
    }
  }, [user]);

  useEffect(() => {
    if (showDriveExplorer && isGoogleConnected) {
      void loadDriveItems(currentFolder.id);
    }
  }, [showDriveExplorer, driveHistory]);

  async function loadInitialData() {
    setIsCalendarsLoading(true);
    try {
      const [sheetList, calList] = await Promise.all([
        getGoogleSheets("root"),
        getGoogleCalendars(),
      ]);
      setSheets(sheetList.filter(s => s.mimeType !== "application/vnd.google-apps.folder"));
      setCalendars(calList);
    } catch (e) {
      console.error("초기 데이터 로드 실패:", e);
    } finally {
      setIsCalendarsLoading(false);
    }
  }

  async function loadDriveItems(folderId: string) {
    setIsDriveLoading(true);
    try {
      const items = await getGoogleSheets(folderId);
      const sorted = [...items].sort((a, b) => {
        const aIsFolder = a.mimeType === "application/vnd.google-apps.folder";
        const bIsFolder = b.mimeType === "application/vnd.google-apps.folder";
        if (aIsFolder && !bIsFolder) return -1;
        if (!aIsFolder && bIsFolder) return 1;
        return a.name.localeCompare(b.name, "ko");
      });
      setDriveItems(sorted);
    } catch (e) {
      console.error("드라이브 로드 실패:", e);
    } finally {
      setIsDriveLoading(false);
    }
  }

  function handleNavigateFolder(folder: { id: string; name: string }) {
    setDriveHistory((prev) => [...prev, folder]);
    setTempSelectedSheet(null);
  }

  function handleNavigateBack() {
    if (driveHistory.length > 1) {
      setDriveHistory((prev) => prev.slice(0, -1));
      setTempSelectedSheet(null);
    }
  }

  function handleNavigateToHistory(index: number) {
    setDriveHistory((prev) => prev.slice(0, index + 1));
    setTempSelectedSheet(null);
  }

  function handleSelectSheetItem(item: { id: string; name: string }) {
    setTempSelectedSheet(item);
  }

  async function handleSaveSettings() {
    setIsSaving(true);
    setSaveStatus("idle");
    try {
      await onSaveSettings(
        selectedSheetId || null,
        selectedCalendarId || null,
        selectedShipmentCalendarId || null
      );
      setSaveStatus("success");
      setTimeout(() => setSaveStatus("idle"), 3000);
    } catch (e) {
      console.error(e);
      setSaveStatus("error");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleCreateSheet() {
    if (!newSheetTitle.trim()) return;
    setIsCreatingSheet(true);
    try {
      const res = await createGoogleSheet(newSheetTitle.trim());
      setSheets((prev) => [{ id: res.spreadsheetId, name: newSheetTitle.trim() }, ...prev]);
      setSelectedSheetId(res.spreadsheetId);
      setShowSheetModal(false);
      setNewSheetTitle("");
    } catch (e) {
      alert(e instanceof Error ? e.message : "스프레드시트 생성에 실패했습니다.");
    } finally {
      setIsCreatingSheet(false);
    }
  }

  async function handleCreateCalendar() {
    if (!newCalendarTitle.trim()) return;
    setIsCreatingCalendar(true);
    try {
      const res = await createGoogleCalendar(newCalendarTitle.trim());
      setCalendars((prev) => [{ id: res.calendarId, summary: newCalendarTitle.trim(), backgroundColor: "#4285F4" }, ...prev]);
      if (creatingCalendarType === "broadcast") {
        setSelectedCalendarId(res.calendarId);
      } else {
        setSelectedShipmentCalendarId(res.calendarId);
      }
      setShowCalendarModal(false);
      setNewCalendarTitle("");
    } catch (e) {
      alert(e instanceof Error ? e.message : "캘린더 생성에 실패했습니다.");
    } finally {
      setIsCreatingCalendar(false);
    }
  }

  function handleConfirmSheetSelection() {
    if (tempSelectedSheet) {
      setSelectedSheetId(tempSelectedSheet.id);
      const exists = sheets.some((s) => s.id === tempSelectedSheet.id);
      if (!exists) {
        setSheets((prev) => [tempSelectedSheet, ...prev]);
      }
      setShowDriveExplorer(false);
    }
  }

  const selectedSheetName = sheets.find(s => s.id === selectedSheetId)?.name || selectedSheetId || "동기화하지 않음";

  return (
    <>
      {/* Page Header */}
      <div className="font-body-md text-body-md text-on-surface">
        <div className="mb-8">
          <h2 className="font-display-lg text-display-lg text-on-surface mb-2">계정 상태 관리</h2>
          <p className="text-secondary font-body-md">Google 서비스 연동 및 방송 자동화 데이터를 관리합니다.</p>
        </div>

        <div className="space-y-gutter">
          {/* SECTION 1: Google Account Connection (Compressed) */}
          <section className="bg-white border border-border-subtle rounded-lg shadow-sm">
            <div className="p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-tertiary/10 rounded-full flex items-center justify-center text-tertiary">
                    <span className="material-symbols-outlined">account_circle</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-title-sm text-on-surface">{user?.googleEmail || "연결되지 않음"}</span>
                      {isGoogleConnected ? (
                        <span className="px-2 py-0.5 bg-tertiary/10 text-tertiary text-[10px] font-bold rounded uppercase flex items-center gap-1">
                          <span className="w-1.5 h-1.5 bg-tertiary rounded-full"></span>
                          Connected
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-error/10 text-error text-[10px] font-bold rounded uppercase flex items-center gap-1">
                          <span className="w-1.5 h-1.5 bg-error rounded-full"></span>
                          Disconnected
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-secondary mt-0.5">
                      {isGoogleConnected
                        ? "Google Drive, Sheets, Calendar 연동이 활성화되어 있습니다."
                        : "구글 계정을 연결하여 자동 동기화 대상을 설정할 수 있습니다."}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {isGoogleConnected ? (
                    <>
                      <button onClick={onLogout} className="px-4 py-2 border border-border-subtle text-secondary text-body-sm font-medium rounded hover:bg-surface-container-low transition-colors">로그아웃</button>
                      <button disabled={isSaving} onClick={handleSaveSettings} className="px-4 py-2 bg-primary-container text-white text-body-sm font-bold rounded hover:opacity-90 transition-opacity">
                        {isSaving ? "저장 중..." : "연동 설정 저장"}
                      </button>
                      {saveStatus === "success" && <span className="text-tertiary text-sm">✓</span>}
                    </>
                  ) : (
                    <button onClick={onGoogleLogin} className="px-4 py-2 bg-primary-container text-white text-body-sm font-bold rounded hover:opacity-90 transition-opacity">
                      Google 계정으로 연결하기
                    </button>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* SECTION 2: Connection Settings (Cards Grid) */}
          {isGoogleConnected && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter">
              {/* Google Sheets Card */}
              <div className="bg-white border border-border-subtle rounded-lg shadow-sm flex flex-col">
                <div className="p-6 border-b border-border-subtle flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-50 rounded flex items-center justify-center">
                      <span className="material-symbols-outlined text-green-600">description</span>
                    </div>
                    <div>
                      <h3 className="font-title-sm text-title-sm text-on-surface">Google Sheets 연결</h3>
                      <p className="text-xs text-secondary">방송 송출 로그 및 자산 리스트 저장소</p>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase ${selectedSheetId ? "bg-tertiary/10 text-tertiary" : "bg-surface-container text-secondary"}`}>
                    {selectedSheetId ? "Active" : "Inactive"}
                  </span>
                </div>
                <div className="p-6 flex-1 space-y-4">
                  <div className="p-4 border border-border-subtle rounded-lg bg-surface-container-low flex items-center justify-between">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <span className="material-symbols-outlined text-green-600 shrink-0">description</span>
                      <div className="truncate">
                        <div className="text-body-sm font-bold text-on-surface truncate">{selectedSheetName}</div>
                        <div className="text-[10px] text-secondary truncate">ID: {selectedSheetId || "설정 안 됨"}</div>
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => setShowDriveExplorer(true)} className="px-3 py-1.5 border border-border-subtle rounded text-[11px] font-medium hover:bg-white transition-colors">드라이브 탐색</button>
                      <button onClick={() => setShowSheetModal(true)} className="px-3 py-1.5 border border-border-subtle rounded text-[11px] font-medium hover:bg-white transition-colors">새로 만들기</button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Google Calendar Card */}
              <div className="bg-white border border-border-subtle rounded-lg shadow-sm flex flex-col">
                <div className="p-6 border-b border-border-subtle flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-50 rounded flex items-center justify-center">
                      <span className="material-symbols-outlined text-broadcast-blue">calendar_month</span>
                    </div>
                    <div>
                      <h3 className="font-title-sm text-title-sm text-on-surface">Google Calendar 연결</h3>
                      <p className="text-xs text-secondary">방송 편성 및 예약 자동 등록</p>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase ${(selectedCalendarId || selectedShipmentCalendarId) ? "bg-tertiary/10 text-tertiary" : "bg-surface-container text-secondary"}`}>
                    {(selectedCalendarId || selectedShipmentCalendarId) ? "Active" : "Inactive"}
                  </span>
                </div>
                <div className="p-6 flex-1 space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="font-label-caps text-secondary text-[10px] uppercase">방송일정 캘린더 연동</label>
                      <button onClick={() => { setCreatingCalendarType("broadcast"); setShowCalendarModal(true); }} className="text-primary text-[10px] font-bold hover:underline">+ 새로 만들기</button>
                    </div>
                    <div className="flex gap-2">
                      <select 
                        value={selectedCalendarId}
                        onChange={(e) => setSelectedCalendarId(e.target.value)}
                        className="flex-1 border-border-subtle rounded bg-white px-3 py-2 text-body-sm focus:border-primary-container focus:ring-0"
                      >
                        <option value="">동기화하지 않음</option>
                        {calendars.map(cal => (
                          <option key={cal.id} value={cal.id}>{cal.summary}</option>
                        ))}
                      </select>
                      <button onClick={loadInitialData} disabled={isCalendarsLoading} className="p-2 border border-border-subtle rounded hover:bg-surface-container-low flex items-center justify-center">
                        <span className={`material-symbols-outlined text-[20px] ${isCalendarsLoading ? "animate-spin" : ""}`}>sync</span>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="font-label-caps text-secondary text-[10px] uppercase">출고일정 캘린더 연동</label>
                      <button onClick={() => { setCreatingCalendarType("shipment"); setShowCalendarModal(true); }} className="text-primary text-[10px] font-bold hover:underline">+ 새로 만들기</button>
                    </div>
                    <div className="flex gap-2">
                      <select 
                        value={selectedShipmentCalendarId}
                        onChange={(e) => setSelectedShipmentCalendarId(e.target.value)}
                        className="flex-1 border-border-subtle rounded bg-white px-3 py-2 text-body-sm focus:border-primary-container focus:ring-0"
                      >
                        <option value="">동기화하지 않음</option>
                        {calendars.map(cal => (
                          <option key={cal.id} value={cal.id}>{cal.summary}</option>
                        ))}
                      </select>
                      <button onClick={loadInitialData} disabled={isCalendarsLoading} className="p-2 border border-border-subtle rounded hover:bg-surface-container-low flex items-center justify-center">
                        <span className={`material-symbols-outlined text-[20px] ${isCalendarsLoading ? "animate-spin" : ""}`}>sync</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 3: Data Migration (CSV) - Moved up */}
          <section className="bg-white border border-border-subtle rounded-lg shadow-sm">
            <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="font-title-sm text-on-surface">기존 데이터 마이그레이션</h3>
                <p className="text-xs text-secondary mt-0.5">이전 시스템의 구글 시트를 CSV로 다운받아 일괄 등록합니다.</p>
              </div>
              <button onClick={() => setShowMigrationModal(true)} className="px-6 py-2.5 bg-primary-container text-white text-body-sm font-bold rounded shadow-sm hover:opacity-90 transition-opacity flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">upload_file</span>
                CSV 업로드하기
              </button>
            </div>
          </section>

          {/* SECTION 4: Synchronization History */}
          <section className="bg-white border border-border-subtle rounded-lg shadow-sm">
            <div className="px-6 py-4 border-b border-border-subtle flex justify-between items-center">
              <h3 className="font-title-sm text-on-surface">동기화 이력</h3>
              <button onClick={refreshData} className="text-primary text-[11px] font-bold flex items-center gap-1 hover:underline">
                <span className="material-symbols-outlined text-[16px]">refresh</span>
                새로고침
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-surface-container-low">
                  <tr>
                    <th className="px-6 py-3 font-label-caps text-secondary text-[10px] uppercase border-b border-border-subtle">Type</th>
                    <th className="px-6 py-3 font-label-caps text-secondary text-[10px] uppercase border-b border-border-subtle">Activity</th>
                    <th className="px-6 py-3 font-label-caps text-secondary text-[10px] uppercase border-b border-border-subtle">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {syncLogs.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-6 py-8 text-center text-body-sm text-secondary">
                        동기화 이력이 없습니다.
                      </td>
                    </tr>
                  ) : (
                    syncLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-surface-container-lowest transition-colors">
                        <td className="px-6 py-4 font-data-tabular text-body-sm text-secondary">
                          {log.target === "sheets" ? "Sheets" : "Calendar"}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-body-sm font-bold text-on-surface">{log.message}</div>
                          <div className="text-[10px] text-secondary mt-0.5">{formatDateTime(log.createdAt)}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`text-[10px] font-bold uppercase ${log.status === "success" ? "text-tertiary" : "text-error"}`}>
                            {log.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="p-4 border-t border-border-subtle bg-surface-container-low/50 text-center">
              <button className="text-secondary font-title-sm text-body-sm hover:text-on-surface transition-colors flex items-center justify-center gap-2 mx-auto">
                더 보기
                <span className="material-symbols-outlined text-[18px]">expand_more</span>
              </button>
            </div>
          </section>
        </div>
      </div>

      {showDriveExplorer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between border-b border-border-subtle pb-4">
              <div>
                <h3 className="text-lg font-bold text-primary flex items-center gap-2">
                  <FileSpreadsheet className="text-tertiary" size={22} />
                  Google Drive 시트 탐색기
                </h3>
                <p className="mt-1 text-sm text-secondary">연동할 Google 스프레드시트 파일을 선택하세요.</p>
              </div>
              <button 
                className="text-secondary hover:text-primary text-xl font-bold"
                onClick={() => setShowDriveExplorer(false)}
              >
                &times;
              </button>
            </div>

            <div className="mt-4 flex items-center gap-2 overflow-x-auto bg-surface-container-low p-3 rounded-lg text-sm font-semibold">
              <button
                disabled={driveHistory.length <= 1}
                onClick={handleNavigateBack}
                className="mr-2 text-secondary hover:text-primary disabled:opacity-40 flex items-center gap-1"
              >
                <ArrowLeft size={16} /> 뒤로
              </button>
              
              {driveHistory.map((item, idx) => (
                <div key={item.id} className="flex items-center gap-1.5 shrink-0">
                  {idx > 0 && <ChevronRight className="text-secondary" size={14} />}
                  <button
                    onClick={() => handleNavigateToHistory(idx)}
                    className={`${idx === driveHistory.length - 1 ? "text-primary cursor-default" : "text-secondary hover:text-primary"}`}
                  >
                    {item.name}
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-4 flex-1 overflow-y-auto min-h-[300px] border border-border rounded-lg divide-y divide-border-subtle">
              {isDriveLoading ? (
                <div className="flex h-full min-h-[300px] flex-col items-center justify-center gap-2 text-secondary">
                  <RefreshCw className="animate-spin text-primary" size={28} />
                  <span className="text-sm">목록을 불러오는 중...</span>
                </div>
              ) : driveItems.length === 0 ? (
                <div className="flex h-full min-h-[300px] items-center justify-center text-sm text-secondary">
                  폴더가 비어 있습니다.
                </div>
              ) : (
                driveItems.map((item) => {
                  const isFolder = item.mimeType === "application/vnd.google-apps.folder";
                  const isSelected = tempSelectedSheet?.id === item.id;
                  
                  return (
                    <div
                      key={item.id}
                      onClick={() => isFolder ? handleNavigateFolder(item) : handleSelectSheetItem(item)}
                      className={`flex items-center justify-between px-4 py-3.5 transition cursor-pointer hover:bg-surface-container-low ${isSelected ? "bg-primary-soft/50 border-l-4 border-l-primary" : ""}`}
                    >
                      <div className="flex items-center gap-3">
                        {isFolder ? (
                          <Folder className="text-amber-400 fill-amber-400" size={20} />
                        ) : (
                          <FileSpreadsheet className="text-tertiary" size={20} />
                        )}
                        <span className="text-sm font-bold text-text-heading">{item.name}</span>
                      </div>
                      
                      {isFolder ? (
                        <span className="text-xs font-bold text-secondary uppercase bg-surface-container px-2 py-1 rounded">
                          폴더
                        </span>
                      ) : (
                        <div className="flex items-center">
                          {isSelected ? (
                            <span className="text-xs font-bold text-primary bg-primary-soft px-2.5 py-1 rounded">
                              선택됨
                            </span>
                          ) : (
                            <span className="text-xs font-bold text-secondary bg-surface-container px-2 py-1 rounded">
                              스프레드시트
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <div className="mt-6 flex justify-between gap-3 border-t border-border-subtle pt-4">
              <button
                className="inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:underline"
                onClick={() => {
                  setShowDriveExplorer(false);
                  setShowSheetModal(true);
                }}
              >
                <Plus size={16} /> 신규 시트 만들기
              </button>
              <div className="flex gap-2">
                <Button onClick={() => setShowDriveExplorer(false)} variant="secondary">
                  닫기
                </Button>
                <Button 
                  disabled={!tempSelectedSheet} 
                  onClick={handleConfirmSheetSelection}
                >
                  선택 적용
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showSheetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-primary">신규 스프레드시트 생성</h3>
            <p className="mt-1 text-sm text-secondary">Google Drive에 일정 동기화용 신규 시트를 생성합니다.</p>
            <div className="mt-4">
              <label className="block text-xs font-bold text-secondary uppercase tracking-wider">스프레드시트 이름</label>
              <input
                autoFocus
                className="mt-2 w-full rounded border border-border px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                onChange={(e) => setNewSheetTitle(e.target.value)}
                placeholder="예: 홈쇼핑 일정 관리 (2026)"
                type="text"
                value={newSheetTitle}
              />
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Button onClick={() => setShowSheetModal(false)} variant="secondary">
                취소
              </Button>
              <Button disabled={isCreatingSheet || !newSheetTitle.trim()} onClick={handleCreateSheet}>
                {isCreatingSheet ? "생성 중..." : "시트 생성 및 적용"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {showCalendarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-primary text-left">신규 캘린더 생성</h3>
            <p className="mt-1 text-sm text-secondary text-left">구글 계정에 일정 공유용 새 캘린더를 생성합니다.</p>
            <div className="mt-4">
              <label className="block text-xs font-bold text-secondary uppercase tracking-wider text-left">캘린더 이름</label>
              <input
                autoFocus
                className="mt-2 w-full rounded border border-border px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                onChange={(e) => setNewCalendarTitle(e.target.value)}
                placeholder={creatingCalendarType === "broadcast" ? "예: 홈쇼핑 방송 일정" : "예: 홈쇼핑 출고 일정"}
                type="text"
                value={newCalendarTitle}
              />
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Button onClick={() => setShowCalendarModal(false)} variant="secondary">
                취소
              </Button>
              <Button disabled={isCreatingCalendar || !newCalendarTitle.trim()} onClick={handleCreateCalendar}>
                {isCreatingCalendar ? "생성 중..." : "캘린더 생성 및 적용"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <MigrationModal
        isOpen={showMigrationModal}
        onClose={() => setShowMigrationModal(false)}
        onSuccess={refreshData}
        existingChannels={channels}
        existingPartners={partners}
      />
    </>
  );
}
