/**
 * The contract between the floating nav bar and the book it drives.
 *
 * The bar is mounted once in the root layout and the book lives several levels
 * below it, so the two talk through the DOM rather than React state: the book
 * publishes which beat it is on, and the bar fires an event to move it. That
 * keeps the root layout a server component — a context provider there would
 * turn the whole tree into a client boundary.
 */
import { beats, type BeatId } from "./book3d.config";

/** Nav wording differs from the beat labels: no roman numerals in a pill. */
export const NAV_LABELS: Record<BeatId, string> = {
  cover: "Home",
  about: "About",
  experience: "Experience",
  projects: "Projects",
  contact: "Contact",
};

/** Event the bar fires at the book; `detail` is the beat index. */
export const BOOK_GOTO = "book:goto";

/**
 * `data-book-beat` on <body>: the beat the book is on. Present only while an
 * interactive book is mounted, so its absence is how the bar knows to fall
 * back to links. Both spellings are exported because one side reads the
 * attribute and the other writes the dataset key.
 */
export const BEAT_ATTR = "data-book-beat";
export const BEAT_KEY = "bookBeat";

/** Where a beat lives when you are not already on the book's page. */
export const beatHref = (i: number) => (i === 0 ? "/" : `/#${beats[i].id}`);

/** The beat a location hash names, or -1 if it names none. */
export function beatFromHash(hash: string): number {
  const id = hash.replace(/^#/, "");
  return id ? beats.findIndex((beat) => beat.id === id) : -1;
}
