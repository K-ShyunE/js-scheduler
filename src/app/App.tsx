import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarPlus,
  LayoutDashboard,
  Link2,
  PackageSearch,
  Search,
  Settings,
  Store,
  UserCircle,
} from "lucide-react";
import { AppShell } from "../components/layout/AppShell";
import type { NavItem } from "../components/layout/Sidebar";
import { AccountStatusPage } from "../pages/AccountStatusPage";
import { DashboardPage } from "../pages/DashboardPage";
import { LoginPage } from "../pages/LoginPage";
import { PartnersPage } from "../pages/PartnersPage";
import { ScheduleFormPage } from "../pages/ScheduleFormPage";
import { ScheduleListPage } from "../pages/ScheduleListPage";
import {
  devLogin,
  getSession,
  listChannels,
  listPartners,
  listSchedules,
  listSyncLogs,
  logout,
  startGoogleLogin,
} from "../lib/api";
import type { Channel, Partner, ScheduleView, SyncLog, User } from "../types/domain";

export type AppPage = "dashboard" | "create" | "search" | "partners" | "account";

const navItems: NavItem<AppPage>[] = [
  { id: "dashboard", label: "대시보드", icon: LayoutDashboard },
  { id: "create", label: "일정 등록", icon: CalendarPlus },
  { id: "search", label: "검색 목록", icon: Search },
  { id: "partners", label: "홈쇼핑 업체 관리", icon: Store },
  { id: "account", label: "계정 상태", icon: UserCircle },
];

export function App() {
  const getInitialPage = (): AppPage => {
    const hash = window.location.hash.replace("#/", "").replace("#", "");
    if (!hash) return "create";
    const validPages: AppPage[] = ["dashboard", "create", "search", "partners", "account"];
    return validPages.includes(hash as AppPage) ? (hash as AppPage) : "create";
  };

  const [activePage, setActivePage] = useState<AppPage>(getInitialPage);
  const [query, setQuery] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [schedules, setSchedules] = useState<ScheduleView[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [authStatus, setAuthStatus] = useState<"checking" | "authenticated" | "unauthenticated">(
    "checking",
  );
  const [authError, setAuthError] = useState<string | undefined>();

  const refreshData = useCallback(async (nextQuery: string) => {
    const [nextSchedules, nextLogs] = await Promise.all([
      listSchedules(nextQuery),
      listSyncLogs(),
    ]);

    setSchedules(nextSchedules);
    setSyncLogs(nextLogs);
  }, []);

  const loadInitialData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [nextUser, nextPartners, nextChannels, nextSchedules, nextLogs] =
        await Promise.all([
          getSession(),
          listPartners(),
          listChannels(),
          listSchedules(),
          listSyncLogs(),
        ]);

      setUser(nextUser);
      setPartners(nextPartners);
      setChannels(nextChannels);
      setSchedules(nextSchedules);
      setSyncLogs(nextLogs);
      setAuthStatus("authenticated");
      setAuthError(undefined);
    } catch (error) {
      const authError = new URLSearchParams(window.location.search).get("auth_error");
      setUser(null);
      setPartners([]);
      setChannels([]);
      setSchedules([]);
      setSyncLogs([]);
      setAuthStatus("unauthenticated");
      setAuthError(authError || (error instanceof Error ? error.message : "로그인이 필요합니다."));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadInitialData();
  }, [loadInitialData]);

  // URL hash 와 activePage 동기화
  useEffect(() => {
    window.location.hash = `#/${activePage}`;
  }, [activePage]);

  // 브라우저 뒤로가기/앞으로가기 등으로 해시 바뀔 때 상태 반영
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace("#/", "").replace("#", "");
      const validPages: AppPage[] = ["dashboard", "create", "search", "partners", "account"];
      if (hash && validPages.includes(hash as AppPage) && hash !== activePage) {
        setActivePage(hash as AppPage);
      }
    };
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, [activePage]);

  useEffect(() => {
    if (authStatus !== "authenticated") {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      void refreshData(query);
    }, 180);

    return () => window.clearTimeout(timeoutId);
  }, [authStatus, query, refreshData]);

  async function handleDevLogin() {
    try {
      setIsLoading(true);
      await devLogin();
      await loadInitialData();
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "개발 로그인에 실패했습니다.");
      setAuthStatus("unauthenticated");
      setIsLoading(false);
    }
  }

  async function handleLogout() {
    await logout();
    setUser(null);
    setSchedules([]);
    setPartners([]);
    setChannels([]);
    setSyncLogs([]);
    setAuthStatus("unauthenticated");
  }

  const stats = useMemo(() => {
    const scheduledCount = schedules.filter((item) => item.status === "scheduled").length;
    const readyCount = schedules.filter((item) => item.status === "shipping_ready").length;
    const failedSyncCount = schedules.filter((item) => item.syncStatus === "sync_failed").length;

    return {
      total: schedules.length,
      scheduledCount,
      readyCount,
      failedSyncCount,
      syncHealth:
        failedSyncCount === 0 ? "정상" : `${failedSyncCount}건 확인 필요`,
    };
  }, [schedules]);

  const page = (() => {
    if (activePage === "dashboard") {
      return (
        <DashboardPage
          isLoading={isLoading}
          schedules={schedules}
          syncLogs={syncLogs}
          stats={stats}
          onCreate={() => setActivePage("create")}
        />
      );
    }

    if (activePage === "create") {
      return (
        <ScheduleFormPage
          channels={channels}
          partners={partners}
          onCreated={async () => {
            await refreshData("");
            setQuery("");
            setActivePage("search");
          }}
        />
      );
    }

    if (activePage === "search") {
      return <ScheduleListPage schedules={schedules} query={query} setQuery={setQuery} />;
    }

    if (activePage === "partners") {
      return <PartnersPage channels={channels} partners={partners} />;
    }

    return (
      <AccountStatusPage
        onGoogleLogin={startGoogleLogin}
        onLogout={handleLogout}
        user={user}
        syncLogs={syncLogs}
      />
    );
  })();

  if (authStatus !== "authenticated") {
    return (
      <LoginPage
        errorMessage={authStatus === "unauthenticated" ? authError : undefined}
        isLoading={isLoading}
        onDevLogin={handleDevLogin}
        onGoogleLogin={startGoogleLogin}
      />
    );
  }

  return (
    <AppShell
      activePage={activePage}
      navItems={navItems}
      query={query}
      setActivePage={setActivePage}
      setQuery={setQuery}
      user={user}
      utilityItems={[
        { label: "Google 연동", icon: Link2 },
        { label: "설정", icon: Settings },
        { label: "데이터 점검", icon: PackageSearch },
      ]}
    >
      {page}
    </AppShell>
  );
}
