import { useState, type FormEvent, type ReactNode } from "react";
import { CalendarDays, CheckCircle2, Send } from "lucide-react";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { PageHeader } from "../components/ui/PageHeader";
import { createSchedule } from "../lib/api";
import { scheduleDraftSchema } from "../lib/schemas";
import type { Channel, Partner, ScheduleDraft } from "../types/domain";

interface ScheduleFormPageProps {
  channels: Channel[];
  onCreated: () => Promise<void>;
  partners: Partner[];
}

const initialForm: ScheduleDraft = {
  productName: "",
  brandName: "",
  partnerId: "",
  channelId: "",
  saleDate: "",
  saleStartTime: "",
  saleEndTime: "",
  shipmentDate: "",
  quantity: 0,
  memo: "",
};

export function ScheduleFormPage({ channels, onCreated, partners }: ScheduleFormPageProps) {
  const [form, setForm] = useState<ScheduleDraft>(initialForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateField<Key extends keyof ScheduleDraft>(key: Key, value: ScheduleDraft[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: "" }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = scheduleDraftSchema.safeParse(form);

    if (!parsed.success) {
      setErrors(
        Object.fromEntries(
          parsed.error.issues.map((issue) => [issue.path.join("."), issue.message]),
        ),
      );
      return;
    }

    setIsSubmitting(true);
    await createSchedule(parsed.data);
    setIsSubmitting(false);
    setForm(initialForm);
    await onCreated();
  }

  return (
    <>
      <PageHeader
        description="전달받은 판매 정보와 출고 정보를 한 번에 등록합니다. 실제 API 연결 후에는 저장과 동시에 Google Sheets/Calendar 작성이 이어집니다."
        eyebrow="Create Schedule"
        title="판매 및 출고 일정 등록"
      />

      <div className="grid grid-cols-[1fr_360px] gap-6">
        <Card className="p-8">
          <form className="space-y-8" onSubmit={handleSubmit}>
            <div>
              <h3 className="text-lg font-bold">기본 정보</h3>
              <div className="mt-5 grid grid-cols-2 gap-5">
                <Field label="상품명" error={errors.productName} required>
                  <input
                    className="form-input"
                    onChange={(event) => updateField("productName", event.target.value)}
                    placeholder="예: V15 디텍트 앱솔루트 엑스트라"
                    value={form.productName}
                  />
                </Field>
                <Field label="브랜드 / 공급 업체명" error={errors.brandName} required>
                  <input
                    className="form-input"
                    onChange={(event) => updateField("brandName", event.target.value)}
                    placeholder="예: 다이슨"
                    value={form.brandName}
                  />
                </Field>
                <Field label="공급 업체" error={errors.partnerId} required>
                  <select
                    className="form-input"
                    onChange={(event) => updateField("partnerId", event.target.value)}
                    value={form.partnerId}
                  >
                    <option value="">업체를 선택하세요</option>
                    {partners.map((partner) => (
                      <option key={partner.id} value={partner.id}>
                        {partner.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="홈쇼핑 채널" error={errors.channelId} required>
                  <select
                    className="form-input"
                    onChange={(event) => updateField("channelId", event.target.value)}
                    value={form.channelId}
                  >
                    <option value="">채널을 선택하세요</option>
                    {channels.map((channel) => (
                      <option key={channel.id} value={channel.id}>
                        {channel.name}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold">일정 정보</h3>
              <div className="mt-5 grid grid-cols-4 gap-5">
                <Field label="판매일" error={errors.saleDate} required>
                  <input
                    className="form-input"
                    onChange={(event) => updateField("saleDate", event.target.value)}
                    type="date"
                    value={form.saleDate}
                  />
                </Field>
                <Field label="시작 시간" error={errors.saleStartTime} required>
                  <input
                    className="form-input"
                    onChange={(event) => updateField("saleStartTime", event.target.value)}
                    type="time"
                    value={form.saleStartTime}
                  />
                </Field>
                <Field label="종료 시간" error={errors.saleEndTime} required>
                  <input
                    className="form-input"
                    onChange={(event) => updateField("saleEndTime", event.target.value)}
                    type="time"
                    value={form.saleEndTime}
                  />
                </Field>
                <Field label="출고일" error={errors.shipmentDate} required>
                  <input
                    className="form-input"
                    onChange={(event) => updateField("shipmentDate", event.target.value)}
                    type="date"
                    value={form.shipmentDate}
                  />
                </Field>
              </div>
            </div>

            <div className="grid grid-cols-[240px_1fr] gap-5">
              <Field label="수량" error={errors.quantity} required>
                <input
                  className="form-input"
                  min={0}
                  onChange={(event) => updateField("quantity", Number(event.target.value))}
                  type="number"
                  value={form.quantity}
                />
              </Field>
              <Field label="메모">
                <input
                  className="form-input"
                  onChange={(event) => updateField("memo", event.target.value)}
                  placeholder="전달 사항, 출고 특이사항, 공유 메모"
                  value={form.memo}
                />
              </Field>
            </div>

            <div className="flex justify-end gap-3 border-t border-border-subtle pt-6">
              <Button onClick={() => setForm(initialForm)} variant="ghost">
                초기화
              </Button>
              <Button disabled={isSubmitting} type="submit">
                <Send size={18} />
                {isSubmitting ? "등록 중" : "등록 완료"}
              </Button>
            </div>
          </form>
        </Card>

        <aside className="space-y-6">
          <Card className="p-6">
            <div className="rounded-lg bg-primary-soft p-4 text-primary">
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
            <p className="mt-4 text-lg font-bold">현재는 mock 등록 모드입니다.</p>
            <p className="mt-2 text-sm leading-6 text-white/65">
              D1과 Google API 연결 전까지는 화면 흐름과 데이터 구조를 검토하기 위한
              임시 저장으로 동작합니다.
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
