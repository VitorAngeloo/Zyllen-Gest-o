// ============================================
// Zyllen Systems — OS PDF Generator (print-based)
// ============================================

import { OS_FORM_CONFIG } from "@web/features/maintenance/types/os-form.types";
import type { OsFormType } from "@web/features/maintenance/types/os-form.types";
import { getOsFieldRows } from "@web/features/maintenance/utils/os-form-view";

export interface OsPdfFollowupBlock {
    id: string;
    type: "TEXT" | "MEDIA" | "SIGNATURE";
    content?: string | null;
    order: number;
    attachments: Array<{ id: string; fileName: string; mimeType?: string | null; fileUrl: string }>;
}

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
    startedAt?: string | null;
    endedAt?: string | null;
    createdAt: string;
    openedBy?: string | null;
    openedByContractor?: string | null;
    formData?: Record<string, unknown> | null;
    asset?: { assetCode?: string; sku?: { name?: string } } | null;
    /** Pre-computed full URLs for attachment files */
    attachments?: Array<{ id: string; fileName: string; mimeType?: string | null; fileUrl: string }>;
    /** Followup blocks for Acompanhamento de 7 dias (INSTALACAO_SALA) */
    followupBlocks?: OsPdfFollowupBlock[];
}

interface OsPdfHtmlOptions {
    brandLogoUrl?: string;
    generatedAt?: Date;
    autoPrint?: boolean;
}

// Self-contained copy of public/brand/zyllen-wordmark.svg. Print popups can have an
// about:blank document URL, so an embedded data URI keeps the official vector reliable.
const BRAND_WORDMARK_DATA_URI = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9Ijg1MCA5OTAgMjMwMCAyNzAiIHJvbGU9ImltZyIgYXJpYS1sYWJlbGxlZGJ5PSJ6eWxsZW4tdGl0bGUiPgogIDx0aXRsZSBpZD0ienlsbGVuLXRpdGxlIj5aeWxsZW4gU3lzdGVtczwvdGl0bGU+CiAgPGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMCAyMjUwKSBzY2FsZSguMSAtLjEpIiBzdHJva2U9Im5vbmUiPgogICAgPGcgZmlsbD0iI0ZGRkZGRiI+CiAgICAgIDxwYXRoIGQ9Ik04Njc3IDEyNDQzIGMtNCAtMyAtNyAtNDQgLTcgLTkwIGwwIC04MyA0MDMgMCA0MDIgMCAxMjggODUgYzcwIDQ3CjEyNyA4NyAxMjcgOTAgMCA4IC0xMDQ2IDYgLTEwNTMgLTJ6Ii8+CiAgICAgIDxwYXRoIGQ9Ik05NTQwIDExODcwIGwtODcxIC01ODAgMyAtODggMyAtODcgMTMzMyAtMyAxMzMyIC0yIDAgOTAgMCA5MCAtODY3CjAgLTg2OCAwIDg2MyA1NzUgYzQ3NCAzMTYgODYyIDU3NyA4NjIgNTgwIDAgMyAtMjA3IDUgLTQ2MCA1IGwtNDYwIDAgLTg3MAotNTgweiIvPgogICAgICA8cGF0aCBkPSJNMTI2OTMgMTI0MzMgYzkgLTEwIDIxOCAtMTkxIDQ2NiAtNDAzIGw0NTAgLTM4NSAxIC0yNjggMCAtMjY3IDM5OAoyIDM5NyAzIDIgMjYwIGMyIDE0MyAwIDI2NSAtNSAyNzEgLTQgNiAtMjE1IDE4OSAtNDcwIDQwNyBsLTQ2MyAzOTcgLTM5NiAwCmMtMzc3IDAgLTM5NSAtMSAtMzgwIC0xN3oiLz4KICAgICAgPHBhdGggZD0iTTE0ODAwIDEyMjA5IGMtMTUxIC0xMzIgLTI4OCAtMjUzIC0zMDUgLTI3MCBsLTMwIC0yOSAxMzAgMCAxMzAgMAoyNzAgMjM2IGMxNDkgMTI5IDI4NiAyNTEgMzA1IDI2OSBsMzUgMzUgLTEzMCAwIC0xMzAgMCAtMjc1IC0yNDF6Ii8+CiAgICAgIDxwYXRoIGQ9Ik0xNjY3MCAxMTc4MCBsMCAtNjcwIDEzMzMgMiAxMzMyIDMgMyA4OCAzIDg3IC05MzYgMCAtOTM1IDAgMCA1ODAgMAo1ODAgLTQwMCAwIC00MDAgMCAwIC02NzB6Ii8+CiAgICAgIDxwYXRoIGQ9Ik0yMDY3MCAxMTc4MCBsMCAtNjcwIDEzMzMgMiAxMzMyIDMgMyA4OCAzIDg3IC05MzYgMCAtOTM1IDAgMCA1ODAgMAo1ODAgLTQwMCAwIC00MDAgMCAwIC02NzB6Ii8+CiAgICAgIDxwYXRoIGQ9Ik0yNDY3MCAxMTc4MCBsMCAtNjcwIDEzMzAgMCAxMzMwIDAgMCA5MCAwIDkwIC05MzAgMCAtOTMwIDAgMCA0OTAgMAo0OTAgOTMwIDAgOTMwIDAgMCA5MCAwIDkwIC0xMzMwIDAgLTEzMzAgMCAwIC02NzB6Ii8+CiAgICAgIDxwYXRoIGQ9Ik0yODY3MCAxMTc4MCBsMCAtNjcwIDg1IDAgODUgMCAwIDM4NCBjMCAyMTIgMyAzODcgOCAzOTAgNCAyIDM4NwotMTcxIDg1MSAtMzg1IGw4NDMgLTM4OSAzOTQgMCAzOTQgMCAwIDI0OCAwIDI0OSAtMjcgMTMgYy0xNiA3IC00MzcgMTk2IC05MzYKNDIxIGwtOTA4IDQwOSAtMzk1IDAgLTM5NCAwIDAgLTY3MHoiLz4KICAgICAgPHBhdGggZD0iTTMxMTYyIDEyMjE5IGwzIC0yMzAgNzggLTM1IGM0MyAtMTkgODAgLTM0IDgyIC0zNCAzIDAgNSAxMTkgNSAyNjUKbDAgMjY1IC04NSAwIC04NSAwIDIgLTIzMXoiLz4KICAgICAgPHBhdGggZD0iTTI2MDAwIDExNzgwIGwwIC05MCA1MzUgMCA1MzUgMCAwIDkwIDAgOTAgLTUzNSAwIC01MzUgMCAwIC05MHoiLz4KICAgIDwvZz4KICAgIDxnIGZpbGw9IiNBQkZGMTAiPgogICAgICA8cGF0aCBkPSJNMTMwMTUgMTA1NzQgYy02MSAtOSAtMTE1IC0zNSAtMTMwIC02MyAtMjEgLTQxIC0yNyAtMTIwIC0xMiAtMTYwIDYKLTE5IDI1IC00NCA0MCAtNTUgMjYgLTE5IDQ2IC0yMSAyMjcgLTI2IDE5MCAtNSAyMDEgLTYgMjIyIC0yNyAxOCAtMTkgMjAgLTI3CjEyIC01MCAtMTQgLTQwIC00NyAtNTIgLTE3MCAtNTggLTE0OSAtOCAtMTk1IDEgLTIxMyA0MiAtMTcgMzkgLTI1IDQyIC04NSAzNgpsLTQ4IC02IDYgLTQxIGM5IC01NCAzMCAtODUgNjkgLTEwMSA3NSAtMzEgNDI3IC0yNyA0OTkgNiAzOSAxNyA1OSA1MiA2NSAxMTIKNyA3MyAtMTMgMTI2IC01NyAxNTEgLTMxIDE5IC01NyAyMSAtMjMyIDI2IC0xMzUgMyAtMjAxIDkgLTIwOSAxNyAtMTUgMTUgLTE2CjcwIC0yIDg0IDE5IDE5IDg1IDI5IDE4OCAyOCAxMTggMCAxNjkgLTE0IDE3MyAtNDYgMyAtMjEgOSAtMjMgNjMgLTIzIDU2IDAKNTkgMSA1OSAyNSAwIDE0IC03IDQxIC0xNSA2MSAtMjQgNTcgLTYyIDY4IC0yNTUgNzAgLTkxIDEgLTE3OCAwIC0xOTUgLTJ6Ii8+CiAgICAgIDxwYXRoIGQ9Ik0xNTExMCAxMDU3MiBjMCAtNCA2NSAtNzkgMTQ1IC0xNjYgbDE0NSAtMTU4IDAgLTk5IDAgLTk5IDYwIDAgNjAgMAowIDk4IDAgOTcgMTUwIDE2MyBjODMgOTAgMTUwIDE2NiAxNTAgMTY4IDAgMiAtMzMgNCAtNzQgNCBsLTc0IDAgLTEwMiAtMTE1CmMtNTYgLTY0IC0xMDUgLTExNSAtMTEwIC0xMTMgLTQgMiAtNTIgNTMgLTEwNyAxMTMgbC05OSAxMTAgLTcyIDMgYy00MCAyIC03MgotMSAtNzIgLTZ6Ii8+CiAgICAgIDxwYXRoIGQ9Ik0xNzU3NSAxMDU3NCBjLTYxIC05IC0xMTUgLTM1IC0xMzAgLTYzIC0yMyAtNDYgLTI5IC0xMjIgLTEyIC0xNjMKMjggLTY3IDQ3IC03MiAyNzAgLTc4IDE5NCAtNSAxOTkgLTYgMjE4IC0yOSAyNCAtMjkgMjQgLTQzIDEgLTcyIC0xNiAtMTkgLTMzCi0yNCAtMTIzIC0zMiAtNjYgLTcgLTEyOSAtNyAtMTY5IC0xIC01NyA4IC02NiAxMiAtODAgMzkgLTE5IDM3IC0yNiA0MyAtNTMKNDAgLTEyIC0xIC0zNSAtMyAtNTEgLTQgLTI4IC0xIC0yOCAtMiAtMjIgLTQzIDE1IC05NSA1MCAtMTEzIDIyNiAtMTIzIDE0MQotOCAzMDMgNiAzNDggMjkgNTkgMzEgODEgMTYzIDM3IDIyOSAtMjggNDQgLTU4IDUwIC0yNjggNTYgLTE4MSA2IC0yMDAgOAotMjEzIDI1IC0zMCA0MiAtOSA4MiA1MSA5NiA1NCAxMyAyMjEgMTIgMjY3IC0xIDI3IC03IDQwIC0xNyA0NCAtMzQgNiAtMjMgMTEKLTI1IDY1IC0yNSA1NiAwIDU5IDEgNTkgMjUgMCAxNCAtNyA0MSAtMTUgNjEgLTI0IDU3IC02MiA2OCAtMjU1IDcwIC05MSAxCi0xNzggMCAtMTk1IC0yeiIvPgogICAgICA8cGF0aCBkPSJNMTk2NjAgMTA1MzAgbDAgLTQ5IDEyMyAtMyAxMjIgLTMgMyAtMjEyIDIgLTIxMyA2MCAwIDYwIDAgMCAyMTUgMAoyMTUgMTI2IDAgMTI1IDAgLTMgNDggLTMgNDcgLTMwNyAzIC0zMDggMiAwIC01MHoiLz4KICAgICAgPHBhdGggZD0iTTIxODc1IDEwNTY3IGMtMyAtNyAtNCAtMTI1IC0zIC0yNjIgbDMgLTI1MCAyODMgLTMgMjgyIC0yIDAgNDUgMAo0NSAtMjIyIDIgLTIyMyAzIDAgNjUgMCA2NSAyMDggMyAyMDcgMiAwIDQwIDAgNDAgLTIxMCAwIC0yMTAgMCAwIDYwIDAgNjAKMjIzIDIgMjIyIDMgMCA0NSAwIDQ1IC0yNzggMyBjLTIxOSAyIC0yNzkgMCAtMjgyIC0xMXoiLz4KICAgICAgPHBhdGggZD0iTTI0MDQwIDEwMzE1IGwwIC0yNjUgNjAgMCA2MCAwIDAgMjEyIDAgMjEyIDEzMiAtMjEyIDEzMyAtMjEyIDUwIDAKNTAgMSAxMzAgMjA4IDEzMCAyMDkgMyAtMjA5IDIgLTIwOSA2MCAwIDYwIDAgLTIgMjYzIC0zIDI2MiAtODMgMyBjLTQ3IDIgLTg5Ci0yIC05NiAtNyAtNyAtNiAtNjYgLTk2IC0xMzEgLTIwMSAtMTAzIC0xNjUgLTEyMCAtMTg4IC0xMzAgLTE3MiAtNyA5IC01OCA5MQotMTE1IDE4MiAtNTYgOTEgLTEwOSAxNzMgLTExOCAxODMgLTEyIDE0IC0zMiAxNyAtMTA0IDE3IGwtODggMCAwIC0yNjV6Ii8+CiAgICAgIDxwYXRoIGQ9Ik0yNjY0MCAxMDU2OSBjLTMwIC01IC02NSAtMTYgLTc4IC0yNSAtNDkgLTMyIC02OCAtMTQyIC0zNiAtMjA5IDI1Ci01NCA2NyAtNjUgMjU3IC02NiAxOTEgMCAyMzEgLTkgMjM1IC01NCA1IC01MyAtMTQgLTY2IC0xMTQgLTc3IC04OCAtMTAgLTIxMgotNiAtMjQ3IDcgLTEwIDQgLTIxIDIwIC0yNCAzNiAtMyAxNiAtMTEgMjkgLTE3IDMwIC0xMyAxIC04OCAxIC0xMDAgMCAtMTMgLTIKMCAtODggMTggLTExNSAyNiAtNDAgODIgLTUwIDI4NiAtNTAgMjc4IDAgMzEyIDE3IDMxOCAxNTMgNCA3NCAzIDgwIC0yNCAxMTAKLTM5IDQzIC03OCA1MCAtMjY5IDUxIC0xODEgMCAtMjA4IDcgLTIxMyA1NiAtNSA1MyAyMSA2NiAxNDYgNzIgMTUxIDcgMTk5IC0yCjIyMCAtMzkgMTYgLTI3IDIxIC0yOSA3NSAtMjkgbDU4IDAgLTYgMzggYy04IDQ3IC0zMyA4MyAtNzEgMTAyIC0zNSAxNyAtMzI5CjI0IC00MTQgOXoiLz4KICAgIDwvZz4KICA8L2c+Cjwvc3ZnPgo=";

const STATUS_LABELS: Record<string, string> = {
    OPEN: "Aberta",
    IN_PROGRESS: "Em andamento",
    CLOSED: "Encerrada",
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

function escapeAttr(s: string): string {
    return escapeHtml(s).replace(/'/g, "&#39;");
}

function detailItem(label: string, value: string, className = ""): string {
    return `
        <div class="info-item ${className}">
            <span class="info-label">${escapeHtml(label)}</span>
            <span class="info-value">${escapeHtml(value)}</span>
        </div>`;
}

function attachmentCard(att: { fileName: string; mimeType?: string | null; fileUrl: string }): string {
    const isImage = att.mimeType?.startsWith("image/");
    const isVideo = att.mimeType?.startsWith("video/");

    return `<figure class="attachment-item">
        ${isImage
            ? `<img src="${escapeAttr(att.fileUrl)}" alt="${escapeAttr(att.fileName)}" />`
            : `<div class="attachment-placeholder"><span>${isVideo ? "▶" : "↗"}</span>${isVideo ? "Vídeo" : "Arquivo"}</div>`}
        <figcaption title="${escapeAttr(att.fileName)}">${escapeHtml(att.fileName)}</figcaption>
    </figure>`;
}

export function buildOsPdfHtml(data: OsPdfData, options: OsPdfHtmlOptions = {}): string {
    const formTypeLabel = OS_FORM_CONFIG[data.formType as OsFormType]?.label || data.formType;
    const statusLabel = STATUS_LABELS[data.status] || data.status;
    const statusClass = data.status === "OPEN"
        ? "badge-open"
        : data.status === "IN_PROGRESS"
            ? "badge-progress"
            : data.status === "CLOSED"
                ? "badge-closed"
                : "badge-neutral";
    const generatedAt = options.generatedAt ?? new Date();
    const brandLogoUrl = options.brandLogoUrl ?? BRAND_WORDMARK_DATA_URI;
    const formRows = getOsFieldRows(data.formType, data.formData as Record<string, unknown> | null | undefined);
    const followupBlocks = data.followupBlocks ?? [];

    const formDataHtml = formRows.length > 0
        ? `
            <section class="section">
                <div class="section-heading"><span class="section-index"></span><h2>Detalhes do serviço</h2></div>
                <div class="detail-list">
                    ${formRows.map((row) => `
                        <div class="detail-row ${row.isSignature ? "detail-row-signature" : ""}">
                            <div class="detail-label">${escapeHtml(row.label)}</div>
                            <div class="detail-value">
                                ${row.isSignature && typeof row.rawValue === "string"
                                    ? `<div class="signature-box"><img src="${escapeAttr(row.rawValue)}" alt="${escapeAttr(row.label)}" /></div>`
                                    : `<span class="${row.isEmpty ? "empty" : ""}">${escapeHtml(row.displayValue)}</span>`}
                            </div>
                        </div>
                    `).join("")}
                </div>
            </section>`
        : "";

    const autoPrintScript = options.autoPrint === false
        ? ""
        : `<script>
            window.addEventListener("load", function () {
                var images = Array.prototype.slice.call(document.images || []);
                Promise.all(images.map(function (image) {
                    if (image.complete) return Promise.resolve();
                    return new Promise(function (resolve) {
                        image.addEventListener("load", resolve, { once: true });
                        image.addEventListener("error", resolve, { once: true });
                    });
                })).then(function () {
                    var fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
                    return fontsReady;
                }).then(function () {
                    window.setTimeout(function () { window.print(); }, 120);
                });
            });
        </script>`;

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>OS ${escapeHtml(data.osNumber)}</title>
    <style>
        :root { --ink: #2c2c2c; --ink-soft: #585d5a; --green: #abff10; --green-print: #83c900; --line: #d9dedb; --paper-soft: #f4f6f4; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html { background: #fff; }
        body {
            position: relative;
            min-height: 100vh;
            padding: 24px;
            background: #fff;
            color: var(--ink);
            font-family: Arial, Helvetica, sans-serif;
            font-size: 11px;
            line-height: 1.42;
            counter-reset: section;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }
        .brand-spine {
            position: fixed;
            z-index: 0;
            top: -20mm;
            bottom: -20mm;
            left: -8mm;
            width: 2.2mm;
            background: var(--green);
        }
        .brand-watermark {
            position: fixed;
            z-index: 0;
            top: 50%;
            left: 50%;
            width: 142mm;
            height: auto;
            overflow: visible;
            transform: translate(-43%, -50%) rotate(-4deg);
            pointer-events: none;
        }
        .brand-watermark .watermark-accent { fill: var(--green); opacity: .19; }
        .brand-watermark .watermark-ink { fill: var(--ink); opacity: .105; }
        .document { position: relative; z-index: 1; }
        .document-header {
            position: relative;
            display: grid;
            grid-template-columns: 220px minmax(0, 1fr);
            grid-template-rows: 76px 62px;
            min-height: 138px;
            overflow: hidden;
            border: 1px solid var(--line);
            background: #fff;
        }
        .document-header::before {
            content: "";
            position: absolute;
            z-index: 0;
            inset: 0 auto 0 0;
            width: 325px;
            background: var(--ink);
            clip-path: polygon(0 0, 100% 0, 68% 100%, 0 100%);
        }
        .document-header::after {
            content: "";
            position: absolute;
            z-index: 1;
            top: -68px;
            left: 180px;
            width: 430px;
            height: 126px;
            border: 2px solid var(--green);
            transform: rotate(-16deg) skewX(-24deg);
            opacity: .72;
        }
        .brand-lockup {
            position: relative;
            z-index: 3;
            grid-column: 1;
            grid-row: 1 / 3;
            align-self: stretch;
            min-width: 0;
            padding: 25px 25px 20px 29px;
            color: #fff;
        }
        .brand-lockup img { display: block; width: 172px; max-width: 100%; height: auto; }
        .document-kind {
            display: block;
            margin-top: 12px;
            color: #d5dad7;
            font-size: 8px;
            font-weight: 700;
            letter-spacing: 2.1px;
            text-transform: uppercase;
        }
        .document-id {
            position: relative;
            z-index: 2;
            grid-column: 2;
            grid-row: 1;
            align-self: stretch;
            min-width: 0;
            padding: 13px 18px 10px 92px;
            color: var(--ink);
            text-align: right;
        }
        .document-id .eyebrow { display: block; color: #679e00; font-size: 7.5px; font-weight: 900; letter-spacing: 1.65px; text-transform: uppercase; }
        .document-id strong { display: block; margin: 3px 0 6px; font-size: 18px; line-height: 1.05; letter-spacing: -.25px; }
        .badge { display: inline-flex; align-items: center; gap: 6px; padding: 4px 9px; border: 1px solid currentColor; border-radius: 999px; font-size: 9px; font-weight: 800; letter-spacing: .35px; text-transform: uppercase; }
        .badge::before { content: ""; width: 5px; height: 5px; border-radius: 50%; background: currentColor; }
        .badge-open { color: #9b6500; }
        .badge-progress { color: #1d6098; }
        .badge-closed { color: #568900; }
        .badge-neutral { color: #666c68; }
        .summary-strip {
            position: relative;
            z-index: 2;
            grid-column: 2;
            grid-row: 2;
            display: grid;
            grid-template-columns: 1.1fr 1.8fr 1fr;
            border-top: 1px solid var(--ink);
            background: #fff;
        }
        .summary-strip::after {
            content: "";
            position: absolute;
            right: 0;
            bottom: 0;
            width: 82px;
            height: 3px;
            background: var(--green);
            clip-path: polygon(12% 0, 100% 0, 100% 100%, 0 100%);
        }
        .summary-item { min-width: 0; padding: 8px 11px 9px; border-right: 1px solid var(--line); }
        .summary-item:last-child { border-right: 0; }
        .summary-item span { display: block; margin-bottom: 2px; color: #6f7571; font-size: 7.5px; font-weight: 800; letter-spacing: 1.25px; text-transform: uppercase; }
        .summary-item strong { display: block; overflow-wrap: anywhere; font-size: 10.5px; line-height: 1.25; }
        .section { margin-top: 18px; break-inside: auto; }
        .section-heading {
            display: flex;
            align-items: center;
            gap: 12px;
            min-height: 31px;
            margin-bottom: 8px;
            overflow: hidden;
            border: 1px solid var(--ink);
            background: rgba(255, 255, 255, .94);
            break-after: avoid;
        }
        .section-index::before { counter-increment: section; content: counter(section, decimal-leading-zero); }
        .section-index {
            align-self: stretch;
            display: grid;
            min-width: 49px;
            place-items: center;
            padding-right: 7px;
            background: var(--ink);
            color: var(--green);
            clip-path: polygon(0 0, 100% 0, 84% 100%, 0 100%);
            font-size: 9px;
            font-weight: 900;
            letter-spacing: 1px;
        }
        .section-heading h2 { font-size: 11px; font-weight: 800; letter-spacing: 1.35px; text-transform: uppercase; }
        .section-heading::after { content: ""; align-self: stretch; width: 64px; margin-left: auto; background: var(--green); clip-path: polygon(38% 0, 100% 0, 100% 100%, 0 100%); }
        .info-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); border-top: 1px solid var(--line); border-left: 1px solid var(--line); background: rgba(255, 255, 255, .94); }
        .info-item { min-width: 0; min-height: 50px; padding: 9px 11px; border-right: 1px solid var(--line); border-bottom: 1px solid var(--line); background: rgba(255, 255, 255, .86); break-inside: avoid; }
        .info-item-wide { grid-column: 1 / -1; }
        .info-label, .detail-label, .block-label { display: block; color: #747a76; font-size: 7.5px; font-weight: 800; letter-spacing: .85px; text-transform: uppercase; }
        .info-value { display: block; margin-top: 4px; overflow-wrap: anywhere; font-size: 10.5px; font-weight: 600; white-space: pre-wrap; }
        .contact-card {
            display: grid;
            grid-template-columns: 40px minmax(0, 1fr) minmax(0, .7fr);
            align-items: center;
            border: 1px solid var(--line);
            break-inside: avoid;
        }
        .contact-mark { align-self: stretch; display: grid; place-items: center; background: var(--green); color: var(--ink); font-size: 14px; font-weight: 900; }
        .contact-item { min-width: 0; padding: 9px 12px; }
        .contact-item + .contact-item { border-left: 1px solid var(--line); }
        .contact-item strong { display: block; margin-top: 2px; overflow-wrap: anywhere; font-size: 10.5px; }
        .detail-list { border-top: 1px solid var(--line); background: rgba(255, 255, 255, .94); }
        .detail-row { display: grid; grid-template-columns: minmax(130px, 29%) minmax(0, 1fr); border-bottom: 1px solid var(--line); break-inside: avoid; }
        .detail-label { padding: 8px 10px; background: var(--paper-soft); color: #5b615d; }
        .detail-value { min-width: 0; padding: 8px 11px; overflow-wrap: anywhere; }
        .detail-value > span { white-space: pre-wrap; }
        .empty { color: #737975; font-style: italic; }
        .signature-box { min-height: 82px; display: flex; align-items: center; justify-content: center; border: 1px solid var(--line); background: #fff; }
        .signature-box img { display: block; max-width: 100%; max-height: 76px; object-fit: contain; }
        .followup-block { margin-bottom: 10px; padding: 10px 11px; border: 1px solid var(--line); border-left: 3px solid var(--green); break-inside: avoid; }
        .followup-content { margin-top: 5px; white-space: pre-wrap; }
        .attachments-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 9px; }
        .attachment-item { overflow: hidden; border: 1px solid var(--line); background: #fff; break-inside: avoid; }
        .attachment-item img { display: block; width: 100%; height: 145px; object-fit: cover; }
        .attachment-placeholder { height: 145px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 5px; background: var(--ink); color: #fff; font-size: 9px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; }
        .attachment-placeholder span { color: var(--green); font-size: 18px; }
        .attachment-item figcaption { padding: 4px 6px; overflow: hidden; color: #666c68; font-size: 8px; text-overflow: ellipsis; white-space: nowrap; }
        .document-footer { position: relative; display: flex; justify-content: space-between; gap: 20px; margin-top: 24px; padding: 10px 13px 10px 19px; overflow: hidden; background: var(--ink); color: #d8dcd9; font-size: 8px; }
        .document-footer::before { content: ""; position: absolute; inset: 0 auto 0 0; width: 7px; background: var(--green); clip-path: polygon(0 0, 100% 0, 55% 100%, 0 100%); }
        .document-footer strong { color: #fff; letter-spacing: .55px; text-transform: uppercase; }
        @page { size: A4; margin: 13mm 13mm 16mm; }
        @media print {
            body { padding: 0; }
            .document-header { break-inside: avoid; }
            .summary-strip { break-inside: avoid; }
        }
    </style>
</head>
<body>
    <div class="brand-spine" aria-hidden="true"></div>
    <svg class="brand-watermark" aria-hidden="true" viewBox="850 995 300 155">
        <g class="watermark-accent" transform="translate(8 6)">
            <g transform="translate(0 2250) scale(.1 -.1)">
                <path d="M8677 12443 c-4 -3 -7 -44 -7 -90 l0 -83 403 0 402 0 128 85 c70 47 127 87 127 90 0 8 -1046 6 -1053 -2z" />
                <path d="M9540 11870 l-871 -580 3 -88 3 -87 1333 -3 1332 -2 0 90 0 90 -867 0 -868 0 863 575 c474 316 862 577 862 580 0 3 -207 5 -460 5 l-460 0 -870 -580z" />
            </g>
        </g>
        <g class="watermark-ink" transform="translate(0 2250) scale(.1 -.1)">
            <path d="M8677 12443 c-4 -3 -7 -44 -7 -90 l0 -83 403 0 402 0 128 85 c70 47 127 87 127 90 0 8 -1046 6 -1053 -2z" />
            <path d="M9540 11870 l-871 -580 3 -88 3 -87 1333 -3 1332 -2 0 90 0 90 -867 0 -868 0 863 575 c474 316 862 577 862 580 0 3 -207 5 -460 5 l-460 0 -870 -580z" />
        </g>
    </svg>
    <main class="document">
        <header class="document-header">
            <div class="brand-lockup">
                <img src="${escapeAttr(brandLogoUrl)}" alt="Zyllen Systems">
                <span class="document-kind">Ordem de serviço</span>
            </div>
            <div class="document-id">
                <span class="eyebrow">Documento operacional</span>
                <strong>${escapeHtml(data.osNumber)}</strong>
                <span class="badge ${statusClass}">${escapeHtml(statusLabel)}</span>
            </div>
            <div class="summary-strip">
                <div class="summary-item"><span>Serviço</span><strong>${escapeHtml(formTypeLabel)}</strong></div>
                <div class="summary-item"><span>Cliente</span><strong>${escapeHtml(data.clientName || "Não informado")}</strong></div>
                <div class="summary-item"><span>Aberta em</span><strong>${escapeHtml(formatDate(data.createdAt))}</strong></div>
            </div>
        </header>

        <section class="section">
            <div class="section-heading"><span class="section-index"></span><h2>Informações gerais</h2></div>
            <div class="info-grid">
                ${detailItem("Empresa / cliente", data.clientName || "—")}
                ${detailItem("Estado / cidade", [data.clientState, data.clientCity].filter(Boolean).join(" — ") || "—")}
                ${detailItem("Localização", data.location || "—", "info-item-wide")}
                ${data.asset ? detailItem("Patrimônio", `${data.asset.assetCode || "—"}${data.asset.sku?.name ? ` — ${data.asset.sku.name}` : ""}`, "info-item-wide") : ""}
                ${detailItem("Início do serviço", formatDate(data.startedAt))}
                ${detailItem("Fim do serviço", formatDate(data.endedAt))}
                ${detailItem("Aberta por", data.openedBy || data.openedByContractor || "—", "info-item-wide")}
            </div>
        </section>

        ${(data.contactName || data.contactPhone) ? `
        <section class="section">
            <div class="section-heading"><span class="section-index"></span><h2>Contato no local</h2></div>
            <div class="contact-card">
                <div class="contact-mark" aria-hidden="true">+</div>
                <div class="contact-item"><span class="info-label">Responsável</span><strong>${escapeHtml(data.contactName || "—")}</strong></div>
                <div class="contact-item"><span class="info-label">Telefone</span><strong>${escapeHtml(data.contactPhone || "—")}</strong></div>
            </div>
        </section>` : ""}

        ${formDataHtml}

        ${followupBlocks.length > 0 ? `
        <section class="section">
            <div class="section-heading"><span class="section-index"></span><h2>Acompanhamento de 7 dias</h2></div>
            ${followupBlocks.map((block, idx) => {
                if (block.type === "TEXT") {
                    return `<div class="followup-block">
                        <span class="block-label">Bloco ${idx + 1} · Texto</span>
                        <div class="followup-content">${escapeHtml(block.content || "—")}</div>
                    </div>`;
                }
                if (block.type === "SIGNATURE") {
                    return `<div class="followup-block">
                        <span class="block-label">Bloco ${idx + 1} · Assinatura</span>
                        <div class="followup-content">${block.content
                            ? `<div class="signature-box"><img src="${escapeAttr(block.content)}" alt="Assinatura"></div>`
                            : `<span class="empty">Sem assinatura</span>`}</div>
                    </div>`;
                }
                if (block.type === "MEDIA" && block.attachments.length > 0) {
                    return `<div class="followup-block">
                        <span class="block-label">Bloco ${idx + 1} · Mídia (${block.attachments.length})</span>
                        <div class="attachments-grid" style="margin-top:8px">${block.attachments.map(attachmentCard).join("")}</div>
                    </div>`;
                }
                return `<div class="followup-block"><span class="block-label">Bloco ${idx + 1} · ${escapeHtml(block.type)}</span></div>`;
            }).join("")}
        </section>` : ""}

        ${(data.attachments && data.attachments.length > 0) ? `
        <section class="section">
            <div class="section-heading"><span class="section-index"></span><h2>Fotos e vídeos (${data.attachments.length})</h2></div>
            <div class="attachments-grid">${data.attachments.map(attachmentCard).join("")}</div>
        </section>` : ""}

        <footer class="document-footer">
            <strong>Zyllen Systems · Ordem de serviço</strong>
            <span>Gerado em ${escapeHtml(generatedAt.toLocaleString("pt-BR"))} · ${generatedAt.getFullYear()}</span>
        </footer>
    </main>
    ${autoPrintScript}
</body>
</html>`;
}

export function printOsPdf(data: OsPdfData): void {
    const html = buildOsPdfHtml(data);
    const win = window.open("", "_blank");

    if (!win) {
        const iframe = document.createElement("iframe");
        iframe.style.position = "fixed";
        iframe.style.right = "0";
        iframe.style.bottom = "0";
        iframe.style.width = "0";
        iframe.style.height = "0";
        iframe.style.border = "none";
        iframe.setAttribute("aria-hidden", "true");
        document.body.appendChild(iframe);
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;

        if (!iframeDoc) {
            document.body.removeChild(iframe);
            alert("Não foi possível gerar o PDF. Verifique se popups estão permitidos para este site.");
            return;
        }

        iframeDoc.open();
        iframeDoc.write(html);
        iframeDoc.close();
        window.setTimeout(() => document.body.removeChild(iframe), 10_000);
        return;
    }

    win.document.write(html);
    win.document.close();
}
