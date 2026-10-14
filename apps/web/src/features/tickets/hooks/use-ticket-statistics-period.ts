"use client";

import { useState } from "react";
import { localTicketDate, ticketStatisticsPeriod, type TicketPeriodPreset } from "../utils/ticket-statistics-period";

type Period = NonNullable<ReturnType<typeof ticketStatisticsPeriod>>;

export function useTicketStatisticsPeriod(now: number) {
    const today = localTicketDate(now);
    const [preset, setPresetState] = useState<TicketPeriodPreset>("30_DAYS");
    const [from, setFromState] = useState(today);
    const [to, setToState] = useState(today);
    const [customPeriod, setCustomPeriod] = useState<Period | null>(null);
    const [invalidPeriod, setInvalidPeriod] = useState(false);
    const period = preset === "CUSTOM" ? customPeriod : ticketStatisticsPeriod(preset, today, from, to);
    const draft = ticketStatisticsPeriod("CUSTOM", today, from, to);
    const isDirty = draft?.start !== period?.start || draft?.end !== period?.end;

    function setPreset(value: TicketPeriodPreset) {
        if (value === "CUSTOM" && preset !== "CUSTOM" && period) {
            setCustomPeriod(period);
            setFromState(localTicketDate(Date.parse(period.start)));
            setToState(localTicketDate(Date.parse(period.end) - 1));
        }
        setPresetState(value);
        setInvalidPeriod(false);
    }

    function setFrom(value: string) { setFromState(value); setInvalidPeriod(false); }
    function setTo(value: string) { setToState(value); setInvalidPeriod(false); }

    function applyPeriod() {
        setInvalidPeriod(!draft);
        if (draft) setCustomPeriod(draft);
    }

    return { preset, setPreset, from, setFrom, to, setTo, period, invalidPeriod, isDirty, applyPeriod };
}
