import * as mockApi from "../mockApi";
import * as realApi from "./realApi";

// Vite 개발 서버만 띄운 상태에서는 Cloudflare Functions가 실행되지 않는다.
// 그래서 npm run dev 중에만 mock 전환을 허용하고, 빌드된 Pages 환경에서는
// .env 값과 무관하게 실제 /api/* Functions를 사용한다.
const apiMode = "real";
const api = apiMode === "real" ? realApi : mockApi;

export const getSession = api.getSession;
export const devLogin = api.devLogin;
export const startGoogleLogin = api.startGoogleLogin;
export const logout = api.logout;
export const listPartners = api.listPartners;
export const listChannels = api.listChannels;
export const listSchedules = api.listSchedules;
export const createSchedule = api.createSchedule;
export const listSyncLogs = api.listSyncLogs;
export const getGoogleSheets = api.getGoogleSheets;
export const getGoogleCalendars = api.getGoogleCalendars;
export const saveGoogleSettings = api.saveGoogleSettings;
export const createGoogleSheet = api.createGoogleSheet;
export const createGoogleCalendar = api.createGoogleCalendar;
