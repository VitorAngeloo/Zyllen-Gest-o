"use client";

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, Clock3 } from 'lucide-react';
import { useAuth } from '@web/features/auth/context/auth-context';
import { SECURITY_COPY } from '@web/lib/brand-voice';
import { Button } from '@web/components/ui/button';
import { PartnershipLogos } from '@web/components/brand/zyllen-logo';

export default function RegistrationSentPage() {
    const { user, isLoading } = useAuth();
    const title = useRef<HTMLHeadingElement>(null);

    useEffect(() => { title.current?.focus(); }, []);

    return (
        <main className="min-h-screen bg-[var(--zyllen-bg-dark)] text-white">
            <header className="border-b border-white/10 bg-[var(--zyllen-bg)]">
                <div className="mx-auto flex max-w-6xl items-center px-5 py-5 sm:px-8">
                    <PartnershipLogos height={48} variant="horizontal" />
                </div>
            </header>

            <div className="mx-auto grid max-w-6xl gap-10 px-5 py-12 sm:px-8 lg:grid-cols-[0.72fr_1.28fr] lg:gap-20 lg:py-20">
                <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--zyllen-highlight)]">Solicitação recebida</p>
                    <div className="mt-5 flex size-12 items-center justify-center border border-[var(--zyllen-highlight)]/35 text-[var(--zyllen-highlight)]">
                        <CheckCircle2 size={27} aria-hidden="true" />
                    </div>
                    <h1 ref={title} tabIndex={-1} className="mt-6 max-w-sm text-3xl font-semibold leading-tight tracking-[-0.03em] outline-none sm:text-4xl">
                        {SECURITY_COPY.registrationSentTitle}
                    </h1>
                    <p className="mt-5 inline-flex items-center gap-2 border-l-2 border-[var(--zyllen-highlight)] pl-3 text-sm text-[var(--zyllen-highlight)]">
                        <Clock3 size={16} aria-hidden="true" />
                        {SECURITY_COPY.registrationSentStatus}
                    </p>
                </div>

                <section className="border-t border-white/10 pt-7">
                    <p className="max-w-xl text-base leading-relaxed text-white">{SECURITY_COPY.registrationSentDescription}</p>

                    <div className="mt-8 border-y border-white/10">
                        <div className="grid grid-cols-[2rem_1fr] gap-4 border-b border-white/10 py-4">
                            <span className="font-mono text-xs text-[var(--zyllen-highlight)]">01</span>
                            <p className="text-sm leading-relaxed text-[var(--zyllen-muted)]">{SECURITY_COPY.registrationSentNextStep}</p>
                        </div>
                        <div className="grid grid-cols-[2rem_1fr] gap-4 py-4">
                            <span className="font-mono text-xs text-[var(--zyllen-highlight)]">02</span>
                            <p className="text-sm leading-relaxed text-[var(--zyllen-muted)]">{SECURITY_COPY.registrationSentContact}</p>
                        </div>
                    </div>

                    {!isLoading && user && (
                        <p className="mt-6 border-l-2 border-white/15 pl-4 text-sm leading-relaxed text-[var(--zyllen-muted)]">
                            {SECURITY_COPY.registrationSessionPreserved}
                        </p>
                    )}
                    <div className="mt-8 flex flex-col gap-2 sm:flex-row">
                        {isLoading ? (
                            <Button variant="highlight" className="h-11 w-full sm:flex-1" disabled>
                                {SECURITY_COPY.registrationSessionLoading}
                            </Button>
                        ) : (
                            <Button asChild variant="highlight" className="h-11 w-full sm:flex-1">
                                <Link href={user ? '/' : '/?type=client'}>
                                    {user ? SECURITY_COPY.registrationBackToAccount : SECURITY_COPY.registrationGoToLogin}
                                </Link>
                            </Button>
                        )}
                        <Button asChild variant="highlight-ghost" className="h-11 w-full sm:flex-1">
                            <Link href="/cadastro">{SECURITY_COPY.registrationAnotherRequest}<ArrowRight size={15} /></Link>
                        </Button>
                    </div>
                </section>
            </div>
        </main>
    );
}
