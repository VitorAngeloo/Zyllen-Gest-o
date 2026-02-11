"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@web/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@web/components/ui/card";
import { Input } from "@web/components/ui/input";
import { Button } from "@web/components/ui/button";
import { Label } from "@web/components/ui/label";
import { toast } from "sonner";
import { Eye, EyeOff, LogIn } from "lucide-react";

export default function LoginPage() {
  const { login, user, isLoading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  // Redirect if already logged in
  if (!isLoading && user) {
    router.replace("/dashboard");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success("Login realizado com sucesso!");
      router.push("/dashboard");
    } catch (err: any) {
      toast.error(err.message || "Credenciais inválidas");
    } finally {
      setLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--zyllen-bg-dark)]">
        <div className="animate-pulse flex items-center gap-3">
          <div className="size-10 rounded-xl bg-[var(--zyllen-highlight)] animate-bounce" />
          <span className="text-white text-lg font-semibold">Carregando...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--zyllen-bg-dark)] p-4">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-[var(--zyllen-highlight)]/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-[var(--zyllen-highlight)]/3 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="flex items-center justify-center size-12 rounded-xl bg-[var(--zyllen-highlight)] shadow-lg shadow-[var(--zyllen-highlight)]/25">
            <span className="font-extrabold text-xl text-[var(--zyllen-bg)]">Z</span>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Zyllen <span className="text-[var(--zyllen-highlight)]">Gestão</span>
          </h1>
        </div>

        <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)] shadow-2xl">
          <CardHeader className="text-center">
            <CardTitle className="text-xl text-white">Bem-vindo de volta</CardTitle>
            <CardDescription className="text-[var(--zyllen-muted)]">
              Entre com suas credenciais para acessar o sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label className="text-[var(--zyllen-muted)]">Email</Label>
                <Input
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white placeholder:text-[var(--zyllen-muted)]/50 focus-visible:ring-[var(--zyllen-highlight)]/30 focus-visible:border-[var(--zyllen-highlight)]"
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[var(--zyllen-muted)]">Senha</Label>
                <div className="relative">
                  <Input
                    type={showPass ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white placeholder:text-[var(--zyllen-muted)]/50 focus-visible:ring-[var(--zyllen-highlight)]/30 focus-visible:border-[var(--zyllen-highlight)] pr-10"
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
                className="w-full h-11 text-base"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="size-4 border-2 border-[var(--zyllen-bg)] border-t-transparent rounded-full animate-spin" />
                    Entrando...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <LogIn size={18} />
                    Entrar
                  </span>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-[var(--zyllen-muted)]/60 mt-6">
          Zyllen Gestão © 2026 · Todos os direitos reservados
        </p>
      </div>
    </div>
  );
}
