import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Sidebar, type NavItem } from "./Sidebar";
import { TopBar } from "./TopBar";
import type { User } from "../../types/domain";

interface AppShellProps<T extends string> {
  activePage: T;
  children: ReactNode;
  navItems: NavItem<T>[];
  query: string;
  setActivePage: (page: T) => void;
  setQuery: (query: string) => void;
  user: User | null;
  utilityItems: Array<{
    label: string;
    icon: LucideIcon;
  }>;
}

export function AppShell<T extends string>({
  activePage,
  children,
  navItems,
  query,
  setActivePage,
  setQuery,
  user,
  utilityItems,
}: AppShellProps<T>) {
  return (
    <div className="min-h-screen bg-surface-main text-text-heading">
      <Sidebar
        activePage={activePage}
        navItems={navItems}
        setActivePage={setActivePage}
        utilityItems={utilityItems}
      />
      <div className="ml-[260px] min-h-screen">
        <TopBar query={query} setQuery={setQuery} user={user} />
        <main className="mx-auto max-w-[1480px] px-8 py-8">{children}</main>
      </div>
    </div>
  );
}

