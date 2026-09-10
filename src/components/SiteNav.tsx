"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { beats } from "@/lib/book3d.config";
import { BEAT_ATTR, BEAT_KEY, BOOK_GOTO, NAV_LABELS, beatHref } from "@/lib/book-nav";

/** Overshoot ease behind the indicator slide. */
const SPRING = "cubic-bezier(0.34, 1.56, 0.64, 1)";

/**
 * The beat the book is currently showing, or null when there is no interactive
 * book on the page (any route but "/", plus the static fallback the narrow and
 * reduced-motion visitors get).
 */
function useBookBeat(): number | null {
  const [beat, setBeat] = useState<number | null>(null);

  useEffect(() => {
    const read = () => {
      const raw = document.body.dataset[BEAT_KEY];
      setBeat(raw === undefined ? null : Number(raw));
    };
    read();
    const mo = new MutationObserver(read);
    mo.observe(document.body, { attributes: true, attributeFilter: [BEAT_ATTR] });
    return () => mo.disconnect();
  }, []);

  return beat;
}

/**
 * The site's primary navigation: a floating pill listing the book's chapters,
 * with a gilt indicator that glides to whichever one you are reading.
 *
 * It is a table of contents for the book, not a router. On the book's own page
 * each entry turns the book to that beat in place; from anywhere else (the
 * /projects catalog) the same entries are links that land on the book and open
 * that beat. Mounted once in the root layout, so it rides above every page.
 */
export default function SiteNav() {
  const pathname = usePathname();
  const beat = useBookBeat();
  /** Buttons only where a book is listening; links everywhere else. */
  const drivesBook = pathname === "/" && beat !== null;

  // On the catalog the book is not on screen to point at, so only its own
  // Projects entry lights up — everything else is a way back into the book.
  const index = drivesBook ? beat : pathname.startsWith("/projects") ? 3 : -1;

  const pillRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<(HTMLElement | null)[]>([]);
  const [indicator, setIndicator] = useState<{ left: number; width: number } | null>(null);

  // Measured (not derived from index alone) because label widths vary and the
  // pill reflows when the mono font loads in.
  useLayoutEffect(() => {
    const measure = () => {
      const el = index >= 0 ? itemRefs.current[index] : null;
      setIndicator(el ? { left: el.offsetLeft, width: el.offsetWidth } : null);
    };
    measure();
    const pill = pillRef.current;
    if (!pill) return;
    const ro = new ResizeObserver(measure);
    ro.observe(pill);
    return () => ro.disconnect();
  }, [index]);

  const itemClass = (i: number) =>
    `relative z-10 rounded-full px-3.5 py-2 font-mono text-[11px] tracking-[0.18em] whitespace-nowrap uppercase transition-colors duration-300 ${
      index === i ? "text-foreground" : "text-muted/70 hover:text-foreground/85"
    }`;

  return (
    <nav aria-label="Primary" className="fixed inset-x-0 top-5 z-50 flex justify-center px-4">
      <div
        ref={pillRef}
        className="relative flex max-w-full items-center gap-1 overflow-x-auto rounded-full border border-foil/15 bg-[rgba(13,11,9,0.72)] px-2.5 py-1.5 shadow-[0_8px_32px_rgba(0,0,0,0.45),inset_0_0_0_1px_rgba(239,230,212,0.03)] backdrop-blur-xl"
        style={{ scrollbarWidth: "none" }}
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

        {beats.map((b, i) =>
          drivesBook ? (
            <button
              key={b.id}
              ref={(el) => {
                itemRefs.current[i] = el;
              }}
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent(BOOK_GOTO, { detail: i }))}
              aria-current={index === i ? "true" : undefined}
              className={itemClass(i)}
            >
              {NAV_LABELS[b.id]}
            </button>
          ) : (
            <Link
              key={b.id}
              href={beatHref(i)}
              ref={(el) => {
                itemRefs.current[i] = el;
              }}
              aria-current={index === i ? "page" : undefined}
              className={itemClass(i)}
            >
              {NAV_LABELS[b.id]}
            </Link>
          ),
        )}
      </div>
    </nav>
  );
}
