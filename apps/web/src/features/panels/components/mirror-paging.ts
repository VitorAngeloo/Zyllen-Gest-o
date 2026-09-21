"use client";

import { useEffect, useState } from 'react';

export function useMirrorPageSize() {
    const [size, setSize] = useState(3);
    useEffect(() => {
        const update = () => setSize(window.innerHeight < 780 ? 2 : window.innerHeight < 1000 ? 3 : 4);
        update();
        window.addEventListener('resize', update);
        return () => window.removeEventListener('resize', update);
    }, []);
    return size;
}

export function mirrorPage<T>(items: T[], slide: number, size: number) {
    const total = Math.max(1, Math.ceil(items.length / size));
    const page = slide % total;
    const start = page * size;
    return { items: items.slice(start, start + size), page: page + 1, total, start: items.length ? start + 1 : 0, end: Math.min(start + size, items.length) };
}
