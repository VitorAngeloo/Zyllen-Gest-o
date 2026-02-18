"use client";
import { useState, useEffect, Suspense, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { apiClient } from "@web/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@web/components/ui/card";
import { Input } from "@web/components/ui/input";
import { Button } from "@web/components/ui/button";
import { Label } from "@web/components/ui/label";
import { toast } from "sonner";
import { UserPlus, Building2, Wrench, ArrowLeft, Search, Plus } from "lucide-react";

type Tab = "client" | "contractor";
interface CompanyOption { id: string; name: string; cnpj: string | null }

const BRAZILIAN_STATES = [
    "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
    "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
    "RS", "RO", "RR", "SC", "SP", "SE", "TO",
];

function CadastroPageInner() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [tab, setTab] = useState<Tab>("client");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const tabParam = searchParams.get("tab");
        if (tabParam === "contractor") setTab("contractor");
    }, [searchParams]);

    // ── Client form ──
    const [clientForm, setClientForm] = useState({
        name: "", email: "", password: "", confirmPassword: "",
        phone: "", city: "", state: "", position: "", cpf: "",
        companyName: "", companyCnpj: "", companyId: "",
    });

    // Company search state
    const [companySearch, setCompanySearch] = useState("");
    const [companyResults, setCompanyResults] = useState<CompanyOption[]>([]);
    const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);
    const [selectedCompany, setSelectedCompany] = useState<CompanyOption | null>(null);
    const [isNewCompany, setIsNewCompany] = useState(false);

    const searchCompanies = useCallback(async (q: string) => {
        if (q.length < 2) { setCompanyResults([]); return; }
        try {
            const res = await apiClient.get<{ data: CompanyOption[] }>(`/clients/companies/search?q=${encodeURIComponent(q)}`);
            setCompanyResults(res.data);
            setShowCompanyDropdown(true);
        } catch {
            setCompanyResults([]);
        }
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => searchCompanies(companySearch), 300);
        return () => clearTimeout(timer);
    }, [companySearch, searchCompanies]);

    const selectCompany = (company: CompanyOption) => {
        setSelectedCompany(company);
        setClientForm({ ...clientForm, companyId: company.id, companyName: company.name, companyCnpj: company.cnpj || "" });
        setCompanySearch(company.name);
        setShowCompanyDropdown(false);
        setIsNewCompany(false);
    };

    const startNewCompany = () => {
        setSelectedCompany(null);
        setIsNewCompany(true);
        setShowCompanyDropdown(false);
        setClientForm({ ...clientForm, companyId: "", companyName: companySearch, companyCnpj: "" });
    };

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
            // Strip empty strings
            const payload: Record<string, any> = {};
            for (const [k, v] of Object.entries(data)) {
                if (v) payload[k] = v;
            }
            await apiClient.post("/register/client", payload);
            toast.success("Cadastro realizado com sucesso! Faça login para acessar.");
            router.push("/?type=client");
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
    const selectClass = "w-full h-9 rounded-md border bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white px-3 text-sm focus:ring-[var(--zyllen-highlight)]/30 focus:border-[var(--zyllen-highlight)]";

    return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--zyllen-bg-dark)] p-4">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-[var(--zyllen-highlight)]/5 blur-3xl" />
                <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-[var(--zyllen-highlight)]/3 blur-3xl" />
            </div>

            <div className="relative w-full max-w-lg">
                <div className="flex items-center justify-center gap-3 mb-6">
                    <div className="flex items-center justify-center size-12 rounded-xl bg-[var(--zyllen-highlight)] shadow-lg shadow-[var(--zyllen-highlight)]/25">
                        <span className="font-extrabold text-xl text-[var(--zyllen-bg)]">Z</span>
                    </div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">
                        Zyllen <span className="text-[var(--zyllen-highlight)]">Gestão</span>
                    </h1>
                </div>

                <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)] shadow-2xl">
                    <CardHeader className="text-center pb-2">
                        <CardTitle className="text-xl text-white flex items-center justify-center gap-2">
                            <UserPlus size={22} className="text-[var(--zyllen-highlight)]" />
                            Criar Conta
                        </CardTitle>
                        <CardDescription className="text-[var(--zyllen-muted)]">
                            Selecione o tipo de cadastro
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {/* Tab selector */}
                        <div className="flex gap-2 mb-6">
                            <button
                                onClick={() => setTab("client")}
                                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all border ${tab === "client"
                                    ? "bg-[var(--zyllen-highlight)]/10 text-[var(--zyllen-highlight)] border-[var(--zyllen-highlight)]/30"
                                    : "text-[var(--zyllen-muted)] border-[var(--zyllen-border)] hover:text-white hover:bg-white/5"
                                    }`}
                            >
                                <Building2 size={16} />
                                Cliente
                            </button>
                            <button
                                onClick={() => setTab("contractor")}
                                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all border ${tab === "contractor"
                                    ? "bg-[var(--zyllen-highlight)]/10 text-[var(--zyllen-highlight)] border-[var(--zyllen-highlight)]/30"
                                    : "text-[var(--zyllen-muted)] border-[var(--zyllen-border)] hover:text-white hover:bg-white/5"
                                    }`}
                            >
                                <Wrench size={16} />
                                Terceirizado
                            </button>
                        </div>

                        {/* ═══ Client Registration Form ═══ */}
                        {tab === "client" && (
                            <form onSubmit={handleClientSubmit} className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-[var(--zyllen-muted)]">Nome Completo *</Label>
                                    <Input value={clientForm.name} onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })} required placeholder="Seu nome completo" className={inputClass} />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-2">
                                        <Label className="text-[var(--zyllen-muted)]">Email *</Label>
                                        <Input type="email" value={clientForm.email} onChange={(e) => setClientForm({ ...clientForm, email: e.target.value })} required placeholder="seu@email.com" className={inputClass} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[var(--zyllen-muted)]">CPF</Label>
                                        <Input value={clientForm.cpf} onChange={(e) => setClientForm({ ...clientForm, cpf: e.target.value })} placeholder="000.000.000-00" className={inputClass} />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-2">
                                        <Label className="text-[var(--zyllen-muted)]">Telefone</Label>
                                        <Input value={clientForm.phone} onChange={(e) => setClientForm({ ...clientForm, phone: e.target.value })} placeholder="(00) 00000-0000" className={inputClass} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[var(--zyllen-muted)]">Cargo / Função</Label>
                                        <Input value={clientForm.position} onChange={(e) => setClientForm({ ...clientForm, position: e.target.value })} placeholder="Ex: Gerente de TI" className={inputClass} />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-2">
                                        <Label className="text-[var(--zyllen-muted)]">Cidade</Label>
                                        <Input value={clientForm.city} onChange={(e) => setClientForm({ ...clientForm, city: e.target.value })} placeholder="Sua cidade" className={inputClass} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[var(--zyllen-muted)]">Estado (UF)</Label>
                                        <select value={clientForm.state} onChange={(e) => setClientForm({ ...clientForm, state: e.target.value })} className={selectClass}>
                                            <option value="">Selecione...</option>
                                            {BRAZILIAN_STATES.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
                                        </select>
                                    </div>
                                </div>

                                {/* Company search */}
                                <div className="space-y-2">
                                    <Label className="text-[var(--zyllen-muted)]">Empresa</Label>
                                    <div className="relative">
                                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--zyllen-muted)]/50" />
                                        <Input
                                            value={companySearch}
                                            onChange={(e) => {
                                                setCompanySearch(e.target.value);
                                                if (selectedCompany) {
                                                    setSelectedCompany(null);
                                                    setClientForm({ ...clientForm, companyId: "", companyName: "", companyCnpj: "" });
                                                }
                                            }}
                                            onFocus={() => companyResults.length > 0 && setShowCompanyDropdown(true)}
                                            placeholder="Pesquisar empresa pelo nome ou CNPJ..."
                                            className={`${inputClass} pl-9`}
                                        />
                                        {showCompanyDropdown && (
                                            <div className="absolute z-50 w-full mt-1 rounded-lg border border-[var(--zyllen-border)] bg-[var(--zyllen-bg-dark)] shadow-xl max-h-48 overflow-y-auto">
                                                {companyResults.map((c) => (
                                                    <button
                                                        key={c.id}
                                                        type="button"
                                                        onClick={() => selectCompany(c)}
                                                        className="w-full px-3 py-2 text-left text-sm hover:bg-white/5 transition-colors flex items-center justify-between"
                                                    >
                                                        <span className="text-white">{c.name}</span>
                                                        {c.cnpj && <span className="text-[var(--zyllen-muted)] text-xs">{c.cnpj}</span>}
                                                    </button>
                                                ))}
                                                <button
                                                    type="button"
                                                    onClick={startNewCompany}
                                                    className="w-full px-3 py-2 text-left text-sm hover:bg-[var(--zyllen-highlight)]/10 transition-colors flex items-center gap-2 text-[var(--zyllen-highlight)] border-t border-[var(--zyllen-border)]"
                                                >
                                                    <Plus size={14} /> Cadastrar nova empresa
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    {selectedCompany && (
                                        <p className="text-xs text-[var(--zyllen-highlight)]">Empresa selecionada: {selectedCompany.name}</p>
                                    )}
                                </div>

                                {/* New company fields */}
                                {isNewCompany && (
                                    <div className="grid grid-cols-2 gap-3 p-3 rounded-lg border border-[var(--zyllen-border)] bg-[var(--zyllen-bg-dark)]/50">
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

                                <div className="grid grid-cols-2 gap-3">
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

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-2">
                                        <Label className="text-[var(--zyllen-muted)]">Email *</Label>
                                        <Input type="email" value={contractorForm.email} onChange={(e) => setContractorForm({ ...contractorForm, email: e.target.value })} required placeholder="seu@email.com" className={inputClass} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[var(--zyllen-muted)]">CPF *</Label>
                                        <Input value={contractorForm.cpf} onChange={(e) => setContractorForm({ ...contractorForm, cpf: e.target.value })} required placeholder="000.000.000-00" className={inputClass} />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-2">
                                        <Label className="text-[var(--zyllen-muted)]">Telefone</Label>
                                        <Input value={contractorForm.phone} onChange={(e) => setContractorForm({ ...contractorForm, phone: e.target.value })} placeholder="(00) 00000-0000" className={inputClass} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[var(--zyllen-muted)]">Cidade</Label>
                                        <Input value={contractorForm.city} onChange={(e) => setContractorForm({ ...contractorForm, city: e.target.value })} placeholder="Sua cidade" className={inputClass} />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-[var(--zyllen-muted)]">Estado (UF)</Label>
                                    <select value={contractorForm.state} onChange={(e) => setContractorForm({ ...contractorForm, state: e.target.value })} className={selectClass}>
                                        <option value="">Selecione...</option>
                                        {BRAZILIAN_STATES.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
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
                                            Criar Conta de Terceirizado
                                        </span>
                                    )}
                                </Button>
                            </form>
                        )}
                    </CardContent>
                </Card>

                <div className="text-center mt-4">
                    <Link href="/" className="text-sm text-[var(--zyllen-muted)] hover:text-[var(--zyllen-highlight)] transition-colors inline-flex items-center gap-1">
                        <ArrowLeft size={14} />
                        Já tenho uma conta — Fazer login
                    </Link>
                </div>

                <p className="text-center text-xs text-[var(--zyllen-muted)]/60 mt-4">
                    Zyllen Gestão © 2026 · Todos os direitos reservados
                </p>
            </div>
        </div>
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
