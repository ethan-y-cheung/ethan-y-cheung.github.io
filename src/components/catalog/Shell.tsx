import Link from "next/link";
import type { ReactNode } from "react";

import DotGrid from "./DotGrid";
import ThemeToggle from "./ThemeToggle";

/**
 * Restores the persisted catalog theme before first paint. Inline so it runs
 * during HTML parse — a useEffect would flash light for dark-theme visitors.
 * Only "dark" sets the attribute; light is the attribute's absence.
 */
const THEME_SCRIPT = `try{if(localStorage.getItem("catalog-theme")==="dark")document.documentElement.dataset.catalogTheme="dark"}catch(e){}`;

/**
 * Page chrome for the catalog wing (/about, /experience, /contact, /projects
 * and its case studies).
 *
 * The viewport never scrolls: the header is a fixed band and only the content
 * below it moves. Two details make that work without visual seams.
 *
 * The scroll container is full width with the column centered inside, so the
 * scrollbar rides the window edge rather than eating into the column; its
 * symmetric `stable both-edges` gutter (globals.css) means this header, which
 * sits outside the container, still lines up exactly with the rows inside it.
 *
 * And the header sits outside rather than sticking inside, so rows clip at its
 * bottom border instead of passing beneath it. That is why it needs no
 * background: the dot grid and its cursor glow run through the header
 * uninterrupted, where an opaque band would cut a rectangle out of them.
 *
 * There is no home button here any more — SiteNav floats above every page with
 * the full route list, and the header's top padding is what clears it.
 */
export default function Shell({
  heading,
  back,
  children,
}: {
  /** Sticky title block, level with the controls. Omit on subpages. */
  heading?: ReactNode;
  /** Adds a "Projects" link ahead of the controls (case studies). */
  back?: boolean;
  children: ReactNode;
}) {
  const control =
    "flex h-9 items-center justify-center rounded-lg border border-[var(--cat-line)] text-[var(--cat-muted)] transition-colors hover:border-[var(--cat-accent)] hover:text-[var(--cat-accent)]";

  return (
    <div className="catalog-scope flex h-dvh flex-col overflow-hidden font-sans">
      <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      <DotGrid />

      <div className="relative z-10 mx-auto w-full max-w-[880px] shrink-0 px-5 sm:px-8">
        {/* pt-24 is clearance for the floating nav pill, not taste — it is
            fixed at top-5 and stands ~44px tall. */}
        <header className="flex items-start justify-between gap-6 border-b border-[var(--cat-line)] pt-24 pb-7">
          {heading ?? <span />}
          {/* Nudged down so the icon boxes read as level with the cap height
              of the display title beside them, not with its line box. */}
          <div className={`flex shrink-0 items-center gap-2 ${heading ? "pt-[7px]" : ""}`}>
            {back ? (
              <Link
                href="/projects"
                className={`${control} px-3.5 font-mono text-[12px] tracking-[0.06em]`}
              >
                ← Projects
              </Link>
            ) : null}
            <ThemeToggle />
          </div>
        </header>
      </div>

      <div className="catalog-scroll relative z-10 min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="mx-auto w-full max-w-[880px] px-5 pb-16 sm:px-8">{children}</div>
      </div>
    </div>
  );
}
