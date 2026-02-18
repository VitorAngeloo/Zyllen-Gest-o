"use client";
import { Input } from "@web/components/ui/input";
import { Label } from "@web/components/ui/label";

export interface OsFormFieldsProps {
    formData: Record<string, any>;
    onChange: (data: Record<string, any>) => void;
    readOnly?: boolean;
}

// CSS classes used across all forms
const inputCls = "bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white placeholder:text-[var(--zyllen-muted)]/50";
const selectCls = "w-full h-9 rounded-md border bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white px-3 text-sm";
const textareaCls = "w-full rounded-md bg-[var(--zyllen-bg-dark)] border border-[var(--zyllen-border)] text-white placeholder:text-[var(--zyllen-muted)]/50 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--zyllen-highlight)]/30 focus:border-[var(--zyllen-highlight)] resize-none";

function SectionTitle({ children }: { children: React.ReactNode }) {
    return (
        <h3 className="text-sm font-semibold text-[var(--zyllen-highlight)] uppercase tracking-wider border-b border-[var(--zyllen-border)] pb-2 mb-4">
            {children}
        </h3>
    );
}

// ═══════════════════════════════════════════════════
// 1. INSTALAÇÃO DE SALA
// ═══════════════════════════════════════════════════
export function InstalacaoSalaFormFields({ formData, onChange, readOnly }: OsFormFieldsProps) {
    const u = (key: string, value: any) => onChange({ ...formData, [key]: value });

    return (
        <div className="space-y-6">
            {/* Início da Instalação */}
            <div className="space-y-4">
                <SectionTitle>Início da Instalação</SectionTitle>

                <div className="space-y-2">
                    <Label className="text-[var(--zyllen-muted)]">Modelo da sala</Label>
                    <select value={formData.roomModel || ""} onChange={(e) => u("roomModel", e.target.value)} disabled={readOnly} className={selectCls}>
                        <option value="">Selecione...</option>
                        <option value="CURVA">Curva</option>
                        <option value="RETANGULAR">Retangular</option>
                        <option value="TRAPEZIO">Trapézio</option>
                    </select>
                </div>

                <div className="space-y-2">
                    <Label className="text-[var(--zyllen-muted)]">Dimensões da tela</Label>
                    <Input placeholder="Ex: 5m x 3m" value={formData.screenDimensions || ""} onChange={(e) => u("screenDimensions", e.target.value)} readOnly={readOnly} className={inputCls} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label className="text-[var(--zyllen-muted)]">Local possui todos pontos de tomadas?</Label>
                        <select value={formData.hasOutlets || ""} onChange={(e) => u("hasOutlets", e.target.value)} disabled={readOnly} className={selectCls}>
                            <option value="">Selecione...</option>
                            <option value="SIM">Sim</option>
                            <option value="NAO">Não</option>
                        </select>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[var(--zyllen-muted)]">Local possui internet?</Label>
                        <select value={formData.internetType || ""} onChange={(e) => u("internetType", e.target.value)} disabled={readOnly} className={selectCls}>
                            <option value="">Selecione...</option>
                            <option value="WIFI">Wi-Fi</option>
                            <option value="CABEADA">Cabeada</option>
                            <option value="NAO_POSSUI">Não possui</option>
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label className="text-[var(--zyllen-muted)]">Local é de fácil acesso?</Label>
                        <select value={formData.easyAccess || ""} onChange={(e) => u("easyAccess", e.target.value)} disabled={readOnly} className={selectCls}>
                            <option value="">Selecione...</option>
                            <option value="SIM">Sim</option>
                            <option value="NAO">Não</option>
                        </select>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[var(--zyllen-muted)]">Local é seguro para os equipamentos?</Label>
                        <select value={formData.safeLocation || ""} onChange={(e) => u("safeLocation", e.target.value)} disabled={readOnly} className={selectCls}>
                            <option value="">Selecione...</option>
                            <option value="SIM">Sim</option>
                            <option value="NAO">Não</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Verificação de Ativos */}
            <div className="space-y-4">
                <SectionTitle>Verificação de Ativos</SectionTitle>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label className="text-[var(--zyllen-muted)]">Essa sala usa projetores ou painel de LED?</Label>
                        <select value={formData.displayType || ""} onChange={(e) => u("displayType", e.target.value)} disabled={readOnly} className={selectCls}>
                            <option value="">Selecione...</option>
                            <option value="PROJETOR">Projetor</option>
                            <option value="PAINEL_LED">Painel de LED</option>
                        </select>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[var(--zyllen-muted)]">Modelo do projetor/painel</Label>
                        <Input placeholder="Ex: Epson EB-L200SW" value={formData.displayModel || ""} onChange={(e) => u("displayModel", e.target.value)} readOnly={readOnly} className={inputCls} />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label className="text-[var(--zyllen-muted)]">Qual a configuração do computador?</Label>
                    <textarea placeholder="Processador, RAM, GPU, etc..." value={formData.computerConfig || ""} onChange={(e) => u("computerConfig", e.target.value)} readOnly={readOnly} rows={3} className={textareaCls} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label className="text-[var(--zyllen-muted)]">Equipamento de som utilizado</Label>
                        <Input placeholder="Ex: JBL Cinema 610" value={formData.soundEquipment || ""} onChange={(e) => u("soundEquipment", e.target.value)} readOnly={readOnly} className={inputCls} />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[var(--zyllen-muted)]">Sala possui tablet ou totem?</Label>
                        <Input placeholder="Ex: Tablet Samsung, Totem..." value={formData.tabletTotem || ""} onChange={(e) => u("tabletTotem", e.target.value)} readOnly={readOnly} className={inputCls} />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label className="text-[var(--zyllen-muted)]">A câmera foi devidamente instalada?</Label>
                        <Input placeholder="Ex: Sim, câmera Logitech C920" value={formData.cameraInstalled || ""} onChange={(e) => u("cameraInstalled", e.target.value)} readOnly={readOnly} className={inputCls} />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[var(--zyllen-muted)]">Qual alias do Anydesk?</Label>
                        <Input placeholder="Ex: 123 456 789" value={formData.anydeskAlias || ""} onChange={(e) => u("anydeskAlias", e.target.value)} readOnly={readOnly} className={inputCls} />
                    </div>
                </div>
            </div>

            {/* Fim do Trabalho */}
            <div className="space-y-4">
                <SectionTitle>Fim do Trabalho</SectionTitle>

                <div className="space-y-2">
                    <Label className="text-[var(--zyllen-muted)]">Diário de bordo</Label>
                    <textarea placeholder="Detalhes sobre a instalação do projeto..." value={formData.logbook || ""} onChange={(e) => u("logbook", e.target.value)} readOnly={readOnly} rows={5} className={textareaCls} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label className="text-[var(--zyllen-muted)]">Nome de quem acompanhou</Label>
                        <Input placeholder="Nome completo" value={formData.witnessName || ""} onChange={(e) => u("witnessName", e.target.value)} readOnly={readOnly} className={inputCls} />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[var(--zyllen-muted)]">RG ou CPF de quem acompanhou</Label>
                        <Input placeholder="000.000.000-00" value={formData.witnessDocument || ""} onChange={(e) => u("witnessDocument", e.target.value)} readOnly={readOnly} className={inputCls} />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label className="text-[var(--zyllen-muted)]">Assinatura eletrônica de quem acompanhou</Label>
                    <Input placeholder="Nome por extenso (assinatura)" value={formData.witnessSignature || ""} onChange={(e) => u("witnessSignature", e.target.value)} readOnly={readOnly} className={inputCls} />
                </div>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════
// 2. INSTALAÇÃO DE TELA
// ═══════════════════════════════════════════════════
export function InstalacaoTelaFormFields({ formData, onChange, readOnly }: OsFormFieldsProps) {
    const u = (key: string, value: any) => onChange({ ...formData, [key]: value });

    return (
        <div className="space-y-6">
            {/* Início da Instalação */}
            <div className="space-y-4">
                <SectionTitle>Início da Instalação</SectionTitle>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label className="text-[var(--zyllen-muted)]">Local possui tomada para instalação?</Label>
                        <select value={formData.hasOutlets || ""} onChange={(e) => u("hasOutlets", e.target.value)} disabled={readOnly} className={selectCls}>
                            <option value="">Selecione...</option>
                            <option value="SIM">Sim</option>
                            <option value="NAO">Não</option>
                        </select>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[var(--zyllen-muted)]">Local possui internet?</Label>
                        <select value={formData.internetType || ""} onChange={(e) => u("internetType", e.target.value)} disabled={readOnly} className={selectCls}>
                            <option value="">Selecione...</option>
                            <option value="WIFI">Wi-Fi</option>
                            <option value="CABEADA">Cabeada</option>
                            <option value="NAO_POSSUI">Não possui</option>
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label className="text-[var(--zyllen-muted)]">Local é de fácil acesso?</Label>
                        <select value={formData.easyAccess || ""} onChange={(e) => u("easyAccess", e.target.value)} disabled={readOnly} className={selectCls}>
                            <option value="">Selecione...</option>
                            <option value="SIM">Sim</option>
                            <option value="NAO">Não</option>
                        </select>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[var(--zyllen-muted)]">Local é seguro para os equipamentos?</Label>
                        <select value={formData.safeLocation || ""} onChange={(e) => u("safeLocation", e.target.value)} disabled={readOnly} className={selectCls}>
                            <option value="">Selecione...</option>
                            <option value="SIM">Sim</option>
                            <option value="NAO">Não</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Verificação de Ativos */}
            <div className="space-y-4">
                <SectionTitle>Verificação de Ativos</SectionTitle>

                <div className="space-y-2">
                    <Label className="text-[var(--zyllen-muted)]">Totem tem detalhes de uso?</Label>
                    <select value={formData.totemCondition || ""} onChange={(e) => u("totemCondition", e.target.value)} disabled={readOnly} className={selectCls}>
                        <option value="">Selecione...</option>
                        <option value="NOVO">Está novo</option>
                        <option value="TEM_DETALHES">Tem detalhes</option>
                    </select>
                </div>
            </div>

            {/* Fim do Trabalho */}
            <div className="space-y-4">
                <SectionTitle>Fim do Trabalho</SectionTitle>

                <div className="space-y-2">
                    <Label className="text-[var(--zyllen-muted)]">Diário de bordo</Label>
                    <textarea placeholder="Detalhes sobre a instalação do projeto..." value={formData.logbook || ""} onChange={(e) => u("logbook", e.target.value)} readOnly={readOnly} rows={5} className={textareaCls} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label className="text-[var(--zyllen-muted)]">Nome de quem acompanhou</Label>
                        <Input placeholder="Nome completo" value={formData.witnessName || ""} onChange={(e) => u("witnessName", e.target.value)} readOnly={readOnly} className={inputCls} />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[var(--zyllen-muted)]">RG ou CPF de quem acompanhou</Label>
                        <Input placeholder="000.000.000-00" value={formData.witnessDocument || ""} onChange={(e) => u("witnessDocument", e.target.value)} readOnly={readOnly} className={inputCls} />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label className="text-[var(--zyllen-muted)]">Assinatura eletrônica de quem acompanhou</Label>
                    <Input placeholder="Nome por extenso (assinatura)" value={formData.witnessSignature || ""} onChange={(e) => u("witnessSignature", e.target.value)} readOnly={readOnly} className={inputCls} />
                </div>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════
// 3. DESINSTALAÇÃO
// ═══════════════════════════════════════════════════
export function DesinstalacaoFormFields({ formData, onChange, readOnly }: OsFormFieldsProps) {
    const u = (key: string, value: any) => onChange({ ...formData, [key]: value });

    return (
        <div className="space-y-6">
            {/* Início da Desinstalação */}
            <div className="space-y-4">
                <SectionTitle>Início da Desinstalação</SectionTitle>

                <div className="space-y-2">
                    <Label className="text-[var(--zyllen-muted)]">Qual tipo de serviço foi desinstalado?</Label>
                    <Input placeholder="Ex: Sala Interativa, Tela, Projetor..." value={formData.uninstalledServiceType || ""} onChange={(e) => u("uninstalledServiceType", e.target.value)} readOnly={readOnly} className={inputCls} />
                </div>
            </div>

            {/* Verificação de Ativo */}
            <div className="space-y-4">
                <SectionTitle>Verificação de Ativo</SectionTitle>

                <div className="space-y-2">
                    <Label className="text-[var(--zyllen-muted)]">Qual estado dos equipamentos?</Label>
                    <Input placeholder="Ex: Bom estado, com avarias..." value={formData.equipmentCondition || ""} onChange={(e) => u("equipmentCondition", e.target.value)} readOnly={readOnly} className={inputCls} />
                </div>

                <div className="space-y-2">
                    <Label className="text-[var(--zyllen-muted)]">Quais equipamentos foram desinstalados?</Label>
                    <textarea placeholder="Liste todos os equipamentos desinstalados com detalhes..." value={formData.uninstalledEquipment || ""} onChange={(e) => u("uninstalledEquipment", e.target.value)} readOnly={readOnly} rows={4} className={textareaCls} />
                </div>
            </div>

            {/* Fim do Trabalho */}
            <div className="space-y-4">
                <SectionTitle>Fim do Trabalho</SectionTitle>

                <div className="space-y-2">
                    <Label className="text-[var(--zyllen-muted)]">Diário de bordo</Label>
                    <textarea placeholder="Detalhes sobre a desinstalação..." value={formData.logbook || ""} onChange={(e) => u("logbook", e.target.value)} readOnly={readOnly} rows={5} className={textareaCls} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label className="text-[var(--zyllen-muted)]">Nome de quem acompanhou</Label>
                        <Input placeholder="Nome completo" value={formData.witnessName || ""} onChange={(e) => u("witnessName", e.target.value)} readOnly={readOnly} className={inputCls} />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[var(--zyllen-muted)]">RG ou CPF de quem acompanhou</Label>
                        <Input placeholder="000.000.000-00" value={formData.witnessDocument || ""} onChange={(e) => u("witnessDocument", e.target.value)} readOnly={readOnly} className={inputCls} />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label className="text-[var(--zyllen-muted)]">Assinatura eletrônica de quem acompanhou</Label>
                    <Input placeholder="Nome por extenso (assinatura)" value={formData.witnessSignature || ""} onChange={(e) => u("witnessSignature", e.target.value)} readOnly={readOnly} className={inputCls} />
                </div>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════
// 4. MANUTENÇÃO (Tela/Sala)
// ═══════════════════════════════════════════════════
export function ManutencaoTelaSalaFormFields({ formData, onChange, readOnly }: OsFormFieldsProps) {
    const u = (key: string, value: any) => onChange({ ...formData, [key]: value });

    return (
        <div className="space-y-6">
            {/* Avaliação e Serviço */}
            <div className="space-y-4">
                <SectionTitle>Avaliação e Serviço</SectionTitle>

                <div className="space-y-2">
                    <Label className="text-[var(--zyllen-muted)]">A infraestrutura tem algum ponto que não está adequado?</Label>
                    <Input placeholder="Descreva pontos inadequados..." value={formData.infrastructureIssues || ""} onChange={(e) => u("infrastructureIssues", e.target.value)} readOnly={readOnly} className={inputCls} />
                </div>

                <div className="space-y-2">
                    <Label className="text-[var(--zyllen-muted)]">Qual tipo de manutenção?</Label>
                    <select value={formData.maintenanceType || ""} onChange={(e) => u("maintenanceType", e.target.value)} disabled={readOnly} className={selectCls}>
                        <option value="">Selecione...</option>
                        <option value="PREVENTIVA">Preventiva</option>
                        <option value="CORRETIVA">Corretiva</option>
                    </select>
                </div>

                <div className="space-y-2">
                    <Label className="text-[var(--zyllen-muted)]">O que foi feito?</Label>
                    <Input placeholder="Descreva o serviço realizado..." value={formData.workDone || ""} onChange={(e) => u("workDone", e.target.value)} readOnly={readOnly} className={inputCls} />
                </div>

                <div className="space-y-2">
                    <Label className="text-[var(--zyllen-muted)]">O software precisa de alguma correção?</Label>
                    <textarea placeholder="Descreva correções de software necessárias..." value={formData.softwareCorrection || ""} onChange={(e) => u("softwareCorrection", e.target.value)} readOnly={readOnly} rows={4} className={textareaCls} />
                </div>
            </div>

            {/* Fim do Trabalho */}
            <div className="space-y-4">
                <SectionTitle>Fim do Trabalho</SectionTitle>

                <div className="space-y-2">
                    <Label className="text-[var(--zyllen-muted)]">Diário de bordo</Label>
                    <textarea placeholder="Detalhes sobre a manutenção..." value={formData.logbook || ""} onChange={(e) => u("logbook", e.target.value)} readOnly={readOnly} rows={5} className={textareaCls} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label className="text-[var(--zyllen-muted)]">Nome de quem acompanhou</Label>
                        <Input placeholder="Nome completo" value={formData.witnessName || ""} onChange={(e) => u("witnessName", e.target.value)} readOnly={readOnly} className={inputCls} />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[var(--zyllen-muted)]">RG ou CPF de quem acompanhou</Label>
                        <Input placeholder="000.000.000-00" value={formData.witnessDocument || ""} onChange={(e) => u("witnessDocument", e.target.value)} readOnly={readOnly} className={inputCls} />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label className="text-[var(--zyllen-muted)]">Assinatura eletrônica de quem acompanhou</Label>
                    <Input placeholder="Nome por extenso (assinatura)" value={formData.witnessSignature || ""} onChange={(e) => u("witnessSignature", e.target.value)} readOnly={readOnly} className={inputCls} />
                </div>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════
// 5. SUPORTE REMOTO
// ═══════════════════════════════════════════════════
export function SuporteRemotoFormFields({ formData, onChange, readOnly }: OsFormFieldsProps) {
    const u = (key: string, value: any) => onChange({ ...formData, [key]: value });

    return (
        <div className="space-y-6">
            {/* Atendimento */}
            <div className="space-y-4">
                <SectionTitle>Atendimento</SectionTitle>

                <div className="space-y-2">
                    <Label className="text-[var(--zyllen-muted)]">Esse atendimento precisou acionar a R&S?</Label>
                    <select value={formData.rsActivated || ""} onChange={(e) => u("rsActivated", e.target.value)} disabled={readOnly} className={selectCls}>
                        <option value="">Selecione...</option>
                        <option value="SIM">Sim</option>
                        <option value="NAO">Não</option>
                    </select>
                </div>

                <div className="space-y-2">
                    <Label className="text-[var(--zyllen-muted)]">Descrição do problema</Label>
                    <textarea placeholder="Descreva o problema em detalhes..." value={formData.issueDescription || ""} onChange={(e) => u("issueDescription", e.target.value)} readOnly={readOnly} rows={5} className={textareaCls} />
                </div>
            </div>

            {/* Fim do Trabalho — Suporte Remoto: sem fotos, sem assinatura */}
            <div className="space-y-4">
                <SectionTitle>Fim do Trabalho</SectionTitle>

                <div className="space-y-2">
                    <Label className="text-[var(--zyllen-muted)]">Diário de bordo</Label>
                    <textarea placeholder="Detalhes sobre o atendimento remoto..." value={formData.logbook || ""} onChange={(e) => u("logbook", e.target.value)} readOnly={readOnly} rows={5} className={textareaCls} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                        <Label className="text-[var(--zyllen-muted)]">Nome do contato no local</Label>
                        <Input placeholder="Nome de quem auxiliou" value={formData.localContactName || ""} onChange={(e) => u("localContactName", e.target.value)} readOnly={readOnly} className={inputCls} />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[var(--zyllen-muted)]">Telefone do contato</Label>
                        <Input placeholder="(00) 00000-0000" value={formData.localContactPhone || ""} onChange={(e) => u("localContactPhone", e.target.value)} readOnly={readOnly} className={inputCls} />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[var(--zyllen-muted)]">Cargo do contato</Label>
                        <Input placeholder="Cargo ou função" value={formData.localContactRole || ""} onChange={(e) => u("localContactRole", e.target.value)} readOnly={readOnly} className={inputCls} />
                    </div>
                </div>

                {formData.rsActivated === "SIM" && (
                    <div className="space-y-2">
                        <Label className="text-[var(--zyllen-muted)]">Nome do técnico da R&S</Label>
                        <Input placeholder="Nome do técnico acionado" value={formData.rsTechnicianName || ""} onChange={(e) => u("rsTechnicianName", e.target.value)} readOnly={readOnly} className={inputCls} />
                    </div>
                )}
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════
// 6. TERCEIRIZADO
// ═══════════════════════════════════════════════════
export function TerceirizadoFormFields({ formData, onChange, readOnly }: OsFormFieldsProps) {
    const u = (key: string, value: any) => onChange({ ...formData, [key]: value });

    return (
        <div className="space-y-6">
            {/* Dados Adicionais */}
            <div className="space-y-4">
                <SectionTitle>Informações do Atendimento</SectionTitle>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                        <Label className="text-[var(--zyllen-muted)]">Nome do contato no local</Label>
                        <Input placeholder="Nome completo" value={formData.localContactName || ""} onChange={(e) => u("localContactName", e.target.value)} readOnly={readOnly} className={inputCls} />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[var(--zyllen-muted)]">Telefone do contato</Label>
                        <Input placeholder="(00) 00000-0000" value={formData.localContactPhone || ""} onChange={(e) => u("localContactPhone", e.target.value)} readOnly={readOnly} className={inputCls} />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[var(--zyllen-muted)]">Cargo do contato</Label>
                        <Input placeholder="Cargo ou função" value={formData.localContactRole || ""} onChange={(e) => u("localContactRole", e.target.value)} readOnly={readOnly} className={inputCls} />
                    </div>
                </div>
            </div>

            {/* Solicitação do Atendimento */}
            <div className="space-y-4">
                <SectionTitle>Solicitação do Atendimento</SectionTitle>

                <div className="space-y-2">
                    <Label className="text-[var(--zyllen-muted)]">Escopo do serviço</Label>
                    <textarea placeholder="Descreva o escopo completo do serviço..." value={formData.serviceScope || ""} onChange={(e) => u("serviceScope", e.target.value)} readOnly={readOnly} rows={4} className={textareaCls} />
                </div>

                <div className="space-y-2">
                    <Label className="text-[var(--zyllen-muted)]">Descrição do atendimento</Label>
                    <textarea placeholder="Descreva o atendimento realizado..." value={formData.serviceDescription || ""} onChange={(e) => u("serviceDescription", e.target.value)} readOnly={readOnly} rows={4} className={textareaCls} />
                </div>

                <div className="space-y-2">
                    <Label className="text-[var(--zyllen-muted)]">Equipamento/backup utilizado</Label>
                    <textarea placeholder="Caso tenha utilizado algum equipamento ou backup, descreva..." value={formData.equipmentUsed || ""} onChange={(e) => u("equipmentUsed", e.target.value)} readOnly={readOnly} rows={3} className={textareaCls} />
                </div>
            </div>

            {/* Fim do Trabalho — Terceirizado: duas assinaturas */}
            <div className="space-y-4">
                <SectionTitle>Fim do Trabalho</SectionTitle>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label className="text-[var(--zyllen-muted)]">Analista Skyline que acompanhou</Label>
                        <Input placeholder="Nome do analista" value={formData.skylineAnalyst || ""} onChange={(e) => u("skylineAnalyst", e.target.value)} readOnly={readOnly} className={inputCls} />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[var(--zyllen-muted)]">Técnico</Label>
                        <Input placeholder="Nome do técnico" value={formData.technicianName || ""} onChange={(e) => u("technicianName", e.target.value)} readOnly={readOnly} className={inputCls} />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label className="text-[var(--zyllen-muted)]">Assinatura de quem acompanhou</Label>
                        <Input placeholder="Nome por extenso (assinatura)" value={formData.witnessSignature || ""} onChange={(e) => u("witnessSignature", e.target.value)} readOnly={readOnly} className={inputCls} />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[var(--zyllen-muted)]">Assinatura do técnico</Label>
                        <Input placeholder="Nome por extenso (assinatura)" value={formData.technicianSignature || ""} onChange={(e) => u("technicianSignature", e.target.value)} readOnly={readOnly} className={inputCls} />
                    </div>
                </div>
            </div>
        </div>
    );
}
