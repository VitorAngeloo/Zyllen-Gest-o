"use client";
import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@web/components/ui/card";
import { Button } from "@web/components/ui/button";
import { Input } from "@web/components/ui/input";
import { Label } from "@web/components/ui/label";
import { ArrowLeft, ArrowRight, Send, Save, FileText, MapPin, Loader2 } from "lucide-react";
import { OsFormTypeSelector } from "./os-form-type-selector";
import { OS_FORM_CONFIG, INTERNAL_FORM_TYPES, CONTRACTOR_FORM_TYPES } from "./os-form-types";
import type { OsFormType } from "./os-form-types";
import {
    TerceirizadoFormFields,
    InstalacaoSalaFormFields,
    InstalacaoTelaFormFields,
    DesinstalacaoFormFields,
    SuporteRemotoFormFields,
    ManutencaoTelaSalaFormFields,
} from "./os-form-fields";

// Map form type to its field component
const FORM_FIELD_COMPONENTS: Record<OsFormType, React.ComponentType<any>> = {
    TERCEIRIZADO: TerceirizadoFormFields,
    INSTALACAO_SALA: InstalacaoSalaFormFields,
    INSTALACAO_TELA: InstalacaoTelaFormFields,
    DESINSTALACAO: DesinstalacaoFormFields,
    SUPORTE_REMOTO: SuporteRemotoFormFields,
    MANUTENCAO_TELA_SALA: ManutencaoTelaSalaFormFields,
};

interface OsFormWizardProps {
    /** 'internal' for dashboard users, 'contractor' for portal users */
    userContext: "internal" | "contractor";
    /** Callback when OS is submitted (create or save) */
    onSubmit: (data: OsFormSubmitData) => Promise<void>;
    /** Callback to save draft / progressive fill */
    onSaveDraft?: (data: OsFormSubmitData) => Promise<void>;
    /** Go back handler */
    onCancel: () => void;
    /** Currently submitting */
    submitting?: boolean;
    /** Pre-loaded data for editing an existing OS */
    initialData?: Partial<OsFormSubmitData> & { id?: string };
    /** True when editing an existing OS (progressive fill mode) */
    editMode?: boolean;
    /** When true, all fields are read-only (CLOSED OS) */
    readOnly?: boolean;
}

export interface OsFormSubmitData {
    formType: OsFormType;
    assetId?: string;
    notes?: string;
    clientName?: string;
    clientCity?: string;
    clientState?: string;
    location?: string;
    contactName?: string;
    contactPhone?: string;
    contactRole?: string;
    startedAt?: string;
    endedAt?: string;
    scheduledDate?: string;
    formData: Record<string, unknown>;
}

type WizardStep = "select-type" | "fill-form";

const BRAZILIAN_STATES: { uf: string; name: string }[] = [
    { uf: "AC", name: "Acre" }, { uf: "AL", name: "Alagoas" }, { uf: "AP", name: "Amapá" },
    { uf: "AM", name: "Amazonas" }, { uf: "BA", name: "Bahia" }, { uf: "CE", name: "Ceará" },
    { uf: "DF", name: "Distrito Federal" }, { uf: "ES", name: "Espírito Santo" },
    { uf: "GO", name: "Goiás" }, { uf: "MA", name: "Maranhão" }, { uf: "MT", name: "Mato Grosso" },
    { uf: "MS", name: "Mato Grosso do Sul" }, { uf: "MG", name: "Minas Gerais" },
    { uf: "PA", name: "Pará" }, { uf: "PB", name: "Paraíba" }, { uf: "PR", name: "Paraná" },
    { uf: "PE", name: "Pernambuco" }, { uf: "PI", name: "Piauí" }, { uf: "RJ", name: "Rio de Janeiro" },
    { uf: "RN", name: "Rio Grande do Norte" }, { uf: "RS", name: "Rio Grande do Sul" },
    { uf: "RO", name: "Rondônia" }, { uf: "RR", name: "Roraima" }, { uf: "SC", name: "Santa Catarina" },
    { uf: "SP", name: "São Paulo" }, { uf: "SE", name: "Sergipe" }, { uf: "TO", name: "Tocantins" },
];

const IBGE_API = "https://servicodados.ibge.gov.br/api/v1/localidades/estados";
const NOMINATIM_API = "https://nominatim.openstreetmap.org/search";

const inputCls = "bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white placeholder:text-[var(--zyllen-muted)]/50";
const selectCls = "w-full h-9 rounded-md border bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white px-3 text-sm";

export function OsFormWizard({
    userContext,
    onSubmit,
    onSaveDraft,
    onCancel,
    submitting,
    initialData,
    editMode,
    readOnly,
}: OsFormWizardProps) {
    const availableTypes = userContext === "contractor" ? CONTRACTOR_FORM_TYPES : INTERNAL_FORM_TYPES;

    // If contractor or edit mode, skip type selection
    const skipTypeSelect = editMode || availableTypes.length === 1;
    const [step, setStep] = useState<WizardStep>(skipTypeSelect ? "fill-form" : "select-type");
    const [selectedType, setSelectedType] = useState<OsFormType | null>(
        initialData?.formType || (availableTypes.length === 1 ? availableTypes[0] : null)
    );

    // Common fields
    const [clientName, setClientName] = useState(initialData?.clientName || "");
    const [clientCity, setClientCity] = useState(initialData?.clientCity || "");
    const [clientState, setClientState] = useState(initialData?.clientState || "");
    const [location, setLocation] = useState(initialData?.location || "");
    const [contactName, setContactName] = useState(initialData?.contactName || "");
    const [contactPhone, setContactPhone] = useState(initialData?.contactPhone || "");
    const [contactRole, setContactRole] = useState(initialData?.contactRole || "");
    const [startedAt, setStartedAt] = useState(initialData?.startedAt || "");
    const [endedAt, setEndedAt] = useState(initialData?.endedAt || "");

    // Form-specific data
    const [formData, setFormData] = useState<Record<string, unknown>>(initialData?.formData || {});

    // Cascade: cities loaded from IBGE API based on selected state
    const [cities, setCities] = useState<string[]>([]);
    const [loadingCities, setLoadingCities] = useState(false);
    const [locatingAddress, setLocatingAddress] = useState(false);

    const config = selectedType ? OS_FORM_CONFIG[selectedType] : null;
    const FormFieldsComponent = selectedType ? FORM_FIELD_COMPONENTS[selectedType] : null;

    // Fetch cities when state changes
    const fetchCities = useCallback(async (uf: string) => {
        if (!uf) { setCities([]); return; }
        setLoadingCities(true);
        try {
            const res = await fetch(`${IBGE_API}/${uf}/municipios?orderBy=nome`);
            if (!res.ok) throw new Error("Erro ao buscar cidades");
            const data: { nome: string }[] = await res.json();
            setCities(data.map((c) => c.nome));
        } catch {
            setCities([]);
        } finally {
            setLoadingCities(false);
        }
    }, []);

    // Load cities on mount if state is pre-set (edit mode)
    useEffect(() => {
        if (clientState) fetchCities(clientState);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const handleStateChange = (uf: string) => {
        setClientState(uf);
        setClientCity("");
        if (uf) fetchCities(uf);
        else setCities([]);
    };

    const handleCityChange = (city: string) => {
        setClientCity(city);
        if (city && clientState) {
            setLocation(`${city} - ${clientState}, Brasil`);
        }
    };

    // Auto-locate via Nominatim (OpenStreetMap)
    const autoLocate = async () => {
        if (!clientCity || !clientState) return;
        setLocatingAddress(true);
        try {
            const query = encodeURIComponent(`${clientCity}, ${clientState}, Brasil`);
            const res = await fetch(
                `${NOMINATIM_API}?q=${query}&format=json&limit=1&accept-language=pt-BR`,
                { headers: { "User-Agent": "ZyllenGestao/1.0" } },
            );
            const data = await res.json();
            if (data?.[0]?.display_name) {
                setLocation(data[0].display_name);
            }
        } catch {
            // keep current value on failure
        } finally {
            setLocatingAddress(false);
        }
    };

    const handleSelectType = (type: OsFormType) => {
        setSelectedType(type);
    };

    const goToFillForm = () => {
        if (!selectedType) return;
        setStep("fill-form");
    };

    const goBackToTypeSelect = () => {
        setStep("select-type");
        setFormData({});
    };

    const buildSubmitData = (): OsFormSubmitData => ({
        formType: selectedType!,
        clientName: clientName || undefined,
        clientCity: clientCity || undefined,
        clientState: clientState || undefined,
        location: location || undefined,
        contactName: contactName || undefined,
        contactPhone: contactPhone || undefined,
        contactRole: contactRole || undefined,
        startedAt: startedAt || undefined,
        endedAt: endedAt || undefined,
        formData,
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedType || readOnly) return;
        await onSubmit(buildSubmitData());
    };

    const handleSaveDraft = async () => {
        if (!selectedType || !onSaveDraft || readOnly) return;
        await onSaveDraft(buildSubmitData());
    };

    // ── Step 1: Select form type ──
    if (step === "select-type") {
        return (
            <div className="space-y-6">
                <button
                    onClick={onCancel}
                    className="flex items-center gap-2 text-sm text-[var(--zyllen-muted)] hover:text-white transition-colors"
                >
                    <ArrowLeft size={16} /> Voltar
                </button>

                <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <FileText size={20} className="text-[var(--zyllen-highlight)]" />
                        Selecione o Tipo de OS
                    </h2>
                    <p className="text-sm text-[var(--zyllen-muted)] mt-1">
                        Escolha o formulário adequado para o serviço a ser realizado
                    </p>
                </div>

                <OsFormTypeSelector
                    availableTypes={availableTypes}
                    selected={selectedType}
                    onSelect={handleSelectType}
                />

                {selectedType && (
                    <div className="flex justify-end">
                        <Button variant="highlight" onClick={goToFillForm}>
                            Continuar <ArrowRight size={16} className="ml-2" />
                        </Button>
                    </div>
                )}
            </div>
        );
    }

    // ── Step 2: Fill form ──
    return (
        <div className="space-y-6">
            <button
                onClick={skipTypeSelect ? onCancel : goBackToTypeSelect}
                className="flex items-center gap-2 text-sm text-[var(--zyllen-muted)] hover:text-white transition-colors"
            >
                <ArrowLeft size={16} /> Voltar
            </button>

            <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <FileText size={20} className="text-[var(--zyllen-highlight)]" />
                    {editMode ? `Editar — ${config?.label}` : config?.label}
                </h2>
                <p className="text-sm text-[var(--zyllen-muted)] mt-1">
                    {readOnly
                        ? "Visualização — esta OS foi finalizada e não pode ser editada"
                        : editMode
                            ? "Preencha os campos conforme o serviço avança. Você pode salvar a qualquer momento."
                            : "Preencha os dados abaixo para abrir a ordem de serviço"}
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* ── Seção: Dados ── */}
                <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)]">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-white text-sm">Dados</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Estado / Cidade — cascade */}
                        {config?.requiresClient && (
                            <>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-[var(--zyllen-muted)]">Estado (UF)</Label>
                                        <select
                                            value={clientState}
                                            onChange={(e) => handleStateChange(e.target.value)}
                                            disabled={readOnly}
                                            className={selectCls}
                                        >
                                            <option value="">Selecione o estado...</option>
                                            {BRAZILIAN_STATES.map((s) => (
                                                <option key={s.uf} value={s.uf}>{s.uf} — {s.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[var(--zyllen-muted)]">
                                            Cidade
                                            {loadingCities && <Loader2 size={12} className="inline ml-2 animate-spin" />}
                                        </Label>
                                        <select
                                            value={clientCity}
                                            onChange={(e) => handleCityChange(e.target.value)}
                                            disabled={readOnly || !clientState || loadingCities}
                                            className={selectCls}
                                        >
                                            <option value="">{clientState ? "Selecione a cidade..." : "Selecione um estado primeiro"}</option>
                                            {cities.map((city) => (
                                                <option key={city} value={city}>{city}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Empresa / Cliente */}
                                <div className="space-y-2">
                                    <Label className="text-[var(--zyllen-muted)]">Empresa / Cliente</Label>
                                    <Input
                                        placeholder="Nome da empresa"
                                        value={clientName}
                                        onChange={(e) => setClientName(e.target.value)}
                                        readOnly={readOnly}
                                        className={inputCls}
                                    />
                                </div>
                            </>
                        )}

                        {/* Localização — auto-fill from state+city */}
                        <div className="space-y-2">
                            <Label className="text-[var(--zyllen-muted)]">Localização (Endereço)</Label>
                            <div className="flex gap-2">
                                <Input
                                    placeholder="Endereço completo — preenchido automaticamente"
                                    value={location}
                                    onChange={(e) => setLocation(e.target.value)}
                                    readOnly={readOnly}
                                    className={`${inputCls} flex-1`}
                                />
                                {!readOnly && clientCity && clientState && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={autoLocate}
                                        disabled={locatingAddress}
                                        className="border-[var(--zyllen-border)] text-[var(--zyllen-muted)] hover:text-white shrink-0 h-9 px-3"
                                        title="Buscar endereço automático via OpenStreetMap"
                                    >
                                        {locatingAddress ? <Loader2 size={14} className="animate-spin" /> : <MapPin size={14} />}
                                    </Button>
                                )}
                            </div>
                        </div>

                        {/* Contato no Local (Responsável) — campos atômicos */}
                        <div className="space-y-2">
                            <Label className="text-[var(--zyllen-muted)] font-semibold text-xs uppercase tracking-wider">
                                Contato no Local (Responsável)
                            </Label>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-1">
                                    <Label className="text-[var(--zyllen-muted)] text-xs">Nome</Label>
                                    <Input
                                        placeholder="Nome do responsável"
                                        value={contactName}
                                        onChange={(e) => setContactName(e.target.value)}
                                        readOnly={readOnly}
                                        className={inputCls}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[var(--zyllen-muted)] text-xs">Telefone</Label>
                                    <Input
                                        placeholder="(00) 00000-0000"
                                        value={contactPhone}
                                        onChange={(e) => setContactPhone(e.target.value)}
                                        readOnly={readOnly}
                                        className={inputCls}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[var(--zyllen-muted)] text-xs">Cargo</Label>
                                    <Input
                                        placeholder="Cargo ou função"
                                        value={contactRole}
                                        onChange={(e) => setContactRole(e.target.value)}
                                        readOnly={readOnly}
                                        className={inputCls}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Start / End datetime */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-[var(--zyllen-muted)]">Início do serviço</Label>
                                <Input
                                    type="datetime-local"
                                    value={startedAt}
                                    onChange={(e) => setStartedAt(e.target.value)}
                                    readOnly={readOnly}
                                    className={inputCls}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[var(--zyllen-muted)]">Fim do serviço</Label>
                                <Input
                                    type="datetime-local"
                                    value={endedAt}
                                    onChange={(e) => setEndedAt(e.target.value)}
                                    readOnly={readOnly}
                                    className={inputCls}
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* ── Seção: Campos do Formulário (type-specific) ── */}
                <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)]">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-white text-sm">Detalhes do Serviço</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {FormFieldsComponent && (
                            <FormFieldsComponent
                                formData={formData}
                                onChange={setFormData}
                                readOnly={readOnly}
                            />
                        )}
                    </CardContent>
                </Card>

                {/* ── Actions ── */}
                {!readOnly && (
                    <div className="flex justify-end gap-3">
                        {onSaveDraft && (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleSaveDraft}
                                disabled={submitting}
                                className="min-w-[160px] border-[var(--zyllen-border)] text-[var(--zyllen-muted)] hover:text-white"
                            >
                                <Save size={16} className="mr-2" />
                                Salvar Rascunho
                            </Button>
                        )}
                        <Button
                            type="submit"
                            variant="highlight"
                            disabled={submitting}
                            className="min-w-[200px]"
                        >
                            {submitting ? (
                                "Enviando..."
                            ) : editMode ? (
                                <>
                                    <Send size={16} className="mr-2" /> Salvar Alterações
                                </>
                            ) : (
                                <>
                                    <Send size={16} className="mr-2" /> Abrir Ordem de Serviço
                                </>
                            )}
                        </Button>
                    </div>
                )}
            </form>
        </div>
    );
}
