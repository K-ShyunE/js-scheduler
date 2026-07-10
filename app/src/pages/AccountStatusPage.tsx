import { useState, useEffect } from "react";
import { CalendarCheck, CloudOff, FileSpreadsheet, KeyRound, RefreshCw, CheckCircle2, AlertCircle, Plus, Folder, ChevronRight, ArrowLeft, ChevronDown } from "lucide-react";
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
      <PageHeader
        description="Google 로그인, 허용 이메일, Sheets/Calendar 연동 상태를 확인하고 동기화할 대상을 선택합니다."
        eyebrow="Account"
        title="계정 상태 관리"
      />

      <div className="mb-6 flex justify-end">
        {isGoogleConnected ? (
          <div className="inline-flex items-center gap-2 rounded border border-tertiary-soft bg-white px-4 py-3 text-sm font-bold text-tertiary shadow-sm">
            <CheckCircle2 size={18} />
            OAuth 연동 완료
          </div>
        ) : (
          <div className="inline-flex items-center gap-2 rounded border border-border-subtle bg-white px-4 py-3 text-sm font-bold text-error shadow-sm">
            <CloudOff size={18} />
            OAuth 미연결
          </div>
        )}
        <Button className="ml-3" onClick={onLogout} variant="secondary">
          로그아웃
        </Button>
      </div>

      <div className="grid grid-cols-[380px_1fr] gap-6">
        <div className="space-y-6">
          <Card className="p-8 text-center">
            {isGoogleConnected ? (
              <>
                <div className="mx-auto grid h-20 w-20 place-items-center rounded-lg bg-tertiary-soft text-tertiary">
                  <CheckCircle2 size={34} />
                </div>
                <h3 className="mt-6 text-xl font-extrabold">Google 계정 연결됨</h3>
                <p className="mt-3 text-sm leading-6 text-secondary">
                  현재 구글 로그인 상태입니다. Sheets 및 Calendar 연동 기능을 사용할 수 있습니다.
                </p>
                <div className="mt-6 rounded-lg bg-surface-container p-4 text-left">
                  <p className="text-xs font-bold text-secondary uppercase tracking-wider">연동된 이메일</p>
                  <p className="mt-1 font-bold text-primary truncate">{user?.googleEmail}</p>
                </div>
              </>
            ) : (
              <>
                <div className="mx-auto grid h-20 w-20 place-items-center rounded-lg bg-surface-container text-secondary">
                  <KeyRound size={34} />
                </div>
                <h3 className="mt-6 text-xl font-extrabold">Google 계정 연결 대기</h3>
                <p className="mt-3 text-sm leading-6 text-secondary">
                  구글 계정을 연결하여 Sheets 및 Calendar 자동 동기화 대상을 설정할 수 있습니다.
                </p>
                <Button className="mt-6 w-full" onClick={onGoogleLogin}>
                  <RefreshCw size={18} />
                  Google 계정으로 연결하기
                </Button>
              </>
            )}
          </Card>

          <Card className="bg-[#1f2020] p-6 text-white">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/50">
              Current Session
            </p>
            <p className="mt-4 text-lg font-bold">{user?.name ?? "사용자"}</p>
            <p className="mt-1 text-sm text-white/65">{user?.email ?? "이메일 정보 없음"}</p>
          </Card>
        </div>

        <div className="space-y-6">
          {isGoogleConnected ? (
            <Card className="p-6">
              <h3 className="text-lg font-bold border-b border-border-subtle pb-4">Google 연동 설정</h3>

              <div className="mt-6 space-y-6">
                <div>
                  <label className="block text-sm font-bold text-secondary">Google Sheets 대상 스프레드시트</label>
                  <div className="mt-2 flex items-center justify-between rounded-lg border border-border bg-surface-container-low px-4 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <FileSpreadsheet className="text-tertiary shrink-0" size={20} />
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-text-heading truncate">{selectedSheetName}</p>
                        {selectedSheetId && <p className="text-xs text-secondary truncate">ID: {selectedSheetId}</p>}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={() => setShowDriveExplorer(true)} variant="secondary" className="h-9 text-xs px-3">
                        드라이브 탐색
                      </Button>
                      <Button onClick={() => setShowSheetModal(true)} variant="secondary" className="h-9 text-xs px-3">
                        새로 만들기
                      </Button>
                    </div>
                  </div>
                </div>

                {/* 1. 방송일정 캘린더 */}
                <div>
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-bold text-secondary">방송일정 캘린더 연동</label>
                    <button
                      className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
                      onClick={() => {
                        setCreatingCalendarType("broadcast");
                        setShowCalendarModal(true);
                      }}
                    >
                      <Plus size={14} />
                      새로 만들기
                    </button>
                  </div>
                  <div className="mt-2 flex gap-3">
                    <div className="relative flex-1">
                      <button
                        type="button"
                        disabled={isCalendarsLoading}
                        onClick={() => {
                          setShowCalendarDropdown(!showCalendarDropdown);
                          setShowShipmentCalendarDropdown(false);
                        }}
                        className="w-full flex items-center justify-between rounded border border-border px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 text-left disabled:bg-surface-container-low"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {selectedCalendarId ? (
                            <span
                              className="h-3.5 w-3.5 rounded-full shrink-0 border border-black/10"
                              style={{ backgroundColor: calendars.find(c => c.id === selectedCalendarId)?.backgroundColor || "#4285F4" }}
                            />
                          ) : (
                            <span className="h-3.5 w-3.5 rounded-full bg-slate-200 shrink-0 border border-black/10" />
                          )}
                          <span className="truncate font-semibold text-text-heading">
                            {selectedCalendarId
                              ? calendars.find(c => c.id === selectedCalendarId)?.summary || selectedCalendarId
                              : "동기화하지 않음"}
                          </span>
                        </div>
                        {isCalendarsLoading ? (
                          <RefreshCw className="animate-spin text-secondary shrink-0 ml-2" size={16} />
                        ) : (
                          <ChevronDown className="text-secondary shrink-0 ml-2" size={16} />
                        )}
                      </button>

                      {showCalendarDropdown && (
                        <>
                          <div className="fixed inset-0 z-30" onClick={() => setShowCalendarDropdown(false)} />
                          <ul className="absolute left-0 right-0 mt-1 max-h-60 overflow-y-auto rounded border border-border bg-white py-1 shadow-lg z-40 divide-y divide-border-subtle">
                            <li
                              onClick={() => {
                                setSelectedCalendarId("");
                                setShowCalendarDropdown(false);
                              }}
                              className="flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-surface-container-low cursor-pointer"
                            >
                              <span className="h-3.5 w-3.5 rounded-full bg-slate-200 shrink-0 border border-black/10" />
                              <span className="text-secondary font-semibold">동기화하지 않음</span>
                            </li>
                            {calendars.map((cal) => (
                              <li
                                key={cal.id}
                                onClick={() => {
                                  setSelectedCalendarId(cal.id);
                                  setShowCalendarDropdown(false);
                                }}
                                className={`flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-surface-container-low cursor-pointer ${
                                  selectedCalendarId === cal.id ? "bg-primary-soft/50 font-bold" : ""
                                }`}
                              >
                                <span
                                  className="h-3.5 w-3.5 rounded-full shrink-0 border border-black/10"
                                  style={{ backgroundColor: cal.backgroundColor || "#4285F4" }}
                                />
                                <span className="truncate text-text-heading font-semibold">{cal.summary}</span>
                              </li>
                            ))}
                          </ul>
                        </>
                      )}
                    </div>
                    <Button onClick={loadInitialData} variant="secondary">
                      <RefreshCw size={16} />
                    </Button>
                  </div>
                </div>

                {/* 2. 출고일정 캘린더 */}
                <div>
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-bold text-secondary">출고일정 캘린더 연동</label>
                    <button
                      className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
                      onClick={() => {
                        setCreatingCalendarType("shipment");
                        setShowCalendarModal(true);
                      }}
                    >
                      <Plus size={14} />
                      새로 만들기
                    </button>
                  </div>
                  <div className="mt-2 flex gap-3">
                    <div className="relative flex-1">
                      <button
                        type="button"
                        disabled={isCalendarsLoading}
                        onClick={() => {
                          setShowShipmentCalendarDropdown(!showShipmentCalendarDropdown);
                          setShowCalendarDropdown(false);
                        }}
                        className="w-full flex items-center justify-between rounded border border-border px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 text-left disabled:bg-surface-container-low"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {selectedShipmentCalendarId ? (
                            <span
                              className="h-3.5 w-3.5 rounded-full shrink-0 border border-black/10"
                              style={{ backgroundColor: calendars.find(c => c.id === selectedShipmentCalendarId)?.backgroundColor || "#4285F4" }}
                            />
                          ) : (
                            <span className="h-3.5 w-3.5 rounded-full bg-slate-200 shrink-0 border border-black/10" />
                          )}
                          <span className="truncate font-semibold text-text-heading">
                            {selectedShipmentCalendarId
                              ? calendars.find(c => c.id === selectedShipmentCalendarId)?.summary || selectedShipmentCalendarId
                              : "동기화하지 않음"}
                          </span>
                        </div>
                        {isCalendarsLoading ? (
                          <RefreshCw className="animate-spin text-secondary shrink-0 ml-2" size={16} />
                        ) : (
                          <ChevronDown className="text-secondary shrink-0 ml-2" size={16} />
                        )}
                      </button>

                      {showShipmentCalendarDropdown && (
                        <>
                          <div className="fixed inset-0 z-30" onClick={() => setShowShipmentCalendarDropdown(false)} />
                          <ul className="absolute left-0 right-0 mt-1 max-h-60 overflow-y-auto rounded border border-border bg-white py-1 shadow-lg z-40 divide-y divide-border-subtle">
                            <li
                              onClick={() => {
                                setSelectedShipmentCalendarId("");
                                setShowShipmentCalendarDropdown(false);
                              }}
                              className="flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-surface-container-low cursor-pointer"
                            >
                              <span className="h-3.5 w-3.5 rounded-full bg-slate-200 shrink-0 border border-black/10" />
                              <span className="text-secondary font-semibold">동기화하지 않음</span>
                            </li>
                            {calendars.map((cal) => (
                              <li
                                key={cal.id}
                                onClick={() => {
                                  setSelectedShipmentCalendarId(cal.id);
                                  setShowShipmentCalendarDropdown(false);
                                }}
                                className={`flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-surface-container-low cursor-pointer ${
                                  selectedShipmentCalendarId === cal.id ? "bg-primary-soft/50 font-bold" : ""
                                }`}
                              >
                                <span
                                  className="h-3.5 w-3.5 rounded-full shrink-0 border border-black/10"
                                  style={{ backgroundColor: cal.backgroundColor || "#4285F4" }}
                                />
                                <span className="truncate text-text-heading font-semibold">{cal.summary}</span>
                              </li>
                            ))}
                          </ul>
                        </>
                      )}
                    </div>
                    <Button onClick={loadInitialData} variant="secondary">
                      <RefreshCw size={16} />
                    </Button>
                  </div>
                </div>

                <div className="border-t border-border-subtle pt-6 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {saveStatus === "success" && (
                      <span className="inline-flex items-center gap-1 text-sm font-bold text-tertiary">
                        <CheckCircle2 size={16} /> 연동 설정이 성공적으로 저장되었습니다.
                      </span>
                    )}
                    {saveStatus === "error" && (
                      <span className="inline-flex items-center gap-1 text-sm font-bold text-error">
                        <AlertCircle size={16} /> 설정 저장 중 오류가 발생했습니다.
                      </span>
                    )}
                  </div>
                  <Button disabled={isSaving} onClick={handleSaveSettings}>
                    {isSaving ? "저장 중..." : "연동 설정 저장"}
                  </Button>
                </div>
              </div>
            </Card>
          ) : (
            <Card className="p-8 text-center text-secondary">
              <CloudOff className="mx-auto text-secondary/50 mb-4" size={40} />
              <p className="text-sm">구글 계정을 연동하시면 상세한 Sheets 및 Calendar 연동 대상을 수동으로 설정할 수 있습니다.</p>
            </Card>
          )}

          <Card>
            <div className="border-b border-border-subtle px-6 py-5">
              <h3 className="text-lg font-bold">동기화 이력</h3>
            </div>
            <div className="divide-y divide-border-subtle">
              {syncLogs.length === 0 ? (
                <div className="flex items-center justify-center p-8 text-sm text-secondary">
                  동기화 이력이 없습니다.
                </div>
              ) : (
                syncLogs.map((log) => (
                  <div className="grid grid-cols-[150px_1fr_120px] gap-4 px-6 py-4" key={log.id}>
                    <span className="text-sm font-bold text-secondary">
                      {log.target === "sheets" ? "Sheets" : "Calendar"}
                    </span>
                    <div>
                      <p className="text-sm font-bold">{log.message}</p>
                      <p className="mt-1 text-xs text-secondary">{formatDateTime(log.createdAt)}</p>
                    </div>
                    <span className="text-right text-xs font-bold uppercase text-secondary">
                      {log.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card>
            <div className="border-b border-border-subtle px-6 py-5 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">기존 데이터 마이그레이션</h3>
                <p className="mt-1 text-xs text-secondary">이전 시스템의 구글 시트를 CSV로 다운받아 일괄 등록합니다.</p>
              </div>
              <Button onClick={() => setShowMigrationModal(true)}>
                CSV 업로드하기
              </Button>
            </div>
          </Card>
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
