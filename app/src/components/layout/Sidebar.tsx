import type { LucideIcon } from "lucide-react";
import { Plus } from "lucide-react";
import { clsx } from "clsx";

export interface NavItem<T extends string = string> {
  id: T;
  label: string;
  icon: LucideIcon;
}

interface SidebarProps<T extends string> {
  activePage: T;
  navItems: NavItem<T>[];
  utilityItems: Array<{
    label: string;
    icon: LucideIcon;
  }>;
  setActivePage: (page: T) => void;
}

export function Sidebar<T extends string>({
  activePage,
  navItems,
  utilityItems,
  setActivePage,
}: SidebarProps<T>) {
  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-[260px] flex-col border-r border-border-subtle bg-background">
      <div className="px-6 pb-5 pt-7">
        <h1 className="text-[31px] font-extrabold leading-9 text-primary">
          Luminous
          <br />
          Scheduler
        </h1>
        <p className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-secondary">
          Home Shopping Ops
        </p>
      </div>

      <button
        className="mx-6 mb-7 flex h-12 items-center justify-center gap-2 rounded bg-primary-action px-4 text-sm font-bold text-white shadow-soft transition hover:bg-primary active:scale-[0.99]"
        onClick={() => setActivePage("create" as T)}
        type="button"
      >
        <Plus size={19} strokeWidth={2.5} />
        신규 일정 등록
      </button>

      <nav className="flex-1 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.id === activePage;

          return (
            <button
              className={clsx(
                "relative flex h-12 w-full items-center gap-3 px-6 text-left text-sm font-semibold transition",
                isActive
                  ? "bg-primary-soft text-primary"
                  : "text-secondary hover:bg-surface-container-low hover:text-text-heading",
              )}
              key={item.id}
              onClick={() => setActivePage(item.id)}
              type="button"
            >
              {isActive ? <span className="absolute left-0 h-full w-1 bg-primary" /> : null}
              <Icon size={21} strokeWidth={1.9} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="border-t border-border-subtle px-4 py-5">
        {utilityItems.map((item) => {
          const Icon = item.icon;

          return (
            <button
              className="flex h-11 w-full items-center gap-3 rounded px-3 text-left text-sm font-medium text-secondary transition hover:bg-surface-container-low hover:text-text-heading"
              key={item.label}
              type="button"
            >
              <Icon size={20} strokeWidth={1.8} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}

