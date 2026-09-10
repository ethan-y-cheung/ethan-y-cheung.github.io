"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import SocialIcons from "@/components/SocialIcons";
import { beats } from "@/lib/book3d.config";
import { BEAT_KEY, BOOK_GOTO, beatFromHash } from "@/lib/book-nav";
import { cover, spreads, type ProjectCard } from "@/lib/spreads";

import ContactFinale, { FinaleFooter, LetterForm } from "./ContactFinale";
import CoverTitle from "./CoverTitle";
import { letteringText } from "./cover-lettering";
import PageContent from "./PageContent";
import ProjectOverlay, { type ProjectPickup } from "./ProjectOverlay";
import { useBookSequence } from "./useBookSequence";

// three.js must not run on the server, and there is no point shipping it to
// clients that will only ever see the static fallback.
const BookScene = dynamic(() => import("./BookScene"), { ssr: false });

export default function BookHero() {
  const [enhanced, setEnhanced] = useState(false);
  /**
   * False until the media queries have actually been read on the client. The
   * server has to guess, and it guesses "static fallback" — this is how the
   * fallback knows whether it is a real answer or a placeholder.
   */
  const [measured, setMeasured] = useState(false);

  useEffect(() => {
    const wide = window.matchMedia("(min-width: 768px)");
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      setEnhanced(wide.matches && !calm.matches);
      setMeasured(true);
    };
    sync();
    wide.addEventListener("change", sync);
    calm.addEventListener("change", sync);
    return () => {
      wide.removeEventListener("change", sync);
      calm.removeEventListener("change", sync);
    };
  }, []);

  const { index, animating, progressRef, sectionRef, goTo } = useBookSequence(enhanced);

  const [pickup, setPickup] = useState<ProjectPickup | null>(null);
  /**
   * True from the moment a clipping is picked up until its return flight
   * starts — i.e. while the card is (or is about to be) held up close. Drives
   * the book's recede pose (via heldRef, read per frame in the Canvas) and the
   * CSS blur on the scene, so both release WHILE the card flies back, not
   * after it lands.
   */
  const [held, setHeld] = useState(false);
  const heldRef = useRef(0);
  useEffect(() => {
    heldRef.current = held ? 1 : 0;
  }, [held]);

  const openProject = useCallback((card: ProjectCard, rect: DOMRect) => {
    setPickup({ card, rect });
    setHeld(true);
  }, []);
  const returnProject = useCallback(() => setHeld(false), []);
  const closeProject = useCallback(() => setPickup(null), []);

  /**
   * The floating nav bar lives in the root layout, far above this component,
   * so the two talk through the DOM (see lib/book-nav.ts): the beat goes out
   * on <body>, and clicks come back as an event. Nothing is published unless
   * the book is actually interactive, which is what tells the bar to fall back
   * to plain links on the static fallback.
   */
  useEffect(() => {
    if (!enhanced) return;
    document.body.dataset[BEAT_KEY] = String(index);
    return () => {
      delete document.body.dataset[BEAT_KEY];
    };
  }, [enhanced, index]);

  useEffect(() => {
    if (!enhanced) return;
    const onGoto = (e: Event) => goTo((e as CustomEvent<number>).detail);
    window.addEventListener(BOOK_GOTO, onGoto);
    return () => window.removeEventListener(BOOK_GOTO, onGoto);
  }, [enhanced, goTo]);

  /**
   * Opens the beat named by the URL hash — how "/#projects" from the catalog
   * lands on the right spread. Runs once the book is interactive; the static
   * fallback lets the browser scroll to the matching section id instead.
   */
  useEffect(() => {
    if (!enhanced) return;
    const target = beatFromHash(window.location.hash);
    if (target > 0) goTo(target);
  }, [enhanced, goTo]);

  const pages = useMemo(
    () =>
      spreads.map((spread) => ({
        left: <PageContent page={spread.left} chapter={spread.chapter} onProject={openProject} />,
        right: <PageContent page={spread.right} onProject={openProject} />,
      })),
    [openProject],
  );

  if (!enhanced) return <BookStatic pending={!measured} />;

  return (
    <section
      ref={sectionRef}
      aria-label="Introduction"
      className="relative h-screen w-full overflow-hidden"
    >
      {/* z-0 wrapper: drei's Html panels carry an enormous internal z-index;
          an own stacking context here traps it so the overlays above (finale,
          picked-up project card, nav) can actually stack over the pages.
          The blur is the DOM half of the pickup recede: the 3D pose change
          happens in Book's useFrame, this defocuses the whole scene with it. */}
      <div
        className="absolute inset-0 z-0"
        style={{
          filter: held ? "blur(9px) brightness(0.6)" : "blur(0px) brightness(1)",
          transition: "filter 700ms ease",
        }}
      >
        <BookScene
          progressRef={progressRef}
          heldRef={heldRef}
          spreads={pages}
          coverFace={<CoverFace active={index === 0} />}
        />
      </div>

      {/* The last beat: the book swipes away and the letter takes the stage. */}
      <ContactFinale progressRef={progressRef} start={spreads.length} />

      {/* A picked-up project clipping, lifted off the page into a detail view.
          Keyed so a different card always remounts and replays the lift. */}
      {pickup ? (
        <ProjectOverlay
          key={pickup.card.id}
          pickup={pickup}
          onReturnStart={returnProject}
          onClose={closeProject}
        />
      ) : null}

      {/* Beat navigation. Also the accessible way through the sequence.
          z-20: must stay clickable above the finale overlay. */}
      <nav
        aria-label="Sections"
        className="absolute top-1/2 right-6 z-20 flex -translate-y-1/2 flex-col gap-3"
      >
        {beats.map((beat, i) => (
          <button
            key={beat.id}
            type="button"
            onClick={() => goTo(i)}
            aria-current={index === i ? "true" : undefined}
            aria-label={beat.label}
            className={`h-2.5 w-2.5 rounded-full border transition-all duration-300 ${
              index === i
                ? "scale-125 border-amber bg-amber"
                : "border-foil/40 bg-transparent hover:border-foil"
            }`}
          />
        ))}
      </nav>

      <p
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-8 text-center font-mono text-[11px] tracking-[0.3em] text-muted/60 uppercase transition-opacity duration-500"
        style={{ opacity: index === 0 && !animating ? 1 : 0 }}
      >
        Scroll to open
      </p>
    </section>
  );
}

function CoverFace({ active }: { active: boolean }) {
  return (
    <div className="flex h-full flex-col items-center justify-center text-center">
      {/* Foil-stamped title: gold gradient clipped to the glyphs, with a deboss
          shadow so it reads as pressed into the leather rather than printed. */}
      {cover.title === letteringText ? (
        <CoverTitle active={active} />
      ) : (
        <h1
          className="font-display font-semibold"
          style={{
            fontSize: "144px",
            lineHeight: 1.14,
            // Leave room for Fraunces' descenders inside the clipped gradient.
            padding: "0.1em 0.12em 0.2em",
            letterSpacing: "0.015em",
            backgroundImage:
              "linear-gradient(168deg, #f3e6bd 0%, #d9bc7d 38%, #a08347 66%, #e3cd96 100%)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
            filter:
              "drop-shadow(0 1px 1px rgba(0,0,0,0.65)) drop-shadow(0 0 20px rgba(212,162,78,0.2))",
          }}
        >
          {cover.title}
        </h1>
      )}
      <p
        // Clears the descenders and their ~20px foil glow (the title's bottom
        // padding already contributes ~13px of the gap).
        className="mt-[20px] font-mono uppercase"
        style={{ fontSize: "28px", letterSpacing: "0.42em", color: "rgba(232,220,194,0.62)" }}
      >
        {cover.subtitle}
      </p>
      <div
        className="mt-[40px]"
        style={{ fontSize: 24, filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.55))" }}
      >
        <SocialIcons />
      </div>
    </div>
  );
}

/**
 * Narrow viewports and prefers-reduced-motion get the same content as ordinary
 * stacked sections. This is also what the server renders, so every word ships in
 * the initial HTML regardless of whether three.js ever loads.
 *
 * `pending` marks the server's guess, before the client has read the media
 * queries. While it is set, the `book-static` class lets CSS hide this on the
 * setups the 3D book is about to take over — otherwise the browser paints the
 * whole stacked article before React has hydrated, and it is visibly replaced.
 * Once the queries have been read the class comes off, so a visitor who really
 * is getting the fallback always sees it.
 */
function BookStatic({ pending = false }: { pending?: boolean }) {
  return (
    <section
      aria-label="Introduction"
      className={`mx-auto max-w-2xl px-6 py-20 ${pending ? "book-static" : ""}`}
    >
      <header className="mb-16 text-center">
        <h1 className="font-display text-3xl font-semibold">{cover.title}</h1>
        <p className="mt-2 font-mono text-[11px] tracking-[0.3em] text-muted uppercase">
          {cover.subtitle}
        </p>
        <div className="mt-8 text-base">
          <SocialIcons />
        </div>
      </header>

      <div className="space-y-16">
        {spreads.map((spread) => (
          // Ids match the beat ids, so the nav's "/#about" links land here
          // when the reader gets the static fallback instead of the book.
          // scroll-mt clears the floating nav bar.
          <div key={spread.id} id={spread.id} className="scroll-mt-24 space-y-6">
            <p className="font-mono text-[11px] tracking-[0.32em] text-muted uppercase">
              {spread.chapter}
            </p>
            <div className="space-y-6 [&_.text-ink]:text-foreground">
              <PageContent page={spread.left} />
              <PageContent page={spread.right} />
            </div>
          </div>
        ))}

        {/* Contact: same letter as the finale overlay, minus the theatrics. */}
        <div id="contact" className="scroll-mt-24 space-y-6">
          <p className="font-mono text-[11px] tracking-[0.32em] text-muted uppercase">
            Epilogue. Contact
          </p>
          <LetterForm />
          <FinaleFooter />
        </div>
      </div>
    </section>
  );
}
