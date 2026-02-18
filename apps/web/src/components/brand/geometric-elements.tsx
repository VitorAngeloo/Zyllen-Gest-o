/**
 * Zyllen Systems — Geometric Brand Elements
 * Diagonal lines, Z-pattern, angular clip decorations.
 */

/**
 * Diagonal stripe pattern as SVG background.
 * Used on login page hero section and decorative backgrounds.
 */
export function DiagonalPattern({
  className,
  opacity = 0.06,
  color = "var(--zyllen-highlight)",
  spacing = 24,
  strokeWidth = 1,
}: {
  className?: string;
  opacity?: number;
  color?: string;
  spacing?: number;
  strokeWidth?: number;
}) {
  return (
    <div className={`absolute inset-0 pointer-events-none overflow-hidden ${className || ""}`} style={{ opacity }}>
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern
            id="zyllen-diag"
            patternUnits="userSpaceOnUse"
            width={spacing}
            height={spacing}
            patternTransform="rotate(-45)"
          >
            <line x1="0" y1="0" x2="0" y2={spacing} stroke={color} strokeWidth={strokeWidth} />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#zyllen-diag)" />
      </svg>
    </div>
  );
}

/**
 * Z-shaped geometric decoration.
 * Used as a large background element on hero/login panels.
 */
export function ZPattern({
  className,
  color = "var(--zyllen-highlight)",
  opacity = 0.08,
  size = 400,
}: {
  className?: string;
  color?: string;
  opacity?: number;
  size?: number;
}) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ opacity }}
    >
      {/* Z shape */}
      <path
        d="M15 20 H85 L15 80 H85"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="square"
        fill="none"
      />
      {/* Outer frame */}
      <rect x="5" y="10" width="90" height="80" stroke={color} strokeWidth="1" fill="none" />
    </svg>
  );
}

/**
 * Angular decorative line — horizontal with a diagonal cut at one end.
 */
export function AngularLine({
  className,
  color = "var(--zyllen-highlight)",
  width = "100%",
  cutSide = "right",
}: {
  className?: string;
  color?: string;
  width?: string | number;
  cutSide?: "left" | "right";
}) {
  return (
    <div
      className={`h-[2px] ${className || ""}`}
      style={{
        width,
        background: color,
        clipPath: cutSide === "right"
          ? "polygon(0 0, calc(100% - 12px) 0, 100% 100%, 0 100%)"
          : "polygon(12px 0, 100% 0, 100% 100%, 0 100%)",
      }}
    />
  );
}

/**
 * Angular accent corner decoration.
 * Small geometric detail for cards and panels.
 */
export function CornerAccent({
  className,
  color = "var(--zyllen-highlight)",
  size = 24,
  position = "top-right",
}: {
  className?: string;
  color?: string;
  size?: number;
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
}) {
  const rotations = {
    "top-right": "0",
    "top-left": "90",
    "bottom-left": "180",
    "bottom-right": "270",
  };
  return (
    <svg
      className={`absolute ${className || ""}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{
        [position.includes("top") ? "top" : "bottom"]: "-1px",
        [position.includes("right") ? "right" : "left"]: "-1px",
        transform: `rotate(${rotations[position]}deg)`,
      }}
    >
      <path d="M24 0 L24 8 L16 8" stroke={color} strokeWidth="2" fill="none" />
    </svg>
  );
}
