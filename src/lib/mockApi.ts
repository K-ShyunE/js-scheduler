import { scheduleDraftSchema } from "./schemas";
import {
  channels,
  currentUser,
  partners,
  products,
  schedules,
  syncLogs,
} from "../data/mockData";
import type {
  Channel,
  Partner,
  Product,
  Schedule,
  ScheduleDraft,
  ScheduleView,
  SyncLog,
  User,
} from "../types/domain";

let mutableProducts: Product[] = [...products];
let mutableSchedules: Schedule[] = [...schedules];
let mutableSyncLogs: SyncLog[] = [...syncLogs];

const delay = (ms = 120) => new Promise((resolve) => window.setTimeout(resolve, ms));

function hydrateSchedule(schedule: Schedule): ScheduleView {
  const product = mutableProducts.find((item) => item.id === schedule.productId);
  const partner = partners.find((item) => item.id === schedule.partnerId);
  const channel = channels.find((item) => item.id === schedule.channelId);

  if (!product || !partner || !channel) {
    throw new Error("Mock 데이터 연결이 올바르지 않습니다.");
  }

  return {
    ...schedule,
    product,
    partner,
    channel,
  };
}

export async function getSession(): Promise<User> {
  await delay();
  return currentUser;
}

export async function devLogin(): Promise<User> {
  await delay();
  return currentUser;
}

export function startGoogleLogin() {
  window.alert("Google OAuth는 Cloudflare Pages Functions 개발 서버에서 확인합니다.");
}

export async function logout(): Promise<void> {
  await delay();
}

export async function listPartners(): Promise<Partner[]> {
  await delay();
  return [...partners];
}

export async function listChannels(): Promise<Channel[]> {
  await delay();
  return [...channels].sort((a, b) => a.displayOrder - b.displayOrder);
}

export async function listSchedules(query = ""): Promise<ScheduleView[]> {
  await delay();
  const normalizedQuery = query.trim().toLowerCase();

  return mutableSchedules
    .map(hydrateSchedule)
    .filter((schedule) => {
      if (!normalizedQuery) {
        return true;
      }

      return [
        schedule.product.name,
        schedule.product.brandName,
        schedule.partner.name,
        schedule.channel.name,
        schedule.memo ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery);
    })
    .sort((a, b) => `${a.saleDate}${a.saleStartTime}`.localeCompare(`${b.saleDate}${b.saleStartTime}`));
}

export async function createSchedule(input: ScheduleDraft): Promise<ScheduleView> {
  await delay(180);
  const parsed = scheduleDraftSchema.parse(input);
  const now = new Date().toISOString();

  const product: Product = {
    id: `product_${crypto.randomUUID()}`,
    name: parsed.productName,
    brandName: parsed.brandName,
    partnerId: parsed.partnerId,
  };

  const schedule: Schedule = {
    id: `schedule_${crypto.randomUUID()}`,
    productId: product.id,
    partnerId: parsed.partnerId,
    channelId: parsed.channelId,
    saleDate: parsed.saleDate,
    saleStartTime: parsed.saleStartTime,
    saleEndTime: parsed.saleEndTime,
    shipmentDate: parsed.shipmentDate,
    quantity: parsed.quantity,
    status: "scheduled",
    // 실제 API에서는 D1 저장 이후 Google 작성 결과에 따라 상태를 갱신한다.
    syncStatus: "sync_pending",
    memo: parsed.memo,
    createdAt: now,
    updatedAt: now,
  };

  mutableProducts = [product, ...mutableProducts];
  mutableSchedules = [schedule, ...mutableSchedules];
  mutableSyncLogs = [
    {
      id: `sync_${crypto.randomUUID()}`,
      scheduleId: schedule.id,
      target: "sheets",
      operation: "create",
      status: "pending",
      message: "Google Sheets 작성 대기 중",
      createdAt: now,
    },
    ...mutableSyncLogs,
  ];

  return hydrateSchedule(schedule);
}

export async function listSyncLogs(): Promise<SyncLog[]> {
  await delay();
  return [...mutableSyncLogs].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getGoogleSheets(folderId?: string): Promise<{ id: string; name: string; mimeType: string }[]> {
  await delay();
  const fid = folderId || "root";
  if (fid === "root") {
    return [
      { id: "folder_1", name: "2026 홈쇼핑 관련 자료", mimeType: "application/vnd.google-apps.folder" },
      { id: "mock_sheet_1", name: "홈쇼핑 일정 관리", mimeType: "application/vnd.google-apps.spreadsheet" },
    ];
  }
  if (fid === "folder_1") {
    return [
      { id: "folder_2", name: "백업 폴더", mimeType: "application/vnd.google-apps.folder" },
      { id: "mock_sheet_2", name: "2026 하반기 방송 실적", mimeType: "application/vnd.google-apps.spreadsheet" },
    ];
  }
  if (fid === "folder_2") {
    return [
      { id: "mock_sheet_3", name: "구버전 백업 일정 시트", mimeType: "application/vnd.google-apps.spreadsheet" },
    ];
  }
  return [];
}

export async function getGoogleCalendars(): Promise<{ id: string; summary: string; backgroundColor?: string }[]> {
  await delay();
  return [
    { id: "primary", summary: "기본 캘린더 (operator@example.com)", backgroundColor: "#039be5" },
    { id: "mock_cal_1", summary: "홈쇼핑 일정 캘린더", backgroundColor: "#795548" },
  ];
}

export async function saveGoogleSettings(settings: {
  spreadsheetId: string | null;
  calendarId: string | null;
}): Promise<{ success: boolean }> {
  await delay();
  currentUser.spreadsheetId = settings.spreadsheetId;
  currentUser.calendarId = settings.calendarId;
  return { success: true };
}

export async function createGoogleSheet(title: string): Promise<{ spreadsheetId: string }> {
  await delay(200);
  return { spreadsheetId: `mock_sheet_${crypto.randomUUID()}` };
}

export async function createGoogleCalendar(summary: string): Promise<{ calendarId: string }> {
  await delay(200);
  return { calendarId: `mock_cal_${crypto.randomUUID()}` };
}
