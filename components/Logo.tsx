// NEXERA logo — one intelligence layer connecting many models.
//   variant="mark"     → routing "N": two model-node columns linked by a diagonal
//                        routing path through a central hub. Blue→violet gradient.
//   variant="terminal" → mark + lowercase `nexera` wordmark for dev surfaces.

export type LogoVariant = "mark" | "terminal";

export default function Logo({
  size = 40,
  withWordmark = true,
  variant = "mark",
}: {
  size?: number;
  withWordmark?: boolean;
  variant?: LogoVariant;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <NexeraMark size={size} />
      {withWordmark &&
        (variant === "terminal" ? (
          <span className="text-[17px] font-semibold tracking-tight text-ink">
            nexera
          </span>
        ) : (
          <span className="text-[17px] font-semibold tracking-tight text-ink">
            NEXERA
          </span>
        ))}
    </div>
  );
}

/**
 * The NEXERA symbol: a geometric "N" built from two model-node columns linked by
 * a diagonal routing path that passes through a central intelligence hub. Reads as
 * "one layer connecting many models." 180°-symmetric, monochrome-safe (uses
 * currentColor when no gradient), and legible down to 16px.
 */
export function NexeraMark({ size = 48 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      {/* N skeleton: left column, diagonal routing path, right column */}
      <g
        stroke="url(#nexFill)"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      >
        <path d="M13 35 V13" />
        <path d="M13 13 L35 35" />
        <path d="M35 35 V13" />
      </g>
      {/* four model nodes at the column ends */}
      <g fill="url(#nexFill)">
        <circle cx="13" cy="13" r="3.2" />
        <circle cx="13" cy="35" r="3.2" />
        <circle cx="35" cy="13" r="3.2" />
        <circle cx="35" cy="35" r="3.2" />
      </g>
      {/* central routing hub — the one intelligence layer */}
      <circle cx="24" cy="24" r="5.4" fill="url(#nexFill)" />
      <circle cx="24" cy="24" r="2.1" fill="#ffffff" />
      <defs>
        <linearGradient id="nexFill" x1="11" y1="11" x2="37" y2="37" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#f2761c" />
          <stop offset="1" stopColor="#fb8c6a" />
        </linearGradient>
      </defs>
    </svg>
  );
}
