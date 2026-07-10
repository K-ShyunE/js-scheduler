import { useState, useEffect, useRef, type FormEvent, type ReactNode } from "react";
import { CalendarDays, CheckCircle2, Send, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { PageHeader } from "../components/ui/PageHeader";
import { createSchedule, updateSchedule } from "../lib/api";
import { scheduleDraftSchema } from "../lib/schemas";
import type { Channel, Partner, ScheduleDraft, User, ScheduleView } from "../types/domain";
// @ts-ignore
import Litepicker from "litepicker";

interface ScheduleFormPageProps {
  channels: Channel[];
  onCreated: () => Promise<void>;
  partners: Partner[];
  user: User | null;
  editingSchedule?: ScheduleView | null;
  onCancel?: () => void;
}

interface SyncTask {
  id: string;
  name: string;
  status: "pending" | "running" | "success" | "failed";
}

const getTodayString = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const initialForm = (defaultChannelId = "", defaultPartnerId = ""): ScheduleDraft => ({
  productName: "",
  brandName: "",
  partnerId: defaultPartnerId,
  channelId: defaultChannelId,
  saleDate: getTodayString(),
  saleStartTime: "",
  saleEndTime: "",
  shipmentDate: "",
  quantity: 0,
  memo: "",
});

export function ScheduleFormPage({ channels, onCreated, partners, user, editingSchedule, onCancel }: ScheduleFormPageProps) {
  const activeChannels = channels.filter((c) => c.isActive || (editingSchedule && c.id === editingSchedule.channelId));
  const activePartners = partners.filter((p) => p.isActive || (editingSchedule && p.id === editingSchedule.partnerId));

  const defaultChannelId = activeChannels[0]?.id || "";
  const defaultPartnerId = activePartners[0]?.id || "";

  const [form, setForm] = useState<ScheduleDraft>(() => {
    if (editingSchedule) {
      return {
        productName: editingSchedule.product.name,
        brandName: editingSchedule.product.brandName || "",
        partnerId: editingSchedule.partnerId,
        channelId: editingSchedule.channelId,
        saleDate: editingSchedule.saleDate,
        saleStartTime: editingSchedule.saleStartTime,
        saleEndTime: editingSchedule.saleEndTime || editingSchedule.saleStartTime,
        shipmentDate: editingSchedule.shipmentDate || "",
        quantity: editingSchedule.quantity,
        memo: editingSchedule.memo || "",
      };
    }
    return initialForm(defaultChannelId, defaultPartnerId);
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [syncTasks, setSyncTasks] = useState<SyncTask[] | null>(null);

  const saleDateRef = useRef<HTMLInputElement>(null);
  const shipmentDateRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingSchedule) {
      const nextForm = {
        productName: editingSchedule.product.name,
        brandName: editingSchedule.product.brandName || "",
        partnerId: editingSchedule.partnerId,
        channelId: editingSchedule.channelId,
        saleDate: editingSchedule.saleDate,
        saleStartTime: editingSchedule.saleStartTime,
        saleEndTime: editingSchedule.saleEndTime || editingSchedule.saleStartTime,
        shipmentDate: editingSchedule.shipmentDate || "",
        quantity: editingSchedule.quantity,
        memo: editingSchedule.memo || "",
      };
      setForm(nextForm);
      if (saleDateRef.current) {
        saleDateRef.current.value = nextForm.saleDate;
      }
      if (shipmentDateRef.current) {
        shipmentDateRef.current.value = nextForm.shipmentDate || "";
      }
    }
  }, [editingSchedule]);

  // Sync default values when list loads
  useEffect(() => {
    if (activeChannels.length > 0 && !form.channelId && !editingSchedule) {
      setForm((curr) => ({ ...curr, channelId: activeChannels[0].id }));
    }
  }, [activeChannels, form.channelId, editingSchedule]);

  useEffect(() => {
    if (activePartners.length > 0 && !form.partnerId) {
      setForm((curr) => ({ ...curr, partnerId: activePartners[0].id }));
    }
  }, [activePartners, form.partnerId]);

  // Initialize Litepickers
  useEffect(() => {
    if (!saleDateRef.current) return;
    const picker = new Litepicker({
      element: saleDateRef.current,
      format: "YYYY-MM-DD",
      firstDay: 0,
      parentEl: document.body,
      locale: {
        months: ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"],
        days: ["일", "월", "화", "수", "목", "금", "토"],
      },
      setup: (picker: any) => {
        picker.on("selected", (date: any) => {
          updateField("saleDate", date.format("YYYY-MM-DD"));
        });
      },
    } as any);
    picker.setDate(form.saleDate);

    return () => {
      picker.destroy();
    };
  }, []);

  useEffect(() => {
    if (!shipmentDateRef.current) return;
    const picker = new Litepicker({
      element: shipmentDateRef.current,
      format: "YYYY-MM-DD",
      firstDay: 0,
      parentEl: document.body,
      locale: {
        months: ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"],
        days: ["일", "월", "화", "수", "목", "금", "토"],
      },
      setup: (picker: any) => {
        picker.on("selected", (date: any) => {
          updateField("shipmentDate", date.format("YYYY-MM-DD"));
        });
      },
    } as any);
    if (form.shipmentDate) {
      picker.setDate(form.shipmentDate);
    }

    return () => {
      picker.destroy();
    };
  }, []);

  function updateField<Key extends keyof ScheduleDraft>(key: Key, value: ScheduleDraft[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: "" }));
  }

  function handleClearShipmentDate() {
    updateField("shipmentDate", "");
    if (shipmentDateRef.current) {
      shipmentDateRef.current.value = "";
    }
  }

  function handleTimeBlur(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return;

    const cleaned = trimmed.replace(/[^0-9:]/g, "");
    let hours = 0;
    let minutes = 0;

    if (cleaned.includes(":")) {
      const parts = cleaned.split(":");
      hours = parseInt(parts[0], 10) || 0;
      minutes = parseInt(parts[1], 10) || 0;
    } else if (cleaned.length > 0 && cleaned.length <= 2) {
      hours = parseInt(cleaned, 10) || 0;
      minutes = 0;
    } else if (cleaned.length === 3) {
      hours = parseInt(cleaned.substring(0, 1), 10) || 0;
      minutes = parseInt(cleaned.substring(1), 10) || 0;
    } else if (cleaned.length === 4) {
      hours = parseInt(cleaned.substring(0, 2), 10) || 0;
      minutes = parseInt(cleaned.substring(2), 10) || 0;
    } else {
      return;
    }

    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      return;
    }

    const formattedTime = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
    updateField("saleStartTime", formattedTime);
  }

  function handleReset() {
    const nextForm = initialForm(defaultChannelId, defaultPartnerId);
    setForm(nextForm);
    setErrors({});
    if (saleDateRef.current) {
      saleDateRef.current.value = nextForm.saleDate;
    }
    if (shipmentDateRef.current) {
      shipmentDateRef.current.value = "";
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const selectedPartner = partners.find((p) => p.id === form.partnerId);
    const brandName = selectedPartner ? selectedPartner.name : "";

    const payload = {
      ...form,
      brandName,
      saleEndTime: form.saleEndTime || form.saleStartTime,
    };

    const parsed = scheduleDraftSchema.safeParse(payload);

    if (!parsed.success) {
      setErrors(
        Object.fromEntries(
          parsed.error.issues.map((issue) => [issue.path.join("."), issue.message]),
        ),
      );
      return;
    }

    // Initialize progress checklist
    const tasks: SyncTask[] = [
      {
        id: "db",
        name: editingSchedule ? "데이터베이스 일정 정보 수정" : "데이터베이스 방송 정보 등록",
        status: "running"
      }
    ];
    if (user?.spreadsheetId) {
      tasks.push({
        id: "sheets",
        name: editingSchedule ? "Google Sheets 일정 행 업데이트" : "Google Sheets 일정 행 추가",
        status: "pending"
      });
    }
    if (user?.calendarId) {
      tasks.push({
        id: "broadcast_cal",
        name: editingSchedule ? "방송일정 구글 캘린더 업데이트" : "방송일정 구글 캘린더 등록",
        status: "pending"
      });
    }
    const hasPriorShipment = editingSchedule && !!editingSchedule.googleCalendarShipmentEventId;
    if (user?.shipmentCalendarId && (form.shipmentDate || hasPriorShipment)) {
      tasks.push({
        id: "shipment_cal",
        name: editingSchedule ? "출고일정 구글 캘린더 업데이트/삭제" : "출고일정 구글 캘린더 등록",
        status: "pending"
      });
    }
    setSyncTasks(tasks);
    setIsSubmitting(true);

    try {
      // Simulate D1 DB writing speed slightly for visual balance
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setSyncTasks(prev => {
        if (!prev) return null;
        return prev.map(t => {
          if (t.id === "db") return { ...t, status: "success" };
          if (t.id === "sheets") return { ...t, status: "running" };
          return t;
        });
      });

      const draft: ScheduleDraft = {
        ...parsed.data,
        brandName: parsed.data.brandName || "",
        saleEndTime: parsed.data.saleEndTime || "",
        shipmentDate: parsed.data.shipmentDate || "",
      };

      const result = editingSchedule
        ? await updateSchedule({ ...draft, id: editingSchedule.id })
        : await createSchedule(draft);

      // Map final statuses based on API result
      setSyncTasks(prev => {
        if (!prev) return null;
        return prev.map(t => {
          if (t.id === "db") {
            return { ...t, status: "success" };
          }
          if (t.id === "sheets") {
            return { ...t, status: result.googleSheetRowId ? "success" : "failed" };
          }
          if (t.id === "broadcast_cal") {
            return { ...t, status: result.googleCalendarEventId ? "success" : "failed" };
          }
          if (t.id === "shipment_cal") {
            const isSuccess = form.shipmentDate ? !!result.googleCalendarShipmentEventId : !result.googleCalendarShipmentEventId;
            return { ...t, status: isSuccess ? "success" : "failed" };
          }
          return t;
        });
      });

      const hasFailures = (user?.spreadsheetId && !result.googleSheetRowId) || 
                          (user?.calendarId && !result.googleCalendarEventId) || 
                          (user?.shipmentCalendarId && form.shipmentDate && !result.googleCalendarShipmentEventId);

      if (!hasFailures) {
        setTimeout(async () => {
          setIsSubmitting(false);
          setSyncTasks(null);

          const nextForm = initialForm(defaultChannelId, defaultPartnerId);
          setForm(nextForm);
          if (saleDateRef.current) {
            saleDateRef.current.value = nextForm.saleDate;
          }
          if (shipmentDateRef.current) {
            shipmentDateRef.current.value = "";
          }
          await onCreated();
        }, 1500);
      } else {
        setIsSubmitting(false);
      }
    } catch (e) {
      console.error(e);
      setSyncTasks(prev => {
        if (!prev) return null;
        return prev.map(t => {
          if (t.status === "running" || t.status === "pending") {
            return { ...t, status: "failed" };
          }
          return t;
        });
      });
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <PageHeader
        description={editingSchedule ? "연동된 판매 및 출고 정보를 실시간으로 수정/삭제 반영합니다." : "전달받은 판매 정보와 출고 정보를 한 번에 등록합니다. 실제 API 연결 후에는 저장과 동시에 Google Sheets/Calendar 작성이 이어집니다."}
        eyebrow={editingSchedule ? "Edit Schedule" : "Create Schedule"}
        title={editingSchedule ? "판매 및 출고 일정 수정" : "판매 및 출고 일정 등록"}
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
        <Card className="p-8">
          <form className="space-y-8" onSubmit={handleSubmit} autoComplete="off">
            <div>
              <h3 className="text-lg font-bold">기본 정보</h3>
              <div className="mt-5 space-y-5">
                <div className="grid grid-cols-[1fr_140px] gap-5">
                  <Field label="상품명" error={errors.productName} required>
                    <input
                      className="form-input"
                      onChange={(event) => updateField("productName", event.target.value)}
                      placeholder="예: V15 디텍트 앱솔루트 엑스트라"
                      value={form.productName}
                      autoComplete="off"
                    />
                  </Field>
                  <Field label="수량" error={errors.quantity} required>
                    <input
                      className="form-input"
                      min={0}
                      onChange={(event) => updateField("quantity", Number(event.target.value))}
                      type="number"
                      value={form.quantity || ""}
                      autoComplete="off"
                    />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-5">
                  <Field label="홈쇼핑 채널" error={errors.channelId} required>
                    <select
                      className="form-input"
                      onChange={(event) => updateField("channelId", event.target.value)}
                      value={form.channelId}
                    >
                      {activeChannels.map((channel) => (
                        <option key={channel.id} value={channel.id}>
                          {channel.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="공급 업체" error={errors.partnerId} required>
                    <select
                      className="form-input"
                      onChange={(event) => updateField("partnerId", event.target.value)}
                      value={form.partnerId}
                    >
                      {activePartners.map((partner) => (
                        <option key={partner.id} value={partner.id}>
                          {partner.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold">일정 정보</h3>
              <div className="mt-5 grid grid-cols-3 gap-5">
                <Field label="판매일" error={errors.saleDate} required>
                  <input
                    ref={saleDateRef}
                    className="form-input bg-white cursor-pointer"
                    placeholder="연도-월-일"
                    readOnly
                    autoComplete="off"
                  />
                </Field>
                <Field label="시작 시간" error={errors.saleStartTime} required>
                  <input
                    className="form-input"
                    onChange={(event) => updateField("saleStartTime", event.target.value)}
                    onBlur={(event) => handleTimeBlur(event.target.value)}
                    placeholder="예: 09:00 또는 9"
                    type="text"
                    value={form.saleStartTime}
                    autoComplete="off"
                  />
                </Field>
                <Field label="출고일" error={errors.shipmentDate}>
                  <div className="relative">
                    <input
                      ref={shipmentDateRef}
                      className="form-input bg-white cursor-pointer pr-10"
                      placeholder="연도-월-일 (선택사항)"
                      readOnly
                      autoComplete="off"
                    />
                    {form.shipmentDate && (
                      <button
                        type="button"
                        onClick={handleClearShipmentDate}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary hover:text-text-heading text-lg font-bold p-1"
                        title="출고일 초기화"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </Field>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5">
              <Field label="메모">
                <input
                  className="form-input"
                  onChange={(event) => updateField("memo", event.target.value)}
                  placeholder="전달 사항, 출고 특이사항, 공유 메모"
                  value={form.memo}
                  autoComplete="off"
                />
              </Field>
            </div>

            <div className="flex justify-end gap-3 border-t border-border-subtle pt-6">
              {editingSchedule && onCancel && (
                <Button onClick={onCancel} variant="ghost" type="button">
                  취소
                </Button>
              )}
              <Button onClick={handleReset} variant="ghost" type="button">
                초기화
              </Button>
              <Button disabled={isSubmitting} type="submit">
                <Send size={18} />
                {isSubmitting
                  ? (editingSchedule ? "수정 중" : "등록 중")
                  : (editingSchedule ? "수정 완료" : "등록 완료")}
              </Button>
            </div>

            {syncTasks && (
              <div className="mt-6 border-t border-border-subtle pt-6 space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-text-heading flex items-center gap-1.5">
                    <RefreshCw className={`text-primary ${syncTasks.every(t => t.status === "success") ? "" : "animate-spin"}`} size={16} />
                    실시간 동기화 진행 상황
                  </h4>
                  <span className="text-xs text-secondary">
                    {syncTasks.every(t => t.status === "success") ? "동기화 완료" : "동기화 진행 중..."}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {syncTasks.map((task) => (
                    <div
                      key={task.id}
                      className={`flex items-center justify-between rounded-lg border px-4 py-3 bg-surface-container-low transition-colors duration-200 ${
                        task.status === "success"
                          ? "border-tertiary-soft bg-tertiary-soft/10"
                          : task.status === "failed"
                          ? "border-error/20 bg-error/5"
                          : "border-border-subtle"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {task.status === "running" && (
                          <RefreshCw size={16} className="animate-spin text-primary shrink-0" />
                        )}
                        {task.status === "pending" && (
                          <span className="h-4 w-4 rounded-full border border-slate-300 shrink-0" />
                        )}
                        {task.status === "success" && (
                          <CheckCircle2 size={16} className="text-tertiary shrink-0" />
                        )}
                        {task.status === "failed" && (
                          <AlertCircle size={16} className="text-error shrink-0" />
                        )}
                        <span
                          className={`text-xs font-bold truncate ${
                            task.status === "success"
                              ? "text-tertiary"
                              : task.status === "running"
                              ? "text-primary"
                              : task.status === "failed"
                              ? "text-error"
                              : "text-secondary"
                          }`}
                        >
                          {task.name}
                        </span>
                      </div>
                      <span className="text-[10px] font-bold uppercase shrink-0">
                        {task.status === "running" && <span className="text-primary">진행 중</span>}
                        {task.status === "pending" && <span className="text-secondary">대기</span>}
                        {task.status === "success" && <span className="text-tertiary">완료</span>}
                        {task.status === "failed" && <span className="text-error">실패</span>}
                      </span>
                    </div>
                  ))}
                </div>

                {syncTasks.every((t) => t.status === "success") && (
                  <div className="flex flex-col items-center gap-2 pt-2 border-t border-border-subtle/50">
                    <span className="text-xs font-bold text-tertiary">모든 연동 완료! 잠시 후 목록으로 이동합니다.</span>
                  </div>
                )}

                {syncTasks.some((t) => t.status === "failed") && (
                  <div className="rounded-lg bg-error/10 p-3 text-xs text-error border border-error/10 flex items-center justify-between">
                    <span className="font-semibold">일부 연동 작업이 실패했습니다. (동기화 이력 탭에서 확인 가능)</span>
                    <Button onClick={() => setSyncTasks(null)} variant="secondary" className="h-7 text-[10px] px-2.5 ml-2 shrink-0">
                      상태창 닫기
                    </Button>
                  </div>
                )}
              </div>
            )}
          </form>
        </Card>

        <aside className="space-y-6">
          <Card className="p-6">
            <div className="rounded-lg bg-primary-soft p-4 text-primary w-fit">
              <CalendarDays size={24} />
            </div>
            <h3 className="mt-5 text-lg font-bold">등록 후 처리 흐름</h3>
            <ul className="mt-4 space-y-3 text-sm text-secondary">
              <li className="flex gap-2">
                <CheckCircle2 className="mt-0.5 text-tertiary" size={17} />
                앱 데이터베이스에 먼저 저장
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="mt-0.5 text-tertiary" size={17} />
                Google Sheets 행 작성
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="mt-0.5 text-tertiary" size={17} />
                Google Calendar 일정 생성
              </li>
            </ul>
          </Card>
          <Card className="bg-[#1f2020] p-6 text-white">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/50">
              System Note
            </p>
            <p className="mt-4 text-lg font-bold">실시간 동기화 모드</p>
            <p className="mt-2 text-sm leading-6 text-white/65">
              현재 계정에 구글 계정이 연동되어 있어, 일정을 저장함과 동시에 구글 스프레드시트 및 캘린더에 실시간으로 작성됩니다.
            </p>
          </Card>
        </aside>
      </div>
    </>
  );
}

interface FieldProps {
  children: ReactNode;
  error?: string;
  label: string;
  required?: boolean;
}

function Field({ children, error, label, required }: FieldProps) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-text-heading">
        {label} {required ? <span className="text-primary">*</span> : null}
      </span>
      {children}
      {error ? <span className="mt-1 block text-xs font-semibold text-error">{error}</span> : null}
    </label>
  );
}
