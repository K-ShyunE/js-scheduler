import { CalendarDays, LogIn, Mail, Radio, KeyRound, ShieldCheck } from "lucide-react";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";

interface LoginPageProps {
  errorMessage?: string;
  isLoading: boolean;
  onDevLogin: () => Promise<void>;
  onGoogleLogin: () => void;
}

export function LoginPage({ errorMessage, isLoading, onDevLogin, onGoogleLogin }: LoginPageProps) {
  return (
    <main className="grid min-h-screen place-items-center bg-surface-main px-6">
      <section className="w-full max-w-[460px]">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-border-subtle">
            <img src="/logo.png" alt="On-Air Planner Logo" className="h-full w-full object-cover" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-text-heading mb-3">
            온에어 플래너
          </h1>
          <p className="mt-3 text-sm font-semibold uppercase tracking-[0.18em] text-secondary">
            Home Shopping Ops
          </p>
        </div>

        <Card className="p-8 text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-lg bg-primary-soft text-primary">
            <KeyRound size={30} />
          </div>
          <h2 className="mt-6 text-2xl font-extrabold">Google 계정으로 시작</h2>
          <p className="mt-3 text-sm leading-6 text-secondary">
            실제 배포에서는 허용된 Google 계정만 앱에 접근할 수 있습니다. 현재는
            Google OAuth 전 단계라 로컬 개발 로그인으로 세션 흐름을 확인합니다.
          </p>

          {errorMessage ? (
            <p className="mt-5 rounded border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-error">
              {errorMessage}
            </p>
          ) : null}

          <Button className="mt-6 w-full" disabled={isLoading} onClick={onGoogleLogin}>
            <ShieldCheck size={18} />
            {isLoading ? "확인 중" : "Google 계정으로 계속하기"}
          </Button>
          <Button className="mt-3 w-full" disabled={isLoading} onClick={onDevLogin} variant="secondary">
            로컬 개발 로그인
          </Button>
          
          <button
            type="button"
            onClick={() => {
              window.location.href = "/api/auth/google/start?force=true";
            }}
            className="mt-4 text-[11px] text-secondary/70 underline underline-offset-4 hover:text-primary transition-colors block w-full text-center"
          >
            DB 초기화로 인해 동기화 오류가 발생하나요? 강제 재연동하기
          </button>
        </Card>
      </section>
    </main>
  );
}
