import { apiGet, apiPost, apiPut } from "./http";
import type {
  Channel,
  Partner,
  ScheduleDraft,
  ScheduleView,
  SyncLog,
  User,
} from "../../types/domain";

export async function getSession(): Promise<User> {
  return apiGet<User>("/api/session");
}

export async function devLogin(): Promise<User> {
  return apiPost<User>("/api/auth/dev-login", {});
}

export function startGoogleLogin() {
  window.location.assign("/api/auth/google/start");
}

export async function logout(): Promise<void> {
  await apiPost<{ ok: boolean }>("/api/auth/logout", {});
}

export async function listPartners(): Promise<Partner[]> {
  return apiGet<Partner[]>("/api/partners");
}

export async function listChannels(): Promise<Channel[]> {
  return apiGet<Channel[]>("/api/channels");
}

export async function listSchedules(query = ""): Promise<ScheduleView[]> {
  const search = new URLSearchParams();

  if (query.trim()) {
    search.set("query", query.trim());
  }

  return apiGet<ScheduleView[]>(`/api/schedules${search.size ? `?${search}` : ""}`);
}

export async function createSchedule(input: ScheduleDraft): Promise<ScheduleView> {
  return apiPost<ScheduleView>("/api/schedules", input);
}

export async function updateSchedule(input: ScheduleDraft & { id: string }): Promise<ScheduleView> {
  return apiPut<ScheduleView>("/api/schedules", input);
}

export async function listSyncLogs(): Promise<SyncLog[]> {
  return apiGet<SyncLog[]>("/api/sync-logs");
}

export async function getGoogleSheets(folderId?: string): Promise<{ id: string; name: string; mimeType: string }[]> {
  const search = new URLSearchParams();
  if (folderId) {
    search.set("folderId", folderId);
  }
  return apiGet<{ id: string; name: string; mimeType: string }[]>(`/api/google/sheets${search.size ? `?${search}` : ""}`);
}

export async function getGoogleCalendars(): Promise<{ id: string; summary: string; backgroundColor?: string }[]> {
  return apiGet<{ id: string; summary: string; backgroundColor?: string }[]>("/api/google/calendars");
}

export async function saveGoogleSettings(settings: {
  spreadsheetId: string | null;
  calendarId: string | null;
  shipmentCalendarId: string | null;
}): Promise<{ success: boolean }> {
  return apiPost<{ success: boolean }>("/api/google/settings", settings);
}

export async function createGoogleSheet(title: string): Promise<{ spreadsheetId: string }> {
  return apiPost<{ spreadsheetId: string }>("/api/google/sheets/create", { title });
}

export async function createGoogleCalendar(summary: string): Promise<{ calendarId: string }> {
  return apiPost<{ calendarId: string }>("/api/google/calendars/create", { summary });
}

export async function createChannel(name: string, alias?: string): Promise<Channel> {
  return apiPost<Channel>("/api/channels", { name, alias });
}

export async function updateChannel(
  id: string,
  updates: { name?: string; alias?: string; isActive?: boolean; displayOrder?: number }
): Promise<Channel> {
  return apiPut<Channel>("/api/channels", { id, ...updates });
}

export async function createPartner(name: string, alias?: string): Promise<Partner> {
  return apiPost<Partner>("/api/partners", { name, contactName: alias });
}

export async function updatePartner(id: string, updates: { name?: string; alias?: string; deletedAt?: null }): Promise<Partner> {
  const { alias, ...rest } = updates;
  return apiPut<Partner>("/api/partners", { id, contactName: alias, ...rest });
}

export async function deleteChannel(id: string): Promise<{ message: string; softDeleted: boolean }> {
  const response = await fetch(`/api/channels/${id}`, { method: "DELETE" });
  if (!response.ok) throw new Error("채널 삭제에 실패했습니다.");
  const payload = await response.json() as any;
  if (payload.error) throw new Error(payload.error.message || "채널 삭제에 실패했습니다.");
  return payload.data || payload;
}

export async function deletePartner(id: string): Promise<{ message: string; softDeleted: boolean }> {
  const response = await fetch(`/api/partners/${id}`, { method: "DELETE" });
  if (!response.ok) throw new Error("파트너 삭제에 실패했습니다.");
  const payload = await response.json() as any;
  if (payload.error) throw new Error(payload.error.message || "파트너 삭제에 실패했습니다.");
  return payload.data || payload;
}

export async function restoreChannel(id: string): Promise<Channel> {
  return apiPut<Channel>("/api/channels", { id, deletedAt: null });
}

export async function restorePartner(id: string): Promise<Partner> {
  return apiPut<Partner>("/api/partners", { id, deletedAt: null });
}
