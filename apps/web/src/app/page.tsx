"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth, type UserType } from "@web/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@web/components/ui/card";
import { Input } from "@web/components/ui/input";
import { Button } from "@web/components/ui/button";
import { Label } from "@web/components/ui/label";
import { toast } from "sonner";
import { Eye, EyeOff, LogIn, Building2, HardHat, Users } from "lucide-react";
import Link from "next/link";
import { ZyllenLogoFull, ZyllenTextLogo } from "@web/components/brand/zyllen-logo";
import { DiagonalPattern, ZPattern } from "@web/components/brand/geometric-elements";
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

  // Pre-select tab from query param (e.g. ?type=client from registration redirect)
  useEffect(() => {
    const typeParam = searchParams.get("type");
    if (typeParam && TYPE_MAP[typeParam]) {
      setLoginType(TYPE_MAP[typeParam]);
    }
  }, [searchParams]);

  // Redirect if already logged in
  useEffect(() => {
    if (!isLoading && user) {
      router.replace(REDIRECT_MAP[user.type] || "/dashboard");
    }
  }, [isLoading, user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const type = await login(email, password, loginType);
      toast.success(LOGIN_COPY.successToast);
      router.push(REDIRECT_MAP[type] || "/dashboard");
    } catch (err: any) {
      toast.error(err.message || LOGIN_COPY.errorToast);
    } finally {
      setLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--zyllen-bg-dark)]">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <ZyllenLogoFull height={64} />
          <div className="h-[2px] w-32 bg-[var(--zyllen-highlight)] clip-angle-r animate-pulse" />
        </div>
      </div>
    );
  }

  const activeTab = LOGIN_TABS.find((t) => t.key === loginType)!;

  return (
    <div className="min-h-screen flex bg-[var(--zyllen-bg-dark)]">
      {/* Left panel — Brand hero (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-[55%] relative overflow-hidden bg-[var(--zyllen-bg)]">
        {/* Diagonal pattern background */}
        <DiagonalPattern opacity={0.05} spacing={20} />

        {/* Z geometric pattern */}
        <div className="absolute -bottom-20 -right-20">
          <ZPattern size={500} opacity={0.06} />
        </div>
        <div className="absolute top-20 -left-10">
          <ZPattern size={300} opacity={0.04} />
        </div>

        {/* Accent glow */}
        <div className="absolute top-1/4 left-1/3 w-96 h-96 rounded-full bg-[var(--zyllen-highlight)]/5 blur-[120px]" />

        {/* Brand content */}
        <div className="relative z-10 flex flex-col justify-between p-12 xl:p-16 w-full">
          {/* Logo */}
          <div>
            <ZyllenLogoFull height={70} />
          </div>

          {/* Tagline */}
          <div className="max-w-lg">
            <h2 className="font-brand text-4xl xl:text-5xl font-medium text-white leading-tight tracking-wide mb-4">
              Experiências que{" "}
              <span className="text-[var(--zyllen-highlight)]">transformam</span>
            </h2>
            <div className="h-[2px] w-24 bg-[var(--zyllen-highlight)] clip-angle-r mb-6" />
            <p className="text-[var(--zyllen-muted)] text-lg leading-relaxed">
              {LOGIN_COPY.hero.description}
            </p>
          </div>

          {/* Footer info */}
          <div className="flex items-center gap-6 text-xs text-[var(--zyllen-muted)]/60">
            <span>Zyllen Systems © 2026</span>
            <div className="h-3 w-px bg-[var(--zyllen-border)]" />
            <span>Todos os direitos reservados</span>
          </div>
        </div>
      </div>

      {/* Right panel — Login form */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-8 relative">
        {/* Mobile logo (visible only on small screens) */}
        <div className="lg:hidden flex flex-col items-center gap-4 mb-8">
          <ZyllenLogoFull height={56} />
          <div className="h-[2px] w-16 bg-[var(--zyllen-highlight)] clip-angle-r" />
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h1 className="font-brand text-2xl font-medium text-white tracking-wide mb-2">
              {LOGIN_COPY.heading}
            </h1>
            <p className="text-[var(--zyllen-muted)] text-sm">
              {LOGIN_COPY.subtitle}
            </p>
          </div>

          <div className="space-y-6">
            {/* User type tabs */}
            <div className="grid grid-cols-3 gap-2">
              {LOGIN_TABS.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setLoginType(tab.key)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-md border transition-all text-xs font-medium ${
                    loginType === tab.key
                      ? "bg-[var(--zyllen-highlight)]/10 border-[var(--zyllen-highlight)] text-[var(--zyllen-highlight)]"
                      : "bg-[var(--zyllen-surface)] border-[var(--zyllen-border)] text-[var(--zyllen-muted)] hover:border-[var(--zyllen-highlight)]/30 hover:text-white"
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            <p className="text-center text-xs text-[var(--zyllen-muted)]">
              {activeTab.description}
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label className="text-[var(--zyllen-muted)] text-xs uppercase tracking-wider">Email</Label>
                <Input
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-[var(--zyllen-surface)] border-[var(--zyllen-border)] text-white placeholder:text-[var(--zyllen-muted)]/40 focus-visible:ring-[var(--zyllen-highlight)]/30 focus-visible:border-[var(--zyllen-highlight)] rounded-md h-11"
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[var(--zyllen-muted)] text-xs uppercase tracking-wider">Senha</Label>
                <div className="relative">
                  <Input
                    type={showPass ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="bg-[var(--zyllen-surface)] border-[var(--zyllen-border)] text-white placeholder:text-[var(--zyllen-muted)]/40 focus-visible:ring-[var(--zyllen-highlight)]/30 focus-visible:border-[var(--zyllen-highlight)] rounded-md h-11 pr-10"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--zyllen-muted)] hover:text-white transition-colors"
                  >
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <Button
                type="submit"
                variant="highlight"
                className="w-full h-11 text-base rounded-md"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="size-4 border-2 border-[var(--zyllen-bg-dark)] border-t-transparent rounded-full animate-spin" />
                    Entrando...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <LogIn size={18} />
                    {LOGIN_COPY.button}
                  </span>
                )}
              </Button>
            </form>

            {/* Registration link — only for client/contractor */}
            {loginType !== "internal" && (
              <p className="text-center text-sm text-[var(--zyllen-muted)]">
                {LOGIN_COPY.register}{" "}
                <Link
                  href={`/cadastro${loginType === "contractor" ? "?tab=contractor" : ""}`}
                  className="text-[var(--zyllen-highlight)] hover:underline font-medium"
                >
                  {LOGIN_COPY.registerLink}
                </Link>
              </p>
            )}
          </div>
        </div>

        {/* Mobile footer */}
        <p className="lg:hidden text-center text-xs text-[var(--zyllen-muted)]/40 mt-10">
          Zyllen Systems © 2026
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[var(--zyllen-bg-dark)]">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="size-16 rounded-full bg-[var(--zyllen-highlight)]/20" />
          <div className="h-[2px] w-24 bg-[var(--zyllen-highlight)] clip-angle-r" />
        </div>
      </div>
    }>
      <LoginPageInner />
    </Suspense>
  );
}