"use client";

import { useEffect, useRef } from "react";

/**
 * Dot-grid background with a soft pointer glow: a second, brighter dot layer
 * masked by a radial gradient that trails the cursor. Deliberately cheap —
 * both layers are plain CSS backgrounds, the glow is just two CSS custom
 * properties updated at most once per animation frame, and there is no canvas
 * and no per-dot work. Reduced motion (and touch devices, where the pointer
 * never moves) simply never reveal the glow layer.
 */
export default function DotGrid() {
  const glowRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const glow = glowRef.current;
    if (!glow) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    let x = -1000;
    let y = -1000;

    const commit = () => {
      raf = 0;
      glow.style.setProperty("--mx", `${x}px`);
      glow.style.setProperty("--my", `${y}px`);
      glow.style.opacity = "1";
    };
    const onMove = (e: PointerEvent) => {
      x = e.clientX;
      y = e.clientY;
      if (!raf) raf = requestAnimationFrame(commit);
    };
    const onLeave = () => {
      glow.style.opacity = "0";
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  const dots = (color: string, size: string) => ({
    backgroundImage: `radial-gradient(${color} ${size}, transparent ${size})`,
    backgroundSize: "26px 26px",
  });

  return (
    // z-0 with the page content lifted to z-10 — a negative z-index here would
    // drop the grid behind the scope's own opaque background.
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0">
      <div className="absolute inset-0" style={dots("var(--cat-dot)", "1px")} />
      <div
        ref={glowRef}
        className="absolute inset-0 opacity-0 transition-opacity duration-500"
        style={{
          ...dots("var(--cat-dot-hi)", "1.2px"),
          WebkitMaskImage:
            "radial-gradient(190px circle at var(--mx, -1000px) var(--my, -1000px), black 0%, transparent 72%)",
          maskImage:
            "radial-gradient(190px circle at var(--mx, -1000px) var(--my, -1000px), black 0%, transparent 72%)",
        }}
      />
    </div>
  );
}
