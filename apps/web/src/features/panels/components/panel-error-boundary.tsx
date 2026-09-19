"use client";
import { Component, type ReactNode } from 'react';
import { Button } from '@web/components/ui/button';
import { MONITORING_PANEL_COPY as copy } from '@web/lib/brand-voice';
export class PanelErrorBoundary extends Component<{ children: ReactNode; onRetry: () => void }, { failed: boolean }> {
    state = { failed: false };
    static getDerivedStateFromError() { return { failed: true }; }
    render() {
        return this.state.failed ? <div role="alert" className="rounded-xl border border-red-500/40 p-5 text-red-200"><p>{copy.failure}</p><Button variant="outline" className="mt-3" onClick={() => { this.props.onRetry(); this.setState({ failed: false }); }}>{copy.retry}</Button></div> : this.props.children;
    }
}
