// ============================================
// Zyllen Gestão — OS PDF Generator (print-based)
// ============================================

import { OS_FORM_CONFIG } from "@web/components/os-forms";
import type { OsFormType } from "@web/components/os-forms";

export interface OsPdfData {
    osNumber: string;
    formType: string;
    status: string;
    clientName?: string | null;
    clientCity?: string | null;
    clientState?: string | null;
    location?: string | null;
    contactName?: string | null;
    contactPhone?: string | null;
    contactRole?: string | null;
    startedAt?: string | null;
    endedAt?: string | null;
    createdAt: string;
    openedBy?: string | null;
    openedByContractor?: string | null;
    formData?: Record<string, unknown> | null;
    asset?: { assetCode?: string; sku?: { name?: string } } | null;
}

const STATUS_LABELS: Record<string, string> = {
    OPEN: "Aberta",
    IN_PROGRESS: "Em Andamento",
    CLOSED: "Encerrada",
};

const FIELD_LABELS: Record<string, string> = {
    roomModel: "Modelo da sala",
    screenDimensions: "Dimensões da tela",
    hasOutlets: "Pontos de tomada",
    internetType: "Tipo de Internet",
    easyAccess: "Fácil acesso",
    safeLocation: "Local seguro",
    displayType: "Tipo display",
    displayModel: "Modelo display",
    computerConfig: "Configuração PC",
    soundEquipment: "Equipamento de som",
    tabletTotem: "Tablet/Totem",
    cameraInstalled: "Câmera instalada",
    anydeskAlias: "Anydesk Alias",
    logbook: "Diário de bordo",
    witnessName: "Acompanhante",
    witnessDocument: "Doc. acompanhante",
    witnessSignature: "Assinatura acompanhante",
    totemCondition: "Condição do totem",
    uninstalledServiceType: "Tipo desinstalado",
    equipmentCondition: "Condição equipamento",
    uninstalledEquipment: "Equipamentos desinstalados",
    infrastructureIssues: "Problemas infraestrutura",
    maintenanceType: "Tipo manutenção",
    workDone: "Serviço realizado",
    softwareCorrection: "Correção software",
    rsActivated: "R&S acionada",
    issueDescription: "Descrição do problema",
    localContactName: "Contato no local",
    localContactPhone: "Telefone contato",
    localContactRole: "Cargo contato",
    rsTechnicianName: "Técnico R&S",
    serviceScope: "Escopo do serviço",
    serviceDescription: "Descrição atendimento",
    equipmentUsed: "Equipamento utilizado",
    skylineAnalyst: "Analista Skyline",
    technicianName: "Técnico",
    technicianSignature: "Assinatura técnico",
};

function formatDate(v: string | null | undefined): string {
    if (!v) return "—";
    try {
        return new Date(v).toLocaleString("pt-BR");
    } catch {
        return v;
    }
}

function escapeHtml(s: string): string {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function printOsPdf(data: OsPdfData): void {
    const formTypeLabel = OS_FORM_CONFIG[data.formType as OsFormType]?.label || data.formType;
    const statusLabel = STATUS_LABELS[data.status] || data.status;

    let formDataHtml = "";
    if (data.formData && typeof data.formData === "object") {
        const entries = Object.entries(data.formData).filter(([, v]) => v !== null && v !== undefined && v !== "");
        if (entries.length > 0) {
            formDataHtml = `
                <h3>Detalhes do Serviço</h3>
                <table>
                    ${entries.map(([key, value]) => `
                        <tr>
                            <td class="label">${escapeHtml(FIELD_LABELS[key] || key)}</td>
                            <td>${escapeHtml(String(value))}</td>
                        </tr>
                    `).join("")}
                </table>
            `;
        }
    }

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <title>OS ${escapeHtml(data.osNumber)}</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 12px; color: #111; padding: 24px; }
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #111; padding-bottom: 12px; margin-bottom: 16px; }
        .header h1 { font-size: 20px; letter-spacing: 2px; }
        .header .os-number { font-size: 16px; color: #555; }
        .badge { display: inline-block; padding: 2px 10px; border-radius: 4px; font-weight: 600; font-size: 11px; }
        .badge-open { background: #fef3c7; color: #92400e; border: 1px solid #f59e0b; }
        .badge-progress { background: #dbeafe; color: #1e40af; border: 1px solid #3b82f6; }
        .badge-closed { background: #d1fae5; color: #065f46; border: 1px solid #10b981; }
        h3 { font-size: 13px; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid #ddd; padding-bottom: 4px; margin: 16px 0 8px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
        td { padding: 6px 8px; border: 1px solid #e5e7eb; vertical-align: top; }
        td.label { background: #f9fafb; font-weight: 600; width: 180px; }
        .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 0; }
        .footer { margin-top: 32px; border-top: 1px solid #ccc; padding-top: 12px; font-size: 10px; color: #888; text-align: center; }
        @media print { body { padding: 0; } .no-print { display: none; } }
    </style>
</head>
<body>
    <div class="header">
        <div>
            <h1>ZYLLEN GESTÃO</h1>
            <span>Ordem de Serviço</span>
        </div>
        <div style="text-align: right">
            <div class="os-number">${escapeHtml(data.osNumber)}</div>
            <span class="badge ${data.status === "OPEN" ? "badge-open" : data.status === "IN_PROGRESS" ? "badge-progress" : "badge-closed"}">${escapeHtml(statusLabel)}</span>
        </div>
    </div>

    <h3>Informações Gerais</h3>
    <table>
        <tr><td class="label">Tipo de OS</td><td>${escapeHtml(formTypeLabel)}</td></tr>
        <tr><td class="label">Empresa / Cliente</td><td>${escapeHtml(data.clientName || "—")}</td></tr>
        <tr><td class="label">Estado / Cidade</td><td>${escapeHtml([data.clientState, data.clientCity].filter(Boolean).join(" — ") || "—")}</td></tr>
        <tr><td class="label">Localização</td><td>${escapeHtml(data.location || "—")}</td></tr>
        ${data.asset ? `<tr><td class="label">Patrimônio</td><td>${escapeHtml(data.asset.assetCode || "—")} — ${escapeHtml(data.asset.sku?.name || "")}</td></tr>` : ""}
        <tr><td class="label">Aberta em</td><td>${formatDate(data.createdAt)}</td></tr>
        <tr><td class="label">Início do serviço</td><td>${formatDate(data.startedAt)}</td></tr>
        <tr><td class="label">Fim do serviço</td><td>${formatDate(data.endedAt)}</td></tr>
        <tr><td class="label">Aberta por</td><td>${escapeHtml(data.openedBy || data.openedByContractor || "—")}</td></tr>
    </table>

    ${(data.contactName || data.contactPhone || data.contactRole) ? `
    <h3>Contato no Local (Responsável)</h3>
    <table>
        <tr><td class="label">Nome</td><td>${escapeHtml(data.contactName || "—")}</td></tr>
        <tr><td class="label">Telefone</td><td>${escapeHtml(data.contactPhone || "—")}</td></tr>
        <tr><td class="label">Cargo</td><td>${escapeHtml(data.contactRole || "—")}</td></tr>
    </table>
    ` : ""}

    ${formDataHtml}

    <div class="footer">
        Gerado em ${new Date().toLocaleString("pt-BR")} — Zyllen Gestão © ${new Date().getFullYear()}
    </div>

    <script>window.onload = function() { window.print(); }</script>
</body>
</html>`;

    const win = window.open("", "_blank");
    if (!win) {
        // Popup blocked — fallback: use hidden iframe
        const iframe = document.createElement("iframe");
        iframe.style.position = "fixed";
        iframe.style.right = "0";
        iframe.style.bottom = "0";
        iframe.style.width = "0";
        iframe.style.height = "0";
        iframe.style.border = "none";
        document.body.appendChild(iframe);
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        if (!iframeDoc) {
            document.body.removeChild(iframe);
            alert("Não foi possível gerar o PDF. Verifique se popups estão permitidos para este site.");
            return;
        }
        iframeDoc.open();
        iframeDoc.write(html.replace("window.print()", "window.parent.document.querySelector('iframe')?.contentWindow?.print()"));
        iframeDoc.close();
        setTimeout(() => {
            iframe.contentWindow?.print();
            setTimeout(() => document.body.removeChild(iframe), 1000);
        }, 500);
        return;
    }
    win.document.write(html);
    win.document.close();
}
