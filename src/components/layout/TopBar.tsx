import { Bell, Search, ShieldCheck } from "lucide-react";
import type { User } from "../../types/domain";

interface TopBarProps {
  query: string;
  setQuery: (value: string) => void;
  user: User | null;
}

export function TopBar({ query, setQuery, user }: TopBarProps) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border-subtle bg-surface-card px-8">
      <label className="relative w-full max-w-[440px]">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-secondary"
          size={20}
        />
        <input
          className="h-11 w-full rounded border border-border-subtle bg-surface-container-low pl-10 pr-4 text-sm text-text-heading outline-none transition placeholder:text-secondary focus:border-primary-action focus:bg-white focus:ring-4 focus:ring-primary-action/10"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="상품명, 업체, 채널 검색..."
          value={query}
        />
      </label>

      <div className="flex items-center gap-4">
        {user?.googleEmail ? (
          <div className="hidden items-center gap-2 rounded-full bg-tertiary-soft px-3 py-2 text-xs font-bold text-tertiary md:flex">
            <ShieldCheck size={16} />
            Google 연동 완료
          </div>
        ) : (
          <div className="hidden items-center gap-2 rounded-full bg-red-50 px-3 py-2 text-xs font-bold text-error md:flex border border-red-100">
            <ShieldCheck size={16} />
            Google 연동 준비
          </div>
        )}
        <button
          aria-label="알림"
          className="grid h-10 w-10 place-items-center rounded-full text-secondary transition hover:bg-surface-container-low hover:text-text-heading"
          type="button"
        >
          <Bell size={20} />
        </button>
        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border-subtle bg-primary text-sm font-bold text-white">
          {user?.name.slice(0, 1) ?? "?"}
        </div>
      </div>
    </header>
  );
}

