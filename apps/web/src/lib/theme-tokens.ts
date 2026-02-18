// ============================================
// Zyllen Systems — Brand Design Tokens
// ============================================

export const tokens = {
    colors: {
        highlight: '#ABFF10',
        highlightDim: 'rgba(171, 255, 16, 0.15)',
        highlightGlow: 'rgba(171, 255, 16, 0.25)',
        background: '#2C2C2C',
        backgroundLight: '#3A3A3A',
        backgroundDark: '#1E1E1E',
        surface: '#333333',
        surfaceHover: '#3D3D3D',
        white: '#FFFFFF',
        muted: '#A1A1AA',
        border: '#4A4A4A',
        error: '#EF4444',
        warning: '#F59E0B',
        success: '#10B981',
        info: '#3B82F6',
    },
    contrast: {
        textOnHighlight: '#1E1E1E',
        textOnBackground: '#FFFFFF',
        textMuted: '#A1A1AA',
    },
    fonts: {
        brand: "'Obviously', 'Space Grotesk', sans-serif",
        body: "'Space Grotesk', 'Inter', sans-serif",
        heading: "'Obviously', 'Space Grotesk', sans-serif",
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
        sm: '0.125rem',
        md: '0.25rem',
        lg: '0.375rem',
        xl: '0.5rem',
        full: '9999px',
    },
    brand: {
        tracking: '0.04em',
        trackingWide: '0.15em',
        trackingSystems: '0.35em',
    },
} as const;

export type ThemeTokens = typeof tokens;
