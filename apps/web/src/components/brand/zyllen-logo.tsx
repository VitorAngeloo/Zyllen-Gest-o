/**
 * Zyllen Systems — Brand Logo Components
 * Full wordmark (ZYLLEN SYSTEMS), icon mark (Z), and text-only variants.
 */

interface LogoProps {
  className?: string;
  height?: number | string;
  alt?: string;
}

/**
 * Full "ZYLLEN SYSTEMS" wordmark using the official vector paths.
 */
export function ZyllenWordmark({
  className,
  height = 40,
  alt = "Zyllen Systems",
}: LogoProps) {
  return (
    <img
      src="/brand/zyllen-wordmark.svg"
      alt={alt}
      className={className}
      style={{ height: typeof height === "number" ? `${height}px` : height, width: "auto" }}
    />
  );
}

/**
 * Circular Z icon — geometric brand mark.
 * Used for favicon, collapsed sidebar, loading states.
 */
export function ZyllenIcon({ className, height = 32 }: LogoProps & { bgColor?: string }) {
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
 * Full vector signature for login pages and large displays.
 */
export function ZyllenLogoFull({ className, height = 80 }: LogoProps) {
  return <ZyllenWordmark className={className} height={height} />;
}

/**
 * Compact brand signature for navigation surfaces.
 */
export function ZyllenTextLogo({
  className,
  size = "default",
}: {
  className?: string;
  size?: "sm" | "default" | "lg";
}) {
  const heights = { sm: 12, default: 15, lg: 27 };
  return <ZyllenWordmark className={className} height={heights[size]} />;
}

/**
 * Animated signature used while the desktop sidebar changes width.
 * The complete wordmark contracts toward the standalone Z mark.
 */
export function ZyllenSidebarBrand({
  collapsed,
  className,
}: {
  collapsed: boolean;
  className?: string;
}) {
  return (
    <div
      role="img"
      aria-label="Zyllen Systems"
      className={`relative h-8 shrink-0 overflow-hidden transition-[width] duration-300 ease-[cubic-bezier(.22,1,.36,1)] motion-reduce:transition-none ${collapsed ? "w-[30px]" : "w-32"} ${className || ""}`}
    >
      <ZyllenWordmark
        alt=""
        height={15}
        className={`absolute left-0 top-1/2 max-w-none origin-left -translate-y-1/2 transform-gpu transition-[opacity,transform] duration-300 ease-[cubic-bezier(.22,1,.36,1)] motion-reduce:transition-none ${collapsed ? "scale-x-[0.18] opacity-0" : "scale-x-100 opacity-100"}`}
      />
      <img
        src="/brand/zyllen-z-white.svg"
        alt=""
        aria-hidden="true"
        className={`absolute left-1/2 top-1/2 w-7 max-w-none -translate-x-1/2 -translate-y-1/2 transform-gpu transition-[opacity,transform] duration-300 ease-[cubic-bezier(.22,1,.36,1)] motion-reduce:transition-none ${collapsed ? "scale-100 opacity-100" : "scale-50 opacity-0"}`}
      />
    </div>
  );
}

/**
 * Combined icon + text for sidebar header.
 */
export function ZyllenBrandHeader({
  collapsed = false,
}: {
  collapsed?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <ZyllenSidebarBrand collapsed={collapsed} />
    </div>
  );
}

/**
 * Grupo Sky Line logo mark.
 */
export function SkyLineLogo({ height = 32, className }: { height?: number; className?: string }) {
  return (
    <img
      src="/brand/logo-skyline.svg?v=4"
      alt="Grupo Sky Line"
      className={className}
      style={{ height: typeof height === "number" ? `${height}px` : height, width: "auto" }}
    />
  );
}

/**
 * Partnership logo block — shows both Zyllen and Grupo Sky Line logos
 * separated by a divider, indicating the partnership.
 */
export function PartnershipLogos({
  height = 48,
  variant = "horizontal",
  className,
}: {
  height?: number;
  variant?: "horizontal" | "vertical" | "compact";
  className?: string;
}) {
  if (variant === "compact") {
    return (
      <div className={`flex items-center gap-2 ${className || ""}`}>
        <ZyllenIcon height={height * 0.65} />
        <div className="h-5 w-px bg-[var(--zyllen-border)]" />
        <SkyLineLogo height={height * 0.5} />
      </div>
    );
  }

  if (variant === "vertical") {
    return (
      <div className={`flex flex-col items-center gap-3 ${className || ""}`}>
        <ZyllenLogoFull height={height} />
        <div className="flex items-center gap-2">
          <div className="h-px w-6 bg-[var(--zyllen-border)]" />
          <span className="text-[9px] uppercase tracking-[0.3em] text-[var(--zyllen-muted)]">Parceria</span>
          <div className="h-px w-6 bg-[var(--zyllen-border)]" />
        </div>
        <SkyLineLogo height={height * 0.65} />
      </div>
    );
  }

  // horizontal (default)
  return (
    <div className={`flex items-center gap-4 ${className || ""}`}>
      <ZyllenWordmark height={height * 0.3} />
      <div className="h-6 w-px bg-[var(--zyllen-border)]" />
      <SkyLineLogo height={height * 0.65} />
    </div>
  );
}
