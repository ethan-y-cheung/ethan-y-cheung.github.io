import Link from "next/link";

import { SKILL_ICONS } from "@/lib/skill-icons";
import type { ProjectCard, SkillGroup, SpreadPage } from "@/lib/spreads";

/**
 * Category glyphs are generic (code, layers, cloud…) rather than per-brand:
 * at chip size on a 520px page a brand mark is illegible, and one icon per
 * group keeps the printed-page look.
 */
const ICON_PATHS: Record<SkillGroup["icon"], string> = {
  code: "M16 18l6-6-6-6M8 6l-6 6 6 6",
  layers: "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
  cloud: "M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9z",
  wrench:
    "M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z",
  cpu: "M9 2v2m6-2v2M9 20v2m6-2v2M2 9h2m-2 6h2m16-6h2m-2 6h2M6 4h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm3 5h6v6H9V9z",
};

/**
 * Renders ==marked== spans of a paragraph as highlighter strokes — a tinted
 * band behind the words, like a marker run over the printed line.
 */
function highlightedText(text: string) {
  return text.split(/(==[^=]+==)/g).map((part, i) =>
    part.startsWith("==") && part.endsWith("==") ? (
      <mark
        key={i}
        className="rounded-[3px] bg-[#e9c46a]/50 box-decoration-clone px-[3px] py-[1px] font-medium text-ink"
      >
        {part.slice(2, -2)}
      </mark>
    ) : (
      part
    ),
  );
}

/**
 * A tipped-in project clipping: slightly different paper stock than the page,
 * taped down at the corners, holding a small screenshot, the title line and
 * the stack. In the 3D book it is a button that gets "picked up" into the
 * detail overlay; in the static fallback it is inert with its links printed.
 */
// Color pinned as an arbitrary value, NOT `text-ink`: the static fallback
// flips `.text-ink` to the light foreground for page copy on the dark
// background, but the clipping is cream paper in both modes and its type must
// stay dark there.
const CLIPPING_CLASS =
  "relative block rounded-[3px] border border-ink/15 bg-[#fbf7ec] p-[14px] text-[#2a2118] shadow-[0_3px_10px_rgba(42,33,24,0.2)]";

function ClippingBody({ card }: { card: ProjectCard }) {
  const accent = card.accent ?? "#8a5a12";
  return (
    <>
      {/* Tape strips over the top corners. */}
      <span
        aria-hidden="true"
        className="absolute -top-[9px] left-[18px] h-[16px] w-[54px] rotate-[-4deg] rounded-[1px] bg-[#d8c99b]/45 shadow-[0_1px_2px_rgba(42,33,24,0.15)]"
      />
      <span
        aria-hidden="true"
        className="absolute -top-[9px] right-[18px] h-[16px] w-[54px] rotate-[3deg] rounded-[1px] bg-[#d8c99b]/45 shadow-[0_1px_2px_rgba(42,33,24,0.15)]"
      />

      {card.image ? (
        // eslint-disable-next-line @next/next/no-img-element -- static host, no image optimizer
        <img src={card.image} alt="" className="h-[96px] w-full rounded-[2px] object-cover" />
      ) : (
        <span
          className="flex h-[96px] w-full items-center justify-center rounded-[2px] border border-ink/10"
          style={{ background: `linear-gradient(135deg, ${accent}22, ${accent}08)` }}
        >
          <span className="font-mono text-[10px] tracking-[0.24em] text-ink/35 uppercase">
            TODO: screenshot
          </span>
        </span>
      )}

      <span className="mt-[10px] flex items-baseline justify-between gap-[8px]">
        <span className="text-[19px] leading-[1.25] font-semibold">{card.title}</span>
        {card.period ? (
          <span className="shrink-0 font-mono text-[10.5px] tracking-[0.18em] text-ink/45 uppercase">
            {card.period}
          </span>
        ) : null}
      </span>
      <span className="mt-[3px] block text-[14.5px] leading-[1.45] text-ink/70">
        {card.tagline}
      </span>

      <span className="mt-[9px] flex flex-wrap gap-[5px]">
        {card.stack.map((tech) => (
          <span
            key={tech}
            className="rounded-full border border-ink/15 bg-ink/[0.04] px-[7px] py-[1px] font-mono text-[10px] whitespace-nowrap text-ink/70"
          >
            {tech}
          </span>
        ))}
      </span>
    </>
  );
}

function CategoryIcon({ name }: { name: SkillGroup["icon"] }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={16}
      height={16}
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d={ICON_PATHS[name]} />
    </svg>
  );
}

/**
 * A page's printed content. Sized in px because the parent Html panel is
 * authored at a fixed pixel size and scaled into world units — so px here maps
 * to a predictable physical size on the page surface. Type runs large: the
 * page is the whole composition, so it should read like a printed spread, not
 * like website body copy pasted onto one.
 *
 * This is real DOM sitting on the 3D page, which is what keeps the copy
 * selectable, tabbable and indexable.
 */
export default function PageContent({
  page,
  chapter,
  onProject,
}: {
  page: SpreadPage;
  /** Printed small at the head of the left page, like a running title. */
  chapter?: string;
  /**
   * Pick up a project clipping: called with the card and its screen rect so
   * the detail overlay can lift it from exactly where it sits on the page.
   * Absent (static fallback), the clippings render inert with their links
   * printed directly on them instead.
   */
  onProject?: (card: ProjectCard, rect: DOMRect) => void;
}) {
  return (
    <div className="flex h-full flex-col text-ink">
      {/* Always rendered (invisible when empty) so left/right headings sit level. */}
      <p
        className={`mb-[16px] font-mono text-[15px] font-semibold tracking-[0.34em] uppercase ${
          chapter ? "text-ink/80" : "invisible"
        }`}
      >
        {chapter ?? " "}
      </p>

      {page.heading ? (
        // Skills page gets a mono, app-chrome heading; prose pages keep the
        // bookish display face.
        <h2
          className={
            page.skills?.length
              ? "mb-[14px] font-mono text-[34px] leading-[1.1] font-bold tracking-[0.08em] uppercase"
              : "mb-[14px] font-display text-[44px] leading-[1.08] font-semibold"
          }
        >
          {page.heading}
        </h2>
      ) : null}

      {page.paragraphs?.map((text, i) => (
        <p key={i} className="mb-[24px] text-[24px] leading-[1.5] text-ink/90">
          {highlightedText(text)}
        </p>
      ))}

      {page.projects?.length ? (
        <ul className="mb-[18px] space-y-[22px]">
          {page.projects.map((proj, i) => (
            // Alternating tilt: tipped-in clippings, not a uniform grid.
            <li key={proj.id} style={{ transform: `rotate(${i % 2 ? 0.7 : -0.9}deg)` }}>
              {onProject ? (
                <button
                  type="button"
                  // The pickup overlay hides this while its copy is held, so
                  // the card reads as pulled out of the book.
                  data-clipping={proj.id}
                  onClick={(e) => onProject(proj, e.currentTarget.getBoundingClientRect())}
                  className={`${CLIPPING_CLASS} group w-full cursor-pointer text-left transition-transform duration-300 hover:scale-[1.02]`}
                >
                  <ClippingBody card={proj} />
                  <span className="pointer-events-none absolute right-[10px] bottom-[8px] font-mono text-[9.5px] tracking-[0.2em] text-ink/0 uppercase transition-colors duration-300 group-hover:text-ink/45">
                    pick up ↗
                  </span>
                </button>
              ) : (
                <div className={CLIPPING_CLASS}>
                  <ClippingBody card={proj} />
                  {proj.links?.length ? (
                    <span className="mt-[10px] flex gap-[14px]">
                      {proj.links.map((link) => (
                        <a
                          key={link.href}
                          href={link.href}
                          target="_blank"
                          rel="noreferrer"
                          className="font-mono text-[11px] tracking-[0.16em] text-ink/70 uppercase underline decoration-ink/30 underline-offset-[3px] hover:decoration-ink"
                        >
                          {link.label}
                        </a>
                      ))}
                    </span>
                  ) : null}
                </div>
              )}
            </li>
          ))}
        </ul>
      ) : null}

      {page.items?.length ? (
        <ul className="space-y-[20px]">
          {page.items.map((item, i) => (
            <li key={i} className="text-[22px] leading-[1.45]">
              {item.href ? (
                <Link
                  href={item.href}
                  target={item.href.startsWith("http") ? "_blank" : undefined}
                  rel={item.href.startsWith("http") ? "noreferrer" : undefined}
                  className="font-medium underline decoration-ink/30 underline-offset-[4px] transition-colors hover:decoration-ink"
                >
                  {item.label}
                </Link>
              ) : (
                <span className="font-semibold">{item.label}</span>
              )}
              {item.detail ? (
                <span className="block text-[18px] leading-[1.5] text-ink/65">{item.detail}</span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      {page.timeline?.length ? (
        <ol className="ml-[7px] space-y-[26px] border-l-[2px] border-ink/25 pl-[28px]">
          {page.timeline.map((entry, i) => (
            <li key={i} className="relative">
              {/* Node on the rule, filled with the paper color so the rule
                  reads as passing behind it. */}
              <span
                aria-hidden="true"
                className="absolute top-[7px] -left-[36px] block h-[13px] w-[13px] rounded-full border-[2.5px] border-ink/60 bg-[#f4efe3]"
              />
              <p className="font-mono text-[13.5px] font-semibold tracking-[0.22em] text-ink/55 uppercase">
                {entry.period}
              </p>
              <p className="mt-[3px] text-[22px] leading-[1.3] font-semibold">{entry.role}</p>
              <p className="text-[18px] leading-[1.45] text-ink/75 italic">{entry.org}</p>
              {entry.detail ? (
                <p className="mt-[5px] text-[17px] leading-[1.5] text-ink/65">{entry.detail}</p>
              ) : null}
            </li>
          ))}
        </ol>
      ) : null}

      {page.skills?.length ? (
        <div className="space-y-[13px]">
          {page.skills.map((group) => (
            <div key={group.category}>
              <div className="mb-[6px] flex items-center gap-[8px]" style={{ color: group.color }}>
                <CategoryIcon name={group.icon} />
                <span className="font-mono text-[13.5px] font-semibold tracking-[0.18em] uppercase">
                  {group.category}
                </span>
              </div>
              <ul className="flex flex-wrap gap-[7px]">
                {group.items.map((skill) => {
                  const icon = SKILL_ICONS[skill];
                  return (
                    <li
                      key={skill}
                      className="flex items-center gap-[5px] rounded-full border border-ink/20 bg-ink/[0.045] px-[8px] py-[2px] text-[11.5px] leading-[1.4] font-medium whitespace-nowrap text-ink/85"
                    >
                      {icon ? (
                        <svg viewBox="0 0 24 24" width={12} height={12} aria-hidden>
                          <path d={icon.path} fill={icon.hex} />
                        </svg>
                      ) : null}
                      {skill}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
