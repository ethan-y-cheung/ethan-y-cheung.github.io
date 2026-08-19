"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import { SKILL_ICONS } from "@/lib/skill-icons";
import type { ProjectCard } from "@/lib/spreads";

export type ProjectPickup = { card: ProjectCard; rect: DOMRect };

/** Lift-out flight, deliberately unhurried: the card is being drawn up to the
    reader's face, and the book needs its ~700ms to recede underneath it. */
const ENTER_MS = 850;
/** Return flight (transform transition set imperatively in requestClose). */
const EXIT_MS = 520;

/**
 * The picked-up clipping. A shared-element (FLIP) move: the detail card mounts
 * centered at full size, is snapped back onto the clipping's screen rect with
 * a transform, then transitions to identity — so it reads as the clipping
 * lifting off the page and coming up to the reader's face. Closing plays the
 * same move in reverse before unmounting.
 *
 * The pages are real DOM sitting on the 3D book, so the source rect is just
 * getBoundingClientRect() of the clipping — no unprojection needed.
 */
export default function ProjectOverlay({
  pickup,
  onReturnStart,
  onClose,
}: {
  pickup: ProjectPickup;
  /** Fired the instant the return flight starts, so the book can recover
      (raise + unblur) WHILE the card flies back, not after it lands. */
  onReturnStart: () => void;
  onClose: () => void;
}) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const closingRef = useRef(false);
  const [lifted, setLifted] = useState(false);

  /** Transform that lays the full-size card back over the page clipping. */
  const toSource = useCallback(
    (el: HTMLDivElement) => {
      const prev = el.style.transform;
      el.style.transform = "none";
      const f = el.getBoundingClientRect();
      el.style.transform = prev;
      const s = pickup.rect;
      const dx = s.left + s.width / 2 - (f.left + f.width / 2);
      const dy = s.top + s.height / 2 - (f.top + f.height / 2);
      return `translate(${dx}px, ${dy}px) scale(${s.width / f.width}, ${s.height / f.height}) rotate(-1.4deg)`;
    },
    [pickup.rect],
  );

  useLayoutEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    // Start collapsed onto the clipping with transitions OFF, commit that
    // frame (reflow + a full rAF pair, so the browser has definitely painted
    // the collapsed state), then turn the transition on and release to
    // center. Anything less than the double-rAF risks the browser coalescing
    // both styles into one frame — which reads as the modal just appearing.
    el.style.transition = "none";
    el.style.transform = toSource(el);
    void el.getBoundingClientRect();
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        el.style.transition = `transform ${ENTER_MS}ms cubic-bezier(0.19, 1, 0.22, 1)`;
        el.style.transform = "";
        setLifted(true);
      });
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [toSource]);

  // The clipping stays printed on the page while its copy is held — hide it
  // for the duration so the card reads as pulled OUT of the book, and restore
  // it on unmount, which happens only after the return flight lands.
  useEffect(() => {
    const source = document.querySelector<HTMLElement>(`[data-clipping="${pickup.card.id}"]`);
    if (!source) return;
    source.style.transition = "opacity 0.25s ease";
    source.style.opacity = "0";
    return () => {
      source.style.opacity = "";
    };
  }, [pickup.card.id]);

  const requestClose = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    // Book starts rising/unblurring immediately — but that means the page (and
    // the clipping's true position) is MOVING for the whole return flight, so
    // the card can't land cleanly on its captured rect. Instead it flies most
    // of the way and hands off: card fades out on approach while the printed
    // clipping fades back in underneath.
    onReturnStart();
    const el = cardRef.current;
    if (el) {
      el.style.transition = `transform ${EXIT_MS}ms cubic-bezier(0.5, 0, 0.55, 1), opacity 240ms ease ${EXIT_MS - 260}ms`;
      el.style.transform = toSource(el);
      el.style.opacity = "0";
    }
    setLifted(false);
    window.setTimeout(() => {
      const source = document.querySelector<HTMLElement>(
        `[data-clipping="${pickup.card.id}"]`,
      );
      if (source) source.style.opacity = "";
    }, EXIT_MS - 240);
    window.setTimeout(onClose, EXIT_MS);
  }, [onClose, onReturnStart, pickup.card.id, toSource]);

  useEffect(() => {
    closeRef.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        requestClose();
        return;
      }
      // The book's sequencer must not page while the card is held up.
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "PageUp", "PageDown", " "].includes(e.key)) {
        e.stopPropagation();
      }
    };
    window.addEventListener("keydown", onKey, { capture: true });
    return () => window.removeEventListener("keydown", onKey, { capture: true });
  }, [requestClose]);

  const { card } = pickup;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={card.title}
      className="fixed inset-0 z-[60] flex items-center justify-center px-5 py-8"
      // Gestures over the overlay must not reach the book sequencer.
      onWheel={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
    >
      {/* Click-away backdrop. Only a light dim: the scene wrapper already
          blurs and darkens the receding book itself (BookHero), and doubling
          a backdrop-blur on top muddied the motes. */}
      <button
        type="button"
        aria-label="Put the card back"
        onClick={requestClose}
        className="absolute inset-0 cursor-default bg-black/30 transition-opacity"
        style={{ opacity: lifted ? 1 : 0, transitionDuration: "500ms" }}
      />

      <div
        ref={cardRef}
        className="relative max-h-[90vh] w-full max-w-[880px] overflow-y-auto rounded-[3px] bg-[#fbf7ec] px-10 pt-7 pb-10 text-left text-ink shadow-[0_30px_80px_rgba(0,0,0,0.6),0_4px_12px_rgba(0,0,0,0.4)]"
        // Transitions are managed imperatively: the mount effect owns the
        // lift-out, requestClose owns the return flight.
      >
        <div className="flex items-start justify-between gap-4">
          <p className="pt-2 font-mono text-[11px] tracking-[0.3em] text-ink/50 uppercase">
            Tipped-in plate{card.period ? ` · ${card.period}` : ""}
          </p>
          <button
            ref={closeRef}
            type="button"
            onClick={requestClose}
            aria-label="Close"
            className="-mr-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[20px] leading-none text-ink/50 transition-colors hover:bg-ink/10 hover:text-ink"
          >
            ×
          </button>
        </div>

        <h3 className="mt-1 font-display text-[42px] leading-[1.1] font-semibold">{card.title}</h3>
        <p className="mt-1.5 text-[18px] text-ink/70 italic">{card.tagline}</p>

        {card.image ? (
          // Contain, not cover: screenshots come in at whatever aspect the app
          // window was, and cropping one to fill a fixed box hides the part of
          // the UI that made it worth showing. The cap stops a tall shot from
          // pushing the whole write-up below the fold.
          // eslint-disable-next-line @next/next/no-img-element -- static host, no image optimizer
          <img
            src={card.image}
            alt=""
            className="mt-5 max-h-[44vh] w-full rounded-[2px] object-contain"
          />
        ) : (
          <div
            className="mt-6 flex aspect-[5/2] w-full items-center justify-center rounded-[2px] border border-ink/10"
            style={{
              background: `linear-gradient(135deg, ${card.accent ?? "#8a5a12"}22, ${card.accent ?? "#8a5a12"}08)`,
            }}
          >
            <span className="font-mono text-[11px] tracking-[0.24em] text-ink/35 uppercase">
              TODO: screenshot
            </span>
          </div>
        )}

        <div className="mt-6 space-y-3.5 text-[17px] leading-[1.65] text-ink/85">
          {card.story.map((text, i) => (
            <p key={i}>{text}</p>
          ))}
        </div>

        <ul className="mt-5 flex flex-wrap gap-[7px]">
          {card.stack.map((tech) => {
            const icon = SKILL_ICONS[tech];
            return (
              <li
                key={tech}
                className="flex items-center gap-[6px] rounded-full border border-ink/20 bg-ink/[0.045] px-[11px] py-[3px] text-[13.5px] leading-[1.4] font-medium whitespace-nowrap text-ink/85"
              >
                {icon ? (
                  <svg viewBox="0 0 24 24" width={14} height={14} aria-hidden>
                    <path d={icon.path} fill={icon.hex} />
                  </svg>
                ) : null}
                {tech}
              </li>
            );
          })}
        </ul>

        {card.demo ? (
          <div className="mt-6">
            {card.demo.kind === "iframe" ? (
              <iframe
                src={card.demo.src}
                title={`${card.title} demo`}
                className="aspect-video w-full rounded-[2px] border border-ink/15 bg-white"
              />
            ) : (
              <video src={card.demo.src} controls className="w-full rounded-[2px]" />
            )}
            {card.demo.caption ? (
              <p className="mt-2 font-mono text-[10.5px] tracking-[0.18em] text-ink/45 uppercase">
                {card.demo.caption}
              </p>
            ) : null}
          </div>
        ) : null}

        {card.poster ? (
          <figure className="mt-6">
            <a href={card.poster.href ?? card.poster.src} target="_blank" rel="noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element -- static host, no image optimizer */}
              <img
                src={card.poster.src}
                alt=""
                className="w-full rounded-[2px] border border-ink/15"
              />
            </a>
            <figcaption className="mt-2 font-mono text-[10.5px] tracking-[0.18em] text-ink/45 uppercase">
              {card.poster.caption ?? "Poster · full size (PDF)"}
            </figcaption>
          </figure>
        ) : null}

        {card.links?.length ? (
          <div className="mt-6 flex flex-wrap gap-3">
            {card.links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-ink/25 px-5 py-2 font-mono text-[11px] tracking-[0.2em] text-ink/75 uppercase transition-colors hover:border-ink/60 hover:text-ink"
              >
                {link.label} ↗
              </a>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
