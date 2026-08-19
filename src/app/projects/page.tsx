import type { Metadata } from "next";
import Link from "next/link";

import Shell from "@/components/catalog/Shell";
import { projects } from "@/lib/projects";

export const metadata: Metadata = {
  title: "Projects",
  description: "Ethan Cheung's projects — full case study behind each entry.",
};

/**
 * The formal portfolio: a dense, professional index. Every row is a link to
 * its case study — server-rendered, no list state and no client JS.
 *
 * Scannability rules the layout: one row per project, the same three facts in
 * the same place every time (what it is on the left, when and what kind on the
 * right), hairlines instead of boxes, and a single accent reserved for the
 * hovered row.
 */
export default function ProjectsPage() {
  return (
    <Shell
      heading={
        <div className="min-w-0">
          <h1 className="font-display text-[44px] leading-[1.05] font-semibold">Projects</h1>
          <p className="mt-2 max-w-[46ch] text-[15px] leading-relaxed text-[var(--cat-muted)]">
            Selected work, 2024 — 2026. Each entry opens a full case study.
          </p>
        </div>
      }
    >
      {/* No top rule: the sticky header's bottom border already draws it. */}
      <ul>
        {projects.map((card) => (
          <li key={card.id} className="border-b border-[var(--cat-line)]">
            <Link
              href={`/projects/${card.id}`}
              className="group -mx-3 flex items-start justify-between gap-4 rounded-lg px-3 py-5 transition-colors hover:bg-[var(--cat-surface)] sm:gap-6"
            >
              <div className="min-w-0">
                <span className="text-[17px] font-semibold tracking-[-0.01em] transition-colors group-hover:text-[var(--cat-accent)]">
                  {card.title}
                </span>
                <p className="mt-1 max-w-[62ch] text-[14.5px] leading-snug text-[var(--cat-muted)]">
                  {card.tagline}
                </p>
                <p className="mt-2 font-mono text-[12px] text-[var(--cat-muted)]/80">
                  {card.stack.join(" · ")}
                </p>
              </div>

              {/* Metadata column: fixed width and right-aligned so the years
                  stack into one readable edge instead of drifting with the
                  length of each title. */}
              <div className="flex shrink-0 items-start gap-3 pt-0.5 sm:gap-4">
                <div className="w-[74px] text-right sm:w-[92px]">
                  <p className="font-mono text-[12.5px] tabular-nums text-[var(--cat-muted)]">
                    {card.period}
                  </p>
                  {/* Secondary on a phone, where every px of the title column
                      counts — the case study repeats it anyway. */}
                  <p className="mt-1 hidden font-mono text-[11px] tracking-[0.04em] text-[var(--cat-muted)]/70 uppercase sm:block">
                    {card.category}
                  </p>
                </div>
                <span
                  aria-hidden="true"
                  className="text-[15px] text-[var(--cat-muted)]/60 transition-all group-hover:translate-x-0.5 group-hover:text-[var(--cat-accent)]"
                >
                  →
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </Shell>
  );
}
