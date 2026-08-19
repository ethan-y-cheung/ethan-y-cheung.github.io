"use client";

/**
 * Light/dark switch for the catalog wing only — it flips `data-catalog-theme`
 * on <html> and persists the choice; the book's pages never read it.
 *
 * Stateless on purpose: which icon shows is decided by CSS keyed off the html
 * attribute, so server HTML never disagrees with the stored theme (no
 * hydration flicker, no useEffect dance).
 */
export default function ThemeToggle() {
  const flip = () => {
    const root = document.documentElement;
    const dark = root.dataset.catalogTheme === "dark";
    if (dark) delete root.dataset.catalogTheme;
    else root.dataset.catalogTheme = "dark";
    try {
      localStorage.setItem("catalog-theme", dark ? "light" : "dark");
    } catch {
      /* private mode — theme just won't persist */
    }
  };

  return (
    <button
      type="button"
      onClick={flip}
      aria-label="Toggle light or dark theme"
      className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--cat-line)] text-[var(--cat-muted)] transition-colors hover:border-[var(--cat-accent)] hover:text-[var(--cat-accent)]"
    >
      {/* Moon (shown in light mode — the thing you'd switch to). */}
      <svg
        viewBox="0 0 24 24"
        width={16}
        height={16}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="block [[data-catalog-theme=dark]_&]:hidden"
      >
        <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
      </svg>
      {/* Sun (shown in dark mode). */}
      <svg
        viewBox="0 0 24 24"
        width={16}
        height={16}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="hidden [[data-catalog-theme=dark]_&]:block"
      >
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4m11.4-11.4 1.4-1.4" />
      </svg>
    </button>
  );
}
