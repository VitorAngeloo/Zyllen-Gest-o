"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Building2, Eye, EyeOff, HardHat, LogIn, Users } from "lucide-react";
import { toast } from "sonner";

import { PartnershipLogos } from "@web/components/brand/zyllen-logo";
import { Button } from "@web/components/ui/button";
import { Input } from "@web/components/ui/input";
import { Label } from "@web/components/ui/label";
import { LoginBrandHero } from "@web/features/auth/components/login-brand-hero";
import { useAuth, type UserType } from "@web/features/auth/context/auth-context";
import { LOGIN_COPY } from "@web/lib/brand-voice";

const LOGIN_TABS: { key: UserType; label: string; icon: React.ReactNode; description: string }[] = [
  { key: "internal", label: LOGIN_COPY.tabs.internal.label, icon: <Users size={16} />, description: LOGIN_COPY.tabs.internal.description },
  { key: "external", label: LOGIN_COPY.tabs.external.label, icon: <Building2 size={16} />, description: LOGIN_COPY.tabs.external.description },
  { key: "contractor", label: LOGIN_COPY.tabs.contractor.label, icon: <HardHat size={16} />, description: LOGIN_COPY.tabs.contractor.description },
];

const TYPE_MAP: Record<string, UserType> = {
  client: "external",
  contractor: "contractor",
  internal: "internal",
  external: "external",
};

const REDIRECT_MAP: Record<UserType, string> = {
  internal: "/dashboard",
  external: "/portal-cliente",
  contractor: "/portal-terceirizado",
};

function LoginPageInner() {
  const { login, user, isLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loginType, setLoginType] = useState<UserType>("internal");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const typeParam = searchParams.get("type");
    if (typeParam && TYPE_MAP[typeParam]) setLoginType(TYPE_MAP[typeParam]);
  }, [searchParams]);

  useEffect(() => {
    if (!isLoading && user) {
      router.replace(REDIRECT_MAP[user.type] || "/dashboard");
    }
  }, [isLoading, user, router]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    try {
      const type = await login(email, password, loginType);
      toast.success(LOGIN_COPY.successToast);
      router.push(REDIRECT_MAP[type] || "/dashboard");
    } catch (error: any) {
      toast.error(error.message || LOGIN_COPY.errorToast);
    } finally {
      setLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--zyllen-bg-dark)]">
        <div className="flex animate-pulse flex-col items-center gap-4">
          <PartnershipLogos height={56} variant="horizontal" />
          <div className="h-[2px] w-32 bg-[var(--zyllen-highlight)] clip-angle-r" />
        </div>
      </div>
    );
  }

  const activeTab = LOGIN_TABS.find((tab) => tab.key === loginType)!;

  return (
    <main className="min-h-screen bg-[var(--zyllen-bg-dark)] lg:grid lg:grid-cols-[minmax(34rem,1.16fr)_minmax(30rem,0.84fr)]">
      <LoginBrandHero />

      <section className="flex min-h-screen flex-col">
        <LoginBrandHero compact />

        <div className="flex flex-1 items-center justify-center px-5 py-10 sm:px-10 lg:px-12 xl:px-16">
          <div className="w-full max-w-md">
            <div className="mb-9 border-b border-white/10 pb-6">
              <p className="mb-7 text-[9px] font-semibold uppercase tracking-[0.2em] text-white/40">Zyllen Gestão</p>
              <h1 className="font-brand text-3xl font-medium leading-tight tracking-[-0.035em] text-white">{LOGIN_COPY.heading}</h1>
              <p className="mt-2 text-sm leading-relaxed text-[var(--zyllen-muted)]">{LOGIN_COPY.subtitle}</p>
            </div>

            <div className="space-y-7">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">Escolha seu perfil</p>
              <div role="tablist" aria-label="Tipo de acesso" className="grid grid-cols-3 border-b border-white/10">
                {LOGIN_TABS.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setLoginType(tab.key)}
                    role="tab"
                    aria-selected={loginType === tab.key}
                    className={`-mb-px flex items-center justify-center gap-2 border-b-2 px-2 py-3.5 text-xs font-medium transition-colors ${
                      loginType === tab.key
                        ? "border-[var(--zyllen-highlight)] text-white"
                        : "border-transparent text-[var(--zyllen-muted)] hover:border-white/20 hover:text-white"
                    }`}
                  >
                    {tab.icon}
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-[auto_1fr] items-start gap-3 border-y border-white/10 py-4">
                <span className="flex size-8 items-center justify-center border border-[var(--zyllen-highlight)]/25 text-[var(--zyllen-highlight)]" aria-hidden="true">
                  {activeTab.icon}
                </span>
                <div>
                  <p className="text-xs font-semibold text-white">Acesso de {activeTab.label.toLowerCase()}</p>
                  <p className="mt-1 text-xs leading-relaxed text-[var(--zyllen-muted)]">{activeTab.description}</p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-[var(--zyllen-muted)]">Email</Label>
                  <Input
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                    className="h-12 rounded-md border-[var(--zyllen-border)] bg-[var(--zyllen-surface)] text-white placeholder:text-[var(--zyllen-muted)]/40 focus-visible:border-[var(--zyllen-highlight)] focus-visible:ring-[var(--zyllen-highlight)]/30"
                    autoComplete="email"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-[var(--zyllen-muted)]">Senha</Label>
                  <div className="relative">
                    <Input
                      type={showPass ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      required
                      className="h-12 rounded-md border-[var(--zyllen-border)] bg-[var(--zyllen-surface)] pr-10 text-white placeholder:text-[var(--zyllen-muted)]/40 focus-visible:border-[var(--zyllen-highlight)] focus-visible:ring-[var(--zyllen-highlight)]/30"
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--zyllen-muted)] transition-colors hover:text-white"
                      aria-label={showPass ? "Ocultar senha" : "Mostrar senha"}
                    >
                      {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <Button type="submit" variant="highlight" className="h-12 w-full rounded-md text-base" disabled={loading}>
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="size-4 animate-spin rounded-full border-2 border-[var(--zyllen-bg-dark)] border-t-transparent" />
                      Entrando...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2"><LogIn size={18} />{LOGIN_COPY.button}</span>
                  )}
                </Button>
              </form>

              {loginType !== "internal" && (
                <p className="border-t border-white/10 pt-5 text-sm text-[var(--zyllen-muted)]">
                  {LOGIN_COPY.register}{" "}
                  <Link
                    href={`/cadastro${loginType === "contractor" ? "?tab=contractor" : ""}`}
                    className="font-medium text-[var(--zyllen-highlight)] hover:underline"
                  >
                    <span className="inline-flex items-center gap-1">{LOGIN_COPY.registerLink}<ArrowRight size={13} /></span>
                  </Link>
                </p>
              )}
            </div>
          </div>
        </div>
        <p className="border-t border-white/10 px-5 py-4 text-center text-[10px] uppercase tracking-[0.14em] text-white/30 lg:hidden">
          Zyllen Systems & Grupo Skyline © 2026
        </p>
      </section>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-[var(--zyllen-bg-dark)]">
        <div className="flex animate-pulse flex-col items-center gap-4">
          <div className="size-16 rounded-full bg-[var(--zyllen-highlight)]/20" />
          <div className="h-[2px] w-24 bg-[var(--zyllen-highlight)] clip-angle-r" />
        </div>
      </div>
    }>
      <LoginPageInner />
    </Suspense>
  );
}
