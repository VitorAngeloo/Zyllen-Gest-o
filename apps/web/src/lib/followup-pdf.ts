// ============================================
// Zyllen Gestão — Acompanhamento PDF Generator (print-based)
// ============================================

export interface FollowupPdfBlock {
    id: string;
    type: "TEXT" | "MEDIA";
    title?: string | null;
    content?: string | null;
    order: number;
    attachments: { id: string; fileName: string; mimeType?: string | null }[];
    comments: { text: string; createdAt: string; author: { name: string } }[];
}

export interface FollowupPdfData {
    code: string;
    status: string;
    createdAt: string;
    updatedAt: string;
    responsibleName?: string | null;
    responsibleContact?: string | null;
    company: {
        name: string;
        cnpj?: string | null;
        address?: string | null;
        city?: string | null;
        state?: string | null;
        phone?: string | null;
    };
    createdBy: { name: string; email: string };
    blocks: FollowupPdfBlock[];
    /** base URL to build attachment image URLs – e.g. http://localhost:3001 */
    apiBaseUrl: string;
    followupId: string;
}

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
    IN_PROGRESS: { label: "Em Andamento", cls: "badge-progress" },
    PENDING: { label: "Pendente", cls: "badge-pending" },
    COMPLETED: { label: "Concluído", cls: "badge-completed" },
};

function esc(s: string): string {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function fmtDate(v: string | null | undefined): string {
    if (!v) return "—";
    try {
        return new Date(v).toLocaleString("pt-BR");
    } catch {
        return v;
    }
}

function buildBlocksHtml(data: FollowupPdfData): string {
    if (!data.blocks.length) return "";

    const sorted = [...data.blocks].sort((a, b) => a.order - b.order);

    return sorted.map((block, idx) => {
        const typeLabel = block.type === "TEXT" ? "Texto" : "Mídia";
        const heading = block.title ? esc(block.title) : `Bloco ${idx + 1}`;

        let contentHtml = "";

        // Text content
        if (block.content) {
            contentHtml += `<div class="block-text">${esc(block.content)}</div>`;
        }

        // Attachments (images rendered inline, others listed)
        if (block.attachments.length > 0) {
            const images = block.attachments.filter(a => a.mimeType?.startsWith("image/"));
            const others = block.attachments.filter(a => !a.mimeType?.startsWith("image/"));

            if (images.length > 0) {
                contentHtml += `<div class="att-grid">`;
                for (const img of images) {
                    const url = `${data.apiBaseUrl}/followups/${data.followupId}/blocks/${block.id}/attachments/${img.id}/file`;
                    contentHtml += `<div class="att-img-wrap"><img src="${esc(url)}" alt="${esc(img.fileName)}" /><span class="att-name">${esc(img.fileName)}</span></div>`;
                }
                contentHtml += `</div>`;
            }
            if (others.length > 0) {
                contentHtml += `<div class="att-list">`;
                for (const f of others) {
                    contentHtml += `<span class="att-file">📎 ${esc(f.fileName)}</span>`;
                }
                contentHtml += `</div>`;
            }
        }

        // Comments
        let commentsHtml = "";
        if (block.comments.length > 0) {
            commentsHtml = `
                <div class="comments">
                    <div class="comments-title">💬 ${block.comments.length} comentário(s)</div>
                    ${block.comments.map(c => `
                        <div class="comment">
                            <strong>${esc(c.author.name)}</strong>
                            <span class="comment-date">${fmtDate(c.createdAt)}</span>
                            <p>${esc(c.text)}</p>
                        </div>
                    `).join("")}
                </div>
            `;
        }

        return `
            <div class="block">
                <div class="block-header">
                    <span class="block-type ${block.type === "TEXT" ? "type-text" : "type-media"}">${typeLabel}</span>
                    <span class="block-heading">${heading}</span>
                </div>
                ${contentHtml}
                ${commentsHtml}
            </div>
        `;
    }).join("");
}

export function printFollowupPdf(data: FollowupPdfData): void {
    const st = STATUS_LABELS[data.status] ?? STATUS_LABELS.IN_PROGRESS;
    const location = [data.company.address, data.company.city, data.company.state].filter(Boolean).join(", ");

    const blocksHtml = buildBlocksHtml(data);

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <title>Acompanhamento ${esc(data.code)}</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 12px; color: #111; padding: 24px; }

        /* Header */
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #111; padding-bottom: 12px; margin-bottom: 16px; }
        .header h1 { font-size: 20px; letter-spacing: 2px; }
        .header .code { font-size: 16px; color: #555; font-family: monospace; }
        .badge { display: inline-block; padding: 2px 10px; border-radius: 4px; font-weight: 600; font-size: 11px; }
        .badge-progress { background: #dbeafe; color: #1e40af; border: 1px solid #3b82f6; }
        .badge-pending { background: #fef3c7; color: #92400e; border: 1px solid #f59e0b; }
        .badge-completed { background: #d1fae5; color: #065f46; border: 1px solid #10b981; }

        /* Sections */
        h3 { font-size: 13px; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid #ddd; padding-bottom: 4px; margin: 16px 0 8px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
        td { padding: 6px 8px; border: 1px solid #e5e7eb; vertical-align: top; }
        td.label { background: #f9fafb; font-weight: 600; width: 180px; }

        /* Blocks */
        .blocks-title { font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; border-bottom: 2px solid #333; padding-bottom: 4px; margin: 24px 0 12px; }
        .block { border: 1px solid #e5e7eb; border-radius: 6px; margin-bottom: 14px; overflow: hidden; page-break-inside: avoid; }
        .block-header { background: #f9fafb; padding: 8px 12px; border-bottom: 1px solid #e5e7eb; display: flex; align-items: center; gap: 8px; }
        .block-type { font-size: 10px; font-weight: 600; text-transform: uppercase; padding: 2px 6px; border-radius: 3px; }
        .type-text { background: #dbeafe; color: #1e40af; }
        .type-media { background: #ede9fe; color: #6d28d9; }
        .block-heading { font-weight: 600; font-size: 12px; }
        .block-text { padding: 10px 12px; white-space: pre-wrap; line-height: 1.5; }

        /* Attachments */
        .att-grid { display: flex; flex-wrap: wrap; gap: 8px; padding: 10px 12px; }
        .att-img-wrap { width: 140px; border: 1px solid #e5e7eb; border-radius: 4px; overflow: hidden; text-align: center; }
        .att-img-wrap img { width: 100%; height: 100px; object-fit: cover; display: block; }
        .att-name { font-size: 9px; color: #666; padding: 2px 4px; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .att-list { padding: 6px 12px; }
        .att-file { display: inline-block; margin-right: 10px; font-size: 11px; color: #444; }

        /* Comments */
        .comments { padding: 8px 12px; border-top: 1px solid #e5e7eb; background: #fafafa; }
        .comments-title { font-size: 11px; font-weight: 600; color: #666; margin-bottom: 6px; }
        .comment { margin-bottom: 6px; font-size: 11px; }
        .comment strong { color: #111; }
        .comment-date { color: #999; margin-left: 6px; font-size: 10px; }
        .comment p { color: #444; margin-top: 2px; }

        /* Footer */
        .footer { margin-top: 32px; border-top: 1px solid #ccc; padding-top: 12px; font-size: 10px; color: #888; text-align: center; }

        @media print {
            body { padding: 0; }
            .no-print { display: none; }
            .block { page-break-inside: avoid; }
        }
    </style>
</head>
<body>
    <div class="header">
        <div>
            <h1>ZYLLEN GESTÃO</h1>
            <span>Relatório de Acompanhamento</span>
        </div>
        <div style="text-align: right">
            <div class="code">${esc(data.code)}</div>
            <span class="badge ${st.cls}">${esc(st.label)}</span>
        </div>
    </div>

    <h3>Informações da Empresa</h3>
    <table>
        <tr><td class="label">Empresa</td><td>${esc(data.company.name)}</td></tr>
        ${data.company.cnpj ? `<tr><td class="label">CNPJ</td><td>${esc(data.company.cnpj)}</td></tr>` : ""}
        ${location ? `<tr><td class="label">Localização</td><td>${esc(location)}</td></tr>` : ""}
        ${data.company.phone ? `<tr><td class="label">Telefone</td><td>${esc(data.company.phone)}</td></tr>` : ""}
    </table>

    <h3>Dados do Acompanhamento</h3>
    <table>
        <tr><td class="label">Colaborador</td><td>${esc(data.createdBy.name)}</td></tr>
        <tr><td class="label">E-mail Colaborador</td><td>${esc(data.createdBy.email)}</td></tr>
        <tr><td class="label">Responsável do Cliente</td><td>${esc(data.responsibleName || "—")}</td></tr>
        <tr><td class="label">Contato do Responsável</td><td>${esc(data.responsibleContact || "—")}</td></tr>
        <tr><td class="label">Data de Criação</td><td>${fmtDate(data.createdAt)}</td></tr>
        <tr><td class="label">Última Atualização</td><td>${fmtDate(data.updatedAt)}</td></tr>
        <tr><td class="label">Status</td><td><span class="badge ${st.cls}">${esc(st.label)}</span></td></tr>
    </table>

    ${data.blocks.length > 0 ? `
        <div class="blocks-title">Blocos de Registro (${data.blocks.length})</div>
        ${blocksHtml}
    ` : `
        <h3>Blocos de Registro</h3>
        <p style="color: #888; padding: 8px 0;">Nenhum bloco registrado.</p>
    `}

    <div class="footer">
        Gerado em ${new Date().toLocaleString("pt-BR")} — Zyllen Gestão © ${new Date().getFullYear()}
    </div>

    <script>
        // Wait for images to load before printing
        window.onload = function() {
            const imgs = document.querySelectorAll('img');
            if (imgs.length === 0) { window.print(); return; }
            let loaded = 0;
            const checkDone = () => { loaded++; if (loaded >= imgs.length) setTimeout(() => window.print(), 200); };
            imgs.forEach(img => {
                if (img.complete) { checkDone(); }
                else { img.onload = checkDone; img.onerror = checkDone; }
            });
            // Fallback: print after 5s even if images fail
            setTimeout(() => window.print(), 5000);
        };
    </script>
</body>
</html>`;

    const win = window.open("", "_blank");
    if (!win) {
        const iframe = document.createElement("iframe");
        iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:none;";
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
