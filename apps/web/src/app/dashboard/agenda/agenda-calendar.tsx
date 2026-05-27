"use client";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import listPlugin from "@fullcalendar/list";
import interactionPlugin from "@fullcalendar/interaction";
import type { EventClickArg, EventContentArg, DateSelectArg } from "@fullcalendar/core";
import type { DateClickArg } from "@fullcalendar/interaction";
import ptBrLocale from "@fullcalendar/core/locales/pt-br";

// ── Types (mirrors page.tsx) ──────────────────────────────────────────────────

interface ScheduleInstaller {
    id: string;
    name: string;
    agendaColor: string | null;
}

export interface CalendarSchedule {
    id: string;
    title: string;
    type: string;
    status: string;
    startDate: string;
    endDate: string;
    address: string | null;
    notes: string | null;
    companyId: string | null;
    projectId: string | null;
    companyName: string | null;
    projectName: string | null;
    createdByName: string | null;
    installers: ScheduleInstaller[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function toLocalDatetimeStr(input: string | Date): string {
    try {
        const d = typeof input === "string" ? new Date(input) : input;
        const offset = d.getTimezoneOffset() * 60000;
        return new Date(d.getTime() - offset).toISOString().slice(0, 16);
    } catch {
        return "";
    }
}

const STATUS_OPACITY: Record<string, number> = {
    SCHEDULED: 1,
    IN_PROGRESS: 1,
    DONE: 0.6,
    CANCELLED: 0.3,
};

const TYPE_ICONS: Record<string, string> = {
    INSTALLATION: "⚡",
    MAINTENANCE: "🔧",
    REMOVAL: "📦",
    SUPPORT: "🎧",
    OTHER: "📋",
};

// ── Component ─────────────────────────────────────────────────────────────────

interface AgendaCalendarProps {
    schedules: CalendarSchedule[];
    onEventClick: (schedule: CalendarSchedule) => void;
    onDateSelect: (start: string, end: string) => void;
}

export default function AgendaCalendar({ schedules, onEventClick, onDateSelect }: AgendaCalendarProps) {
    const events = schedules.map((s) => ({
        id: s.id,
        title: s.title,
        start: s.startDate,
        end: s.endDate,
        backgroundColor: s.installers[0]?.agendaColor ?? "#3B82F6",
        borderColor: "transparent",
        textColor: "#ffffff",
        classNames: s.status === "CANCELLED" ? ["fc-event-cancelled"] : [],
        extendedProps: { schedule: s },
    }));

    function handleEventClick(info: EventClickArg) {
        info.jsEvent.preventDefault();
        onEventClick(info.event.extendedProps.schedule as CalendarSchedule);
    }

    function handleDateClick(info: DateClickArg) {
        const start = new Date(info.date);
        // Default: 1-hour block
        if (info.view.type === "dayGridMonth") {
            start.setHours(8, 0, 0, 0);
        }
        const end = new Date(start.getTime() + 60 * 60 * 1000);
        onDateSelect(toLocalDatetimeStr(start), toLocalDatetimeStr(end));
    }

    function handleSelect(info: DateSelectArg) {
        const start = new Date(info.start);
        const end = new Date(info.end);
        // In month grid, selection is all-day — apply default hours
        if (info.view.type === "dayGridMonth") {
            start.setHours(8, 0, 0, 0);
            end.setHours(17, 0, 0, 0);
            // If multi-day selection, keep the end date at end of last selected day
            if (end.getTime() - start.getTime() > 24 * 60 * 60 * 1000) {
                end.setDate(end.getDate() - 1);
                end.setHours(17, 0, 0, 0);
            }
        }
        onDateSelect(toLocalDatetimeStr(start), toLocalDatetimeStr(end));
    }

    function renderEventContent(arg: EventContentArg) {
        const s: CalendarSchedule = arg.event.extendedProps.schedule;
        const icon = TYPE_ICONS[s.type] ?? "📋";

        if (arg.view.type === "listWeek" || arg.view.type === "listMonth") {
            return (
                <div className="flex items-center gap-2 py-0.5 text-sm">
                    <span>{icon}</span>
                    <span className="font-medium">{arg.event.title}</span>
                    {s.installers.length > 0 && (
                        <span className="opacity-70 text-xs">
                            — {s.installers.map((i) => i.name).join(", ")}
                        </span>
                    )}
                </div>
            );
        }

        return (
            <div className="p-0.5 overflow-hidden w-full">
                <div className="text-xs font-medium leading-tight truncate">
                    {icon} {arg.event.title}
                </div>
                {s.installers.length > 0 && (arg.view.type === "timeGridWeek" || arg.view.type === "timeGridDay") && (
                    <div className="text-[10px] opacity-75 truncate leading-tight mt-0.5">
                        {s.installers.map((i) => i.name).join(", ")}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="zyllen-calendar">
            <FullCalendar
                plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
                initialView="dayGridMonth"
                locale={ptBrLocale}
                events={events}
                eventClick={handleEventClick}
                dateClick={handleDateClick}
                selectable
                select={handleSelect}
                unselectAuto
                headerToolbar={{
                    left: "prev,next today",
                    center: "title",
                    right: "dayGridMonth,timeGridWeek,timeGridDay,listWeek",
                }}
                views={{
                    dayGridMonth: { buttonText: "Mês" },
                    timeGridWeek: { buttonText: "Semana" },
                    timeGridDay: { buttonText: "Dia" },
                    listWeek: { buttonText: "Lista" },
                }}
                height={700}
                nowIndicator
                eventTimeFormat={{ hour: "2-digit", minute: "2-digit", hour12: false }}
                slotLabelFormat={{ hour: "2-digit", minute: "2-digit", hour12: false }}
                slotMinTime="06:00:00"
                slotMaxTime="22:00:00"
                allDaySlot={false}
                eventContent={renderEventContent}
                eventDisplay="block"
                dayMaxEvents={3}
                moreLinkText={(n) => `+${n} mais`}
                noEventsText="Nenhum agendamento neste período"
            />
        </div>
    );
}
