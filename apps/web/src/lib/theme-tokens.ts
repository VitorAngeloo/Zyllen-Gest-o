// ============================================
// Zyllen Gestão — Design Tokens
// ============================================

export const tokens = {
    colors: {
        highlight: '#ABFF10',
        background: '#2C2C2C',
        backgroundLight: '#3A3A3A',
        backgroundDark: '#1E1E1E',
        white: '#FFFFFF',
        muted: '#9CA3AF',
        border: '#4A4A4A',
        error: '#EF4444',
        warning: '#F59E0B',
        success: '#10B981',
        info: '#3B82F6',
    },
    contrast: {
        textOnHighlight: '#2C2C2C',
        textOnBackground: '#FFFFFF',
        textMuted: '#9CA3AF',
    },
    fonts: {
        body: "'Inter', sans-serif",
        heading: "'Inter', sans-serif",
        mono: "'JetBrains Mono', monospace",
    },
    spacing: {
        xs: '0.25rem',
        sm: '0.5rem',
        md: '1rem',
        lg: '1.5rem',
        xl: '2rem',
        '2xl': '3rem',
    },
    radius: {
        sm: '0.375rem',
        md: '0.5rem',
        lg: '0.75rem',
        xl: '1rem',
        full: '9999px',
    },
} as const;

export type ThemeTokens = typeof tokens;
