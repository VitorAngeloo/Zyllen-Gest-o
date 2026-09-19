"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { apiClient } from "@web/lib/api-client";
import { Input } from "@web/components/ui/input";
import { Button } from "@web/components/ui/button";
import { Label } from "@web/components/ui/label";
import { Select, SelectOption } from "@web/components/ui/select";
import { StateCitySelector } from "@web/components/ui/state-city-selector";
import { toast } from "sonner";
import { ArrowLeft, Building2, Check, UserPlus, Wrench } from "lucide-react";
import { PartnershipLogos } from "@web/components/brand/zyllen-logo";

type Tab = "client" | "contractor";
interface CompanyOption { id: string; name: string; cnpj: string | null }
interface ProjectOption { id: string; name: string }

function CadastroPageInner() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [tab, setTab] = useState<Tab>("client");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const tabParam = searchParams.get("tab");
        if (tabParam === "contractor") setTab("contractor");
    }, [searchParams]);

    // ── Companies & Projects loaded from API ──
    const [companies, setCompanies] = useState<CompanyOption[]>([]);
    const [projects, setProjects] = useState<ProjectOption[]>([]);

    useEffect(() => {
        apiClient.get<{ data: CompanyOption[] }>("/clients/companies/search")
            .then((res) => setCompanies(res.data))
            .catch(() => {});
    }, []);

    // ── Client form ──
    const [clientForm, setClientForm] = useState({
        name: "", email: "", password: "", confirmPassword: "",
        phone: "", city: "", state: "", position: "", cpf: "",
        companyId: "", projectId: "", companyName: "", companyCnpj: "",
    });

    const isNewCompany = clientForm.companyId === "__new__";

    // Load projects when company changes
    useEffect(() => {
        if (clientForm.companyId && clientForm.companyId !== "__new__") {
            apiClient.get<{ data: ProjectOption[] }>(`/clients/companies/${clientForm.companyId}/projects-public`)
                .then((res) => setProjects(res.data))
                .catch(() => setProjects([]));
        } else {
            setProjects([]);
        }
        setClientForm((prev) => ({ ...prev, projectId: "" }));
    }, [clientForm.companyId]);

    // ── Contractor form ──
    const [contractorForm, setContractorForm] = useState({
        name: "", email: "", password: "", confirmPassword: "",
        phone: "", city: "", state: "", cpf: "",
    });

    const handleClientSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (clientForm.password !== clientForm.confirmPassword) {
            toast.error("As senhas não coincidem"); return;
        }
        setLoading(true);
        try {
            const { confirmPassword, ...data } = clientForm;
            // Strip empty strings and special values
            const payload: Record<string, any> = {};
            for (const [k, v] of Object.entries(data)) {
                if (v && v !== "__new__") payload[k] = v;
            }
            await apiClient.post("/register/client", payload);
            // Preserve any existing session and do not return to the login page,
            // which redirects authenticated users to their current account.
            router.replace("/cadastro/solicitacao-enviada");
        } catch (err: any) {
            toast.error(err.message || "Erro ao cadastrar");
        } finally {
            setLoading(false);
        }
    };

    const handleContractorSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (contractorForm.password !== contractorForm.confirmPassword) {
            toast.error("As senhas não coincidem"); return;
        }
        setLoading(true);
        try {
            const { confirmPassword, ...data } = contractorForm;
            const payload: Record<string, any> = {};
            for (const [k, v] of Object.entries(data)) {
                if (v) payload[k] = v;
            }
            await apiClient.post("/register/contractor", payload);
            toast.success("Cadastro realizado com sucesso! Faça login para acessar.");
            router.push("/?type=contractor");
        } catch (err: any) {
            toast.error(err.message || "Erro ao cadastrar");
        } finally {
            setLoading(false);
        }
    };

    const inputClass = "bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white placeholder:text-[var(--zyllen-muted)]/50 focus-visible:ring-[var(--zyllen-highlight)]/30 focus-visible:border-[var(--zyllen-highlight)]";

    const clientSteps = [
        "Preencha seus dados e identifique a empresa.",
        "A equipe responsável analisa a solicitação.",
        "Após a aprovação, o acesso ao portal é liberado.",
    ];
    const contractorSteps = [
        "Informe seus dados de contato e localização.",
        "Defina uma senha segura para o portal.",
        "Conclua o cadastro e acesse como parceiro.",
    ];
    const activeSteps = tab === "client" ? clientSteps : contractorSteps;

    return (
        <main className="min-h-screen bg-[var(--zyllen-bg-dark)]">
            <header className="border-b border-white/10 bg-[var(--zyllen-bg)]">
                <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-5 sm:px-8">
                    <PartnershipLogos height={48} variant="horizontal" />
                    <Link href="/" className="inline-flex items-center gap-2 text-xs font-medium text-[var(--zyllen-muted)] transition-colors hover:text-white">
                        <ArrowLeft size={14} /> Já tenho uma conta
                    </Link>
                </div>
            </header>

            <div className="mx-auto grid w-full max-w-7xl gap-12 px-5 py-10 sm:px-8 lg:grid-cols-[minmax(17rem,0.72fr)_minmax(34rem,1.28fr)] lg:py-16 xl:gap-20">
                <aside className="self-start lg:sticky lg:top-10">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--zyllen-highlight)]">Novo acesso</p>
                    <h1 className="mt-4 max-w-sm text-3xl font-semibold leading-tight tracking-[-0.03em] text-white sm:text-4xl">
                        Um cadastro claro, do início ao acesso.
                    </h1>
                    <p className="mt-5 max-w-md text-sm leading-7 text-[var(--zyllen-muted)]">
                        Escolha o seu contexto. As etapas e o destino da solicitação mudam conforme o tipo de vínculo com a Zyllen.
                    </p>

                    <ol className="mt-9 border-y border-white/10">
                        {activeSteps.map((step, index) => (
                            <li key={step} className="grid grid-cols-[2rem_1fr] gap-3 border-b border-white/10 py-4 last:border-b-0">
                                <span className="font-mono text-xs tabular-nums text-[var(--zyllen-highlight)]">0{index + 1}</span>
                                <span className="text-sm leading-relaxed text-[var(--zyllen-muted)]">{step}</span>
                            </li>
                        ))}
                    </ol>

                    <p className="mt-5 flex items-start gap-2 text-xs leading-relaxed text-white/45">
                        <Check size={14} className="mt-0.5 shrink-0 text-[var(--zyllen-highlight)]" />
                        Seus dados serão usados somente para identificar e organizar o acesso correto.
                    </p>
                </aside>

                <section className="min-w-0 border-t border-white/10 pt-7">
                    <div className="mb-7 flex items-start gap-3">
                        <UserPlus size={20} className="mt-0.5 shrink-0 text-[var(--zyllen-highlight)]" />
                        <div>
                            <h2 className="text-xl font-semibold text-white">Criar conta</h2>
                            <p className="mt-1 text-sm text-[var(--zyllen-muted)]">Selecione o tipo de cadastro e complete seus dados.</p>
                        </div>
                    </div>
                        {/* Tab selector */}
                        <div role="tablist" aria-label="Tipo de cadastro" className="mb-7 flex border-b border-white/10">
                            <button
                                type="button"
                                role="tab"
                                aria-selected={tab === "client"}
                                onClick={() => setTab("client")}
                                className={`-mb-px flex flex-1 items-center justify-center gap-2 border-b-2 py-2.5 text-sm font-medium transition-colors ${tab === "client"
                                    ? "border-[var(--zyllen-highlight)] text-white"
                                    : "border-transparent text-[var(--zyllen-muted)] hover:border-white/20 hover:text-white"
                                    }`}
                            >
                                <Building2 size={16} />
                                Cliente
                            </button>
                            <button
                                type="button"
                                role="tab"
                                aria-selected={tab === "contractor"}
                                onClick={() => setTab("contractor")}
                                className={`-mb-px flex flex-1 items-center justify-center gap-2 border-b-2 py-2.5 text-sm font-medium transition-colors ${tab === "contractor"
                                    ? "border-[var(--zyllen-highlight)] text-white"
                                    : "border-transparent text-[var(--zyllen-muted)] hover:border-white/20 hover:text-white"
                                    }`}
                            >
                                <Wrench size={16} />
                                Parceiro
                            </button>
                        </div>

                        {/* ═══ Client Registration Form ═══ */}
                        {tab === "client" && (
                            <form onSubmit={handleClientSubmit} className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-[var(--zyllen-muted)]">Nome Completo *</Label>
                                    <Input value={clientForm.name} onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })} required placeholder="Seu nome completo" className={inputClass} />
                                </div>

                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label className="text-[var(--zyllen-muted)]">Email *</Label>
                                        <Input type="email" value={clientForm.email} onChange={(e) => setClientForm({ ...clientForm, email: e.target.value })} required placeholder="seu@email.com" className={inputClass} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[var(--zyllen-muted)]">CPF</Label>
                                        <Input value={clientForm.cpf} onChange={(e) => setClientForm({ ...clientForm, cpf: e.target.value })} placeholder="000.000.000-00" className={inputClass} />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label className="text-[var(--zyllen-muted)]">Telefone</Label>
                                        <Input value={clientForm.phone} onChange={(e) => setClientForm({ ...clientForm, phone: e.target.value })} placeholder="(00) 00000-0000" className={inputClass} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[var(--zyllen-muted)]">Cargo / Função</Label>
                                        <Input value={clientForm.position} onChange={(e) => setClientForm({ ...clientForm, position: e.target.value })} placeholder="Ex: Gerente de TI" className={inputClass} />
                                    </div>
                                </div>

                                <StateCitySelector
                                    state={clientForm.state}
                                    city={clientForm.city}
                                    onStateChange={(uf) => setClientForm(prev => ({ ...prev, state: uf, city: "" }))}
                                    onCityChange={(c) => setClientForm(prev => ({ ...prev, city: c }))}
                                />

                                {/* Empresa */}
                                <div className="space-y-2">
                                    <Label className="text-[var(--zyllen-muted)]">Empresa</Label>
                                    <Select
                                        value={clientForm.companyId}
                                        onValueChange={(v) => setClientForm({ ...clientForm, companyId: v, projectId: "" })}
                                        placeholder="Selecione a empresa..."
                                        className="bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white"
                                    >
                                        {companies.map((c) => (
                                            <SelectOption key={c.id} value={c.id}>
                                                {c.name}{c.cnpj ? ` — ${c.cnpj}` : ""}
                                            </SelectOption>
                                        ))}
                                        <SelectOption value="__new__">
                                            + Cadastrar nova empresa
                                        </SelectOption>
                                    </Select>
                                </div>

                                {/* New company fields */}
                                {isNewCompany && (
                                    <div className="grid grid-cols-1 gap-3 border-y border-[var(--zyllen-border)] bg-white/[0.015] p-4 sm:grid-cols-2">
                                        <div className="space-y-2">
                                            <Label className="text-[var(--zyllen-muted)]">Nome da Empresa</Label>
                                            <Input value={clientForm.companyName} onChange={(e) => setClientForm({ ...clientForm, companyName: e.target.value })} placeholder="Empresa S.A." className={inputClass} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[var(--zyllen-muted)]">CNPJ</Label>
                                            <Input value={clientForm.companyCnpj} onChange={(e) => setClientForm({ ...clientForm, companyCnpj: e.target.value })} placeholder="00.000.000/0000-00" className={inputClass} />
                                        </div>
                                    </div>
                                )}

                                {/* Projeto */}
                                {clientForm.companyId && !isNewCompany && projects.length > 0 && (
                                    <div className="space-y-2">
                                        <Label className="text-[var(--zyllen-muted)]">Projeto</Label>
                                        <Select
                                            value={clientForm.projectId}
                                            onValueChange={(v) => setClientForm({ ...clientForm, projectId: v })}
                                            placeholder="Selecione o projeto..."
                                            className="bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white"
                                        >
                                            {projects.map((p) => (
                                                <SelectOption key={p.id} value={p.id}>
                                                    {p.name}
                                                </SelectOption>
                                            ))}
                                        </Select>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label className="text-[var(--zyllen-muted)]">Senha *</Label>
                                        <Input type="password" value={clientForm.password} onChange={(e) => setClientForm({ ...clientForm, password: e.target.value })} required minLength={6} placeholder="Mínimo 6 caracteres" className={inputClass} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[var(--zyllen-muted)]">Confirmar Senha *</Label>
                                        <Input type="password" value={clientForm.confirmPassword} onChange={(e) => setClientForm({ ...clientForm, confirmPassword: e.target.value })} required minLength={6} placeholder="Repita a senha" className={inputClass} />
                                    </div>
                                </div>

                                <Button type="submit" variant="highlight" className="w-full h-11 text-base" disabled={loading}>
                                    {loading ? (
                                        <span className="flex items-center gap-2">
                                            <span className="size-4 border-2 border-[var(--zyllen-bg)] border-t-transparent rounded-full animate-spin" />
                                            Cadastrando...
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-2">
                                            <UserPlus size={18} />
                                            Criar Conta de Cliente
                                        </span>
                                    )}
                                </Button>
                            </form>
                        )}

                        {/* ═══ Contractor Registration Form ═══ */}
                        {tab === "contractor" && (
                            <form onSubmit={handleContractorSubmit} className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-[var(--zyllen-muted)]">Nome Completo *</Label>
                                    <Input value={contractorForm.name} onChange={(e) => setContractorForm({ ...contractorForm, name: e.target.value })} required placeholder="Seu nome completo" className={inputClass} />
                                </div>

                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label className="text-[var(--zyllen-muted)]">Email *</Label>
                                        <Input type="email" value={contractorForm.email} onChange={(e) => setContractorForm({ ...contractorForm, email: e.target.value })} required placeholder="seu@email.com" className={inputClass} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[var(--zyllen-muted)]">CPF *</Label>
                                        <Input value={contractorForm.cpf} onChange={(e) => setContractorForm({ ...contractorForm, cpf: e.target.value })} required placeholder="000.000.000-00" className={inputClass} />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-[var(--zyllen-muted)]">Telefone</Label>
                                    <Input value={contractorForm.phone} onChange={(e) => setContractorForm({ ...contractorForm, phone: e.target.value })} placeholder="(00) 00000-0000" className={inputClass} />
                                </div>

                                <StateCitySelector
                                    state={contractorForm.state}
                                    city={contractorForm.city}
                                    onStateChange={(uf) => setContractorForm(prev => ({ ...prev, state: uf, city: "" }))}
                                    onCityChange={(c) => setContractorForm(prev => ({ ...prev, city: c }))}
                                />

                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label className="text-[var(--zyllen-muted)]">Senha *</Label>
                                        <Input type="password" value={contractorForm.password} onChange={(e) => setContractorForm({ ...contractorForm, password: e.target.value })} required minLength={6} placeholder="Mínimo 6 caracteres" className={inputClass} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[var(--zyllen-muted)]">Confirmar Senha *</Label>
                                        <Input type="password" value={contractorForm.confirmPassword} onChange={(e) => setContractorForm({ ...contractorForm, confirmPassword: e.target.value })} required minLength={6} placeholder="Repita a senha" className={inputClass} />
                                    </div>
                                </div>

                                <Button type="submit" variant="highlight" className="w-full h-11 text-base" disabled={loading}>
                                    {loading ? (
                                        <span className="flex items-center gap-2">
                                            <span className="size-4 border-2 border-[var(--zyllen-bg)] border-t-transparent rounded-full animate-spin" />
                                            Cadastrando...
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-2">
                                            <UserPlus size={18} />
                                            Criar Conta de Parceiro
                                        </span>
                                    )}
                                </Button>
                            </form>
                        )}
                </section>
            </div>

            <footer className="border-t border-white/10 px-5 py-5 text-center text-[10px] uppercase tracking-[0.14em] text-white/30">
                Zyllen Gestão © 2026 · Todos os direitos reservados
            </footer>
        </main>
    );
}

export default function CadastroPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-[var(--zyllen-bg-dark)]">
                <div className="animate-pulse flex items-center gap-3">
                    <div className="size-10 rounded-xl bg-[var(--zyllen-highlight)] animate-bounce" />
                    <span className="text-white text-lg font-semibold">Carregando...</span>
                </div>
            </div>
        }>
            <CadastroPageInner />
        </Suspense>
    );
}
