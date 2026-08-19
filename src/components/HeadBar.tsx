"use client";

import { useLayoutEffect, useRef, useState } from "react";

import { beats, type BeatId } from "@/lib/book3d.config";

/** Nav wording differs from the beat labels: no roman numerals in a pill. */
const NAV_LABELS: Record<BeatId, string> = {
  cover: "Home",
  about: "About",
  experience: "Experience",
  projects: "Projects",
  contact: "Contact",
};

/** Overshoot ease shared by the drop-in and the indicator slide. */
const SPRING = "cubic-bezier(0.34, 1.56, 0.64, 1)";

/**
 * Floating pill navigation that drops in once the book cover has been opened
 * (any beat past 0) and slides back out when the reader returns to the cover.
 * A gilt indicator glides behind whichever beat is current.
 */
export default function HeadBar({
  index,
  onNavigate,
}: {
  index: number;
  onNavigate: (beat: number) => void;
}) {
  const visible = index >= 1;
  const pillRef = useRef<HTMLDivElement | null>(null);
  const linkRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [indicator, setIndicator] = useState<{ left: number; width: number } | null>(null);

  // Measured (not derived from index alone) because label widths vary and the
  // pill reflows when the mono font loads in.
  useLayoutEffect(() => {
    const measure = () => {
      const el = linkRefs.current[index];
      if (!el) return;
      setIndicator({ left: el.offsetLeft, width: el.offsetWidth });
    };
    measure();
    const pill = pillRef.current;
    if (!pill) return;
    const ro = new ResizeObserver(measure);
    ro.observe(pill);
    return () => ro.disconnect();
  }, [index]);

  return (
    <nav
      aria-label="Primary"
      aria-hidden={!visible}
      className="fixed inset-x-0 top-5 z-50 flex justify-center"
      style={{
        transform: visible ? "translateY(0)" : "translateY(-96px)",
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? "auto" : "none",
        transition: `transform 0.5s ${SPRING}, opacity 0.4s ease`,
      }}
    >
      <div
        ref={pillRef}
        className="relative flex items-center gap-1 rounded-full border border-foil/15 bg-[rgba(13,11,9,0.72)] px-2.5 py-1.5 shadow-[0_8px_32px_rgba(0,0,0,0.45),inset_0_0_0_1px_rgba(239,230,212,0.03)] backdrop-blur-xl"
      >
        {indicator && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-1.5 rounded-full border border-amber/35 bg-gradient-to-br from-amber/25 to-foil/10 shadow-[0_0_20px_rgba(212,162,78,0.15),inset_0_0_8px_rgba(212,162,78,0.1)]"
            style={{
              left: indicator.left,
              width: indicator.width,
              transition: `left 0.4s ${SPRING}, width 0.4s ${SPRING}`,
            }}
          />
        )}

        {beats.map((beat, i) => (
          <button
            key={beat.id}
            ref={(el) => {
              linkRefs.current[i] = el;
            }}
            type="button"
            tabIndex={visible ? 0 : -1}
            onClick={() => onNavigate(i)}
            aria-current={index === i ? "true" : undefined}
            className={`relative z-10 rounded-full px-3.5 py-2 font-mono text-[11px] tracking-[0.18em] uppercase whitespace-nowrap transition-colors duration-300 ${
              index === i ? "text-foreground" : "text-muted/70 hover:text-foreground/85"
            }`}
          >
            {NAV_LABELS[beat.id]}
          </button>
        ))}
      </div>
    </nav>
  );
}
