import { Trash2, UserPlus, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "../components/ui/Button";

interface AllowedUser {
  email: string;
  added_by: string;
  memo: string;
  created_at: string;
}

interface UserManagementPageProps {
  onLogout?: () => void;
}

export function UserManagementPage({ onLogout }: UserManagementPageProps) {
  const [users, setUsers] = useState<AllowedUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newEmail, setNewEmail] = useState("");
  const [newMemo, setNewMemo] = useState("");

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/users");
      if (!response.ok) throw new Error("사용자 목록을 불러오지 못했습니다.");
      const { data } = await response.json();
      setUsers(data);
    } catch (error) {
      console.error(error);
      alert("사용자 목록을 불러오는 데 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail) return;

    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newEmail, memo: newMemo }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || "사용자 추가 실패");
      }

      setNewEmail("");
      setNewMemo("");
      fetchUsers();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleDeleteUser = async (email: string) => {
    if (!confirm(`${email} 사용자를 삭제하시겠습니까?\n이후 해당 계정으로 로그인할 수 없습니다.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/users/${encodeURIComponent(email)}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || "사용자 삭제 실패");
      }

      fetchUsers();
    } catch (error: any) {
      alert(error.message);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8 animate-fade-in">
      <header className="mb-8">
        <div className="flex items-center gap-3 text-primary">
          <Users size={28} strokeWidth={2.5} />
          <h1 className="text-3xl font-extrabold tracking-tight">사용자 권한 관리</h1>
        </div>
        <p className="mt-3 text-secondary text-base">
          시스템에 접속할 수 있는 사용자의 구글 계정(이메일)을 관리합니다.
        </p>
      </header>

      {/* Add User Section */}
      <section className="rounded-xl border border-border-subtle bg-surface-container-low p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-bold text-text-heading">새 사용자 허용</h2>
        <form onSubmit={handleAddUser} className="flex gap-4 items-end">
          <div className="flex-1 space-y-2">
            <label className="text-sm font-semibold text-secondary">구글 이메일</label>
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="example@gmail.com"
              className="w-full rounded-md border border-border-subtle bg-background px-4 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
              required
            />
          </div>
          <div className="flex-1 space-y-2">
            <label className="text-sm font-semibold text-secondary">메모 (이름/직책 등)</label>
            <input
              type="text"
              value={newMemo}
              onChange={(e) => setNewMemo(e.target.value)}
              placeholder="영업팀 홍길동 대리"
              className="w-full rounded-md border border-border-subtle bg-background px-4 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
          <Button type="submit" variant="primary" icon={<UserPlus size={18} />}>
            허용 추가
          </Button>
        </form>
      </section>

      {/* User List Section */}
      <section className="rounded-xl border border-border-subtle bg-background shadow-sm overflow-hidden">
        <div className="border-b border-border-subtle bg-surface-container-low px-6 py-4">
          <h2 className="text-lg font-bold text-text-heading">접근 허용된 사용자 목록</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-text-body">
            <thead className="bg-surface-main text-secondary">
              <tr>
                <th className="px-6 py-4 font-semibold">이메일</th>
                <th className="px-6 py-4 font-semibold">메모</th>
                <th className="px-6 py-4 font-semibold text-center w-24">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {isLoading ? (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center text-secondary">
                    로딩 중...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center text-secondary">
                    등록된 사용자가 없습니다.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.email} className="hover:bg-surface-container-lowest transition">
                    <td className="px-6 py-4 font-medium text-text-heading">{user.email}</td>
                    <td className="px-6 py-4">{user.memo || <span className="text-secondary/50">-</span>}</td>
                    <td className="px-6 py-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleDeleteUser(user.email)}
                        className="rounded p-2 text-status-error hover:bg-status-error/10 transition"
                        title="권한 회수"
                      >
                        <Trash2 size={18} strokeWidth={2} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
