/**
 * Zyllen Systems — Brand Logo Components
 * Full wordmark (ZYLLEN SYSTEMS), icon mark (Z), and text-only variants.
 */

interface LogoProps {
  className?: string;
  color?: string;
  height?: number | string;
}

/**
 * Full "ZYLLEN SYSTEMS" wordmark extracted from brand SVG.
 * Paths sourced from official brand manual vector file.
 */
export function ZyllenWordmark({ className, color = "currentColor", height = 40 }: LogoProps) {
  return (
    <svg
      viewBox="86 100 227 25"
      height={height}
      className={className}
      fill={color}
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Zyllen Systems"
    >
      {/* Z */}
      <path d="M86.7 105.5v.9h4 .1l1.3.9-8.6 5.8v.9l.1.2h13.3v-.9h-.1l-8.6 0 8.6-5.8v-.9l-.1-.1H86.7z" />
      {/* Y */}
      <path d="M105.3 112.4v-1l-4.7-4 .1-2.7h-4v2.6l4.5 3.9v1.3l.1 2.1h4v-2.6l.1.4zm1.4-.2l-3-2.6h-1.3l3.1 2.7 1.3 0z" />
      {/* L */}
      <path d="M113.3 105.5v6.7h4v.6l-.1-.1h9.4v-.9h-9.4v-5.8h-4v-.5z" />
      {/* L */}
      <path d="M127.3 105.5v6.7h4v.6l-.1-.1h9.4v-.9h-9.4v-5.8h-4v-.5z" />
      {/* E */}
      <path d="M140.7 105.5v6.7h13.3v-.9h-9.3v-4.9h9.3v-.9h-13.3zm6.3 2.9v.9h5.4v-.9h-5.4z" />
      {/* N */}
      <path d="M158 105.5v6.7h.9l.1.1v-3.9l8.4 3.9h4v-2.5l-.1-.1v2.3l-8.4-3.9h-4v.6h-.1l-.1-3.7h-.9v.5zm12.5-1.6v2.3l.6.3h.9v-2.3l-.9 0h-.1l-.5-.3z" />
    </svg>
  );
}

/**
 * Circular Z icon — geometric brand mark.
 * Used for favicon, collapsed sidebar, loading states.
 */
export function ZyllenIcon({ className, color, height = 32 }: LogoProps & { bgColor?: string }) {
  return (
    <div
      className={`inline-flex items-center justify-center rounded-full ${className || ""}`}
      style={{ width: height, height: height }}
    >
      <img
        src="/brand/logo-verde.svg"
        alt="Zyllen"
        style={{ width: "100%", height: "100%", objectFit: "contain" }}
      />
    </div>
  );
}

/**
 * Logo image — uses the full brand SVG file.
 * Best for login pages and large displays.
 */
export function ZyllenLogoFull({ className, height = 80 }: LogoProps) {
  return (
    <img
      src="/brand/logo-verde.svg"
      alt="Zyllen Systems"
      className={className}
      style={{ height: typeof height === "number" ? `${height}px` : height }}
    />
  );
}

/**
 * Typographic logo using Obviously font.
 * For sidebar and compact displays where SVG icon + brand text is needed.
 */
export function ZyllenTextLogo({
  className,
  size = "default",
}: {
  className?: string;
  size?: "sm" | "default" | "lg";
}) {
  const sizes = {
    sm: { text: "text-sm", tracking: "tracking-[0.15em]", sub: "text-[7px]", gap: "gap-0" },
    default: { text: "text-lg", tracking: "tracking-[0.15em]", sub: "text-[8px]", gap: "gap-0.5" },
    lg: { text: "text-3xl", tracking: "tracking-[0.15em]", sub: "text-xs", gap: "gap-1" },
  };
  const s = sizes[size];

  return (
    <div className={`flex flex-col ${s.gap} ${className || ""}`}>
      <span
        className={`font-brand font-semibold ${s.text} ${s.tracking} text-white leading-none`}
      >
        ZYLLEN
      </span>
      <span
        className={`font-brand font-normal ${s.sub} tracking-[0.35em] text-[var(--zyllen-highlight)] leading-none uppercase`}
      >
        Systems
      </span>
    </div>
  );
}

/**
 * Combined icon + text for sidebar header.
 */
export function ZyllenBrandHeader({
  collapsed = false,
  size = "default",
}: {
  collapsed?: boolean;
  size?: "sm" | "default";
}) {
  return (
    <div className="flex items-center gap-3">
      <ZyllenIcon height={collapsed ? 28 : 32} />
      {!collapsed && <ZyllenTextLogo size={size} />}
    </div>
  );
}
