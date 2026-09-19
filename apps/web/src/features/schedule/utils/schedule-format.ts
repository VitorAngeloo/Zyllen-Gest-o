export function formatDate(iso: string) {
    try {
        return new Intl.DateTimeFormat("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        }).format(new Date(iso));
    } catch {
        return iso;
    }
}

export function normalize(s: string) {
    return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

export function toDatetimeLocal(iso: string): string {
    try {
        const d = new Date(iso);
        // Offset for local timezone so datetime-local shows correct local time
        const off = d.getTimezoneOffset() * 60000;
        return new Date(d.getTime() - off).toISOString().slice(0, 16);
    } catch {
        return "";
    }
}
