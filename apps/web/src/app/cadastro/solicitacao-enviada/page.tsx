"use client";

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { CheckCircle2, Clock3 } from 'lucide-react';
import { useAuth } from '@web/lib/auth-context';
import { SECURITY_COPY } from '@web/lib/brand-voice';
import { Button } from '@web/components/ui/button';
import { Card, CardContent, CardHeader } from '@web/components/ui/card';

export default function RegistrationSentPage() {
    const { user, isLoading } = useAuth();
    const title = useRef<HTMLHeadingElement>(null);

    useEffect(() => { title.current?.focus(); }, []);

    return (
        <main className="flex min-h-screen items-center justify-center bg-[var(--zyllen-bg-dark)] p-4">
            <Card className="w-full max-w-lg border-[var(--zyllen-border)] bg-[var(--zyllen-bg)] text-white shadow-2xl">
                <CardHeader className="items-center gap-4 pb-4 text-center">
                    <div className="flex size-16 items-center justify-center rounded-full bg-[var(--zyllen-highlight)]/10 text-[var(--zyllen-highlight)]">
                        <CheckCircle2 size={36} aria-hidden="true" />
                    </div>
                    <h1 ref={title} tabIndex={-1} className="text-2xl font-semibold outline-none">
                        {SECURITY_COPY.registrationSentTitle}
                    </h1>
                    <p className="inline-flex items-center gap-2 rounded-full border border-[var(--zyllen-highlight)]/30 px-3 py-1 text-sm text-[var(--zyllen-highlight)]">
                        <Clock3 size={16} aria-hidden="true" />
                        {SECURITY_COPY.registrationSentStatus}
                    </p>
                </CardHeader>
                <CardContent className="space-y-5">
                    <div className="space-y-3 text-sm leading-relaxed text-[var(--zyllen-muted)]">
                        <p className="text-base text-white">{SECURITY_COPY.registrationSentDescription}</p>
                        <p>{SECURITY_COPY.registrationSentNextStep}</p>
                        <p>{SECURITY_COPY.registrationSentContact}</p>
                    </div>
                    {!isLoading && user && (
                        <p className="rounded-lg border border-[var(--zyllen-border)] bg-[var(--zyllen-bg-dark)] p-3 text-sm leading-relaxed text-[var(--zyllen-muted)]">
                            {SECURITY_COPY.registrationSessionPreserved}
                        </p>
                    )}
                    <div className="flex flex-col gap-2 pt-1">
                        {isLoading ? (
                            <Button variant="highlight" className="h-11 w-full" disabled>
                                {SECURITY_COPY.registrationSessionLoading}
                            </Button>
                        ) : (
                            <Button asChild variant="highlight" className="h-11 w-full">
                                <Link href={user ? '/' : '/?type=client'}>
                                    {user ? SECURITY_COPY.registrationBackToAccount : SECURITY_COPY.registrationGoToLogin}
                                </Link>
                            </Button>
                        )}
                        <Button asChild variant="highlight-ghost" className="h-11 w-full">
                            <Link href="/cadastro">{SECURITY_COPY.registrationAnotherRequest}</Link>
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </main>
    );
}
