"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import HeadBar from "@/components/HeadBar";
import SocialIcons from "@/components/SocialIcons";
import { beats } from "@/lib/book3d.config";
import { cover, spreads, type ProjectCard } from "@/lib/spreads";

import ContactFinale, { FinaleFooter, LetterForm } from "./ContactFinale";
import PageContent from "./PageContent";
import ProjectOverlay, { type ProjectPickup } from "./ProjectOverlay";
import { useBookSequence } from "./useBookSequence";

// three.js must not run on the server, and there is no point shipping it to
// clients that will only ever see the static fallback.
const BookScene = dynamic(() => import("./BookScene"), { ssr: false });

export default function BookHero() {
  const [enhanced, setEnhanced] = useState(false);

  useEffect(() => {
    const wide = window.matchMedia("(min-width: 768px)");
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setEnhanced(wide.matches && !calm.matches);
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

  const pages = useMemo(
    () =>
      spreads.map((spread) => ({
        left: <PageContent page={spread.left} chapter={spread.chapter} onProject={openProject} />,
        right: <PageContent page={spread.right} onProject={openProject} />,
      })),
    [openProject],
  );

  if (!enhanced) return <BookStatic />;

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
          coverFace={<CoverFace />}
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

      {/* Drops in once the cover is opened; hides again on the cover beat. */}
      <HeadBar index={index} onNavigate={goTo} />

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

function CoverFace() {
  return (
    <div className="flex h-full flex-col items-center justify-center text-center">
      {/* Foil-stamped title: gold gradient clipped to the glyphs, with a deboss
          shadow so it reads as pressed into the leather rather than printed. */}
      <h1
        className="font-display font-semibold"
        style={{
          fontSize: "144px",
          lineHeight: 1.14,
          // background-clip: text only paints inside the border box, and
          // Fraunces' descent pokes below the line box at this size — without
          // the bottom padding the gradient stops mid-"g" and the descender
          // looks sheared off. The padding is invisible (background clips to
          // the glyphs), it only extends the paintable area.
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
 */
function BookStatic() {
  return (
    <section aria-label="Introduction" className="mx-auto max-w-2xl px-6 py-20">
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
          <div key={spread.id} className="space-y-6">
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
        <div className="space-y-6">
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
