"use client";

import { useEffect, useRef } from "react";

import SocialIcons from "@/components/SocialIcons";
import { contact } from "@/lib/spreads";

/**
 * The contact finale. While the book riffles to its last page and gets swept
 * off the desk (driven in Book's useFrame from the same progress value), this
 * overlay takes the stage: a letter to be written, on the same paper stock as
 * the book's pages, followed by the site's colophon as a footer.
 *
 * The reveal is attribute-driven, not per-frame: a rAF watches the shared
 * progress ref and flips `data-shown` once the book is on its way out; CSS
 * transitions with per-item delays do the staggered rise. Scrolling up
 * anywhere outside the letter brings the book back (the sequencer owns that);
 * gestures inside the letter are stopped so writing is never interrupted.
 */
export default function ContactFinale({
  progressRef,
  start,
}: {
  progressRef: React.RefObject<number>;
  /** Progress value where the finale begins (== number of spreads). */
  start: number;
}) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const shownRef = useRef(false);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const root = rootRef.current;
      if (!root) return;
      const fin = Math.min(1, Math.max(0, (progressRef.current ?? 0) - start));
      // The letter enters once the book is clearly leaving, not at the very
      // start of the beat — the riffle deserves a moment alone.
      const shown = fin > 0.45;
      if (shown === shownRef.current) return;
      shownRef.current = shown;
      root.dataset.shown = String(shown);
      root.style.visibility = shown ? "visible" : "hidden";
      root.setAttribute("aria-hidden", String(!shown));
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [progressRef, start]);

  return (
    <div
      ref={rootRef}
      data-shown="false"
      aria-hidden="true"
      // The root never takes pointer events itself — beat dots and HeadBar
      // stay clickable around the letter; only the inner column is interactive.
      className="pointer-events-none absolute inset-0 z-10 overflow-y-auto"
      style={{ visibility: "hidden" }}
    >
      <style>{`
        [data-shown] .cf-item {
          opacity: 0;
          transform: translateY(30px);
          transition: opacity 0.6s ease, transform 0.8s cubic-bezier(0.22, 1, 0.36, 1);
        }
        [data-shown="true"] .cf-item {
          opacity: 1;
          transform: none;
        }
      `}</style>

      {/* pt clears the fixed HeadBar pill; the column centers in what's left. */}
      <div className="flex min-h-full items-center justify-center px-6 pt-20 pb-8">
        <div
          className="pointer-events-auto w-full max-w-[600px] text-center"
          // Gestures over the letter must not page the book back mid-sentence.
          onWheel={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
        >
          <p
            className="cf-item font-mono text-[14px] tracking-[0.42em] text-foil uppercase"
            style={{ transitionDelay: "60ms" }}
          >
            {contact.kicker}
          </p>

          <h2
            className="cf-item mt-2 font-display text-[46px] leading-[1.1] font-semibold"
            style={{
              transitionDelay: "140ms",
              backgroundImage:
                "linear-gradient(168deg, #f3e6bd 0%, #d9bc7d 38%, #a08347 66%, #e3cd96 100%)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
              filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.6))",
            }}
          >
            {contact.heading}
          </h2>

          <p
            className="cf-item mt-3 text-[18px] leading-relaxed text-foreground/85"
            style={{ transitionDelay: "220ms" }}
          >
            {contact.blurb}
          </p>

          <div className="cf-item mt-6" style={{ transitionDelay: "320ms" }}>
            <LetterForm />
          </div>

          <div
            className="cf-item mt-6 text-[16px]"
            style={{ transitionDelay: "430ms" }}
          >
            <SocialIcons />
          </div>

          <div className="cf-item" style={{ transitionDelay: "520ms" }}>
            <FinaleFooter />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * The form is a letter on the book's own paper stock: ruled lines under the
 * message, a return-address line, and a wax-red send button. Plain mailto
 * submission — no backend to run on a static host.
 */
export function LetterForm() {
  return (
    <form
      action={`mailto:${contact.email}`}
      method="post"
      encType="text/plain"
      className="rounded-[3px] bg-[#f4efe3] px-9 pt-8 pb-9 text-left text-ink shadow-[0_18px_50px_rgba(0,0,0,0.5),0_2px_6px_rgba(0,0,0,0.35)]"
    >
      <p className="font-mono text-[13px] tracking-[0.3em] text-ink/70 uppercase">
        To: Ethan Cheung
      </p>

      <label className="mt-6 block">
        <span className="font-mono text-[13px] tracking-[0.3em] text-ink/70 uppercase">From</span>
        <input
          type="email"
          name="from"
          required
          placeholder="your@email.com"
          className="mt-1.5 w-full border-b-2 border-ink/30 bg-transparent pb-1.5 text-[18px] text-ink placeholder:text-ink/55 focus:border-ink/60 focus:outline-none"
        />
      </label>

      <label className="mt-6 block">
        <span className="font-mono text-[13px] tracking-[0.3em] text-ink/70 uppercase">
          Message
        </span>
        <textarea
          name="message"
          required
          rows={5}
          placeholder="Your message"
          className="mt-1.5 w-full resize-none bg-transparent text-[18px] leading-[34px] text-ink placeholder:text-ink/55 focus:outline-none"
          // Ruled like letter paper: a hairline under every written line.
          style={{
            backgroundImage:
              "repeating-linear-gradient(transparent, transparent 33px, rgba(42,33,24,0.22) 33px, rgba(42,33,24,0.22) 34px)",
          }}
        />
      </label>

      <div className="mt-6 flex items-center justify-between">
        <span className="font-mono text-[12px] tracking-[0.2em] text-ink/60 uppercase">
          Postage paid
        </span>
        <button
          type="submit"
          className="rounded-full bg-[#7a2a1d] px-7 py-3 font-mono text-[13px] tracking-[0.24em] text-[#f4efe3] uppercase shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_3px_10px_rgba(0,0,0,0.35)] transition-all duration-300 hover:bg-[#8f3423] hover:shadow-[0_5px_16px_rgba(122,42,29,0.5)]"
        >
          Seal &amp; send
        </button>
      </div>
    </form>
  );
}

export function FinaleFooter() {
  return (
    <footer className="mt-6 border-t border-foil/15 pt-4 font-mono text-[13px] tracking-[0.14em] text-muted">
      <p>© {new Date().getFullYear()} Ethan Cheung · All Rights Reserved</p>
    </footer>
  );
}
