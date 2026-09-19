"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";


export function AttachmentImage({ baseUrl, alt, className }: { baseUrl: string; alt: string; className?: string }) {
    const [lightbox, setLightbox] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => { setMounted(true); }, []);

    return (
        <>
            <img
                src={baseUrl}
                alt={alt}
                className={`${className ?? ""} cursor-zoom-in`}
                onClick={() => setLightbox(true)}
            />
            {mounted && lightbox && createPortal(
                <div
                    className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 cursor-zoom-out"
                    onClick={() => setLightbox(false)}
                >
                    <img
                        src={baseUrl}
                        alt={alt}
                        className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    />
                    <button
                        className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
                        onClick={() => setLightbox(false)}
                    >
                        <X size={20} />
                    </button>
                </div>,
                document.body,
            )}
        </>
    );
}
