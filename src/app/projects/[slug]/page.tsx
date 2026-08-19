import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import Shell from "@/components/catalog/Shell";
import { projects } from "@/lib/projects";

export function generateStaticParams() {
  return projects.map((p) => ({ slug: p.id }));
}

export async function generateMetadata({
  params,
}: PageProps<"/projects/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const card = projects.find((p) => p.id === slug);
  return card ? { title: card.title, description: card.tagline } : { title: "Not found" };
}

/**
 * One case study, laid out flat on the catalog theme — deep-linkable from a
 * resume or a README. Same shell as the index so the toggle and background
 * carry across.
 */
export default async function ProjectPage({ params }: PageProps<"/projects/[slug]">) {
  const { slug } = await params;
  const index = projects.findIndex((p) => p.id === slug);
  if (index === -1) notFound();

  const card = projects[index];
  const prev = index > 0 ? projects[index - 1] : null;
  const next = index < projects.length - 1 ? projects[index + 1] : null;

  return (
    <Shell back>
      <article className="pt-9">
        <p className="font-mono text-[12px] tracking-[0.08em] text-[var(--cat-muted)] uppercase">
          {card.period}
          {card.period ? " · " : ""}
          {card.category}
        </p>
        <h1 className="mt-2 font-display text-[clamp(34px,5vw,46px)] leading-[1.08] font-semibold">
          {card.title}
        </h1>
        <p className="mt-3 text-[17px] leading-relaxed text-[var(--cat-muted)]">{card.tagline}</p>

        {card.image ? (
          // Contain, not cover: screenshots come in at whatever aspect the app
          // window was, and cropping one hides the part of the UI worth showing.
          // eslint-disable-next-line @next/next/no-img-element -- static asset, no optimizer needed
          <img
            src={card.image}
            alt={`${card.title} screenshot`}
            className="mt-8 max-h-[56vh] w-full rounded-xl border border-[var(--cat-line)] bg-[var(--cat-surface)] object-contain"
          />
        ) : null}

        <div className="mt-8 space-y-5 text-[16px] leading-[1.75] text-[var(--cat-fg)]/90">
          {card.story.map((text, i) => (
            <p key={i}>{text}</p>
          ))}
        </div>

        <ul className="mt-8 flex flex-wrap gap-2">
          {card.stack.map((tech) => (
            <li
              key={tech}
              className="rounded-md border border-[var(--cat-line)] px-2.5 py-1 font-mono text-[12px] whitespace-nowrap text-[var(--cat-muted)]"
            >
              {tech}
            </li>
          ))}
        </ul>

        {card.demo ? (
          <div className="mt-8">
            {card.demo.kind === "iframe" ? (
              <iframe
                src={card.demo.src}
                title={`${card.title} demo`}
                className="aspect-video w-full rounded-xl border border-[var(--cat-line)] bg-[var(--cat-surface)]"
              />
            ) : (
              <video src={card.demo.src} controls className="w-full rounded-xl" />
            )}
            {card.demo.caption ? (
              <p className="mt-2 font-mono text-[11px] tracking-[0.06em] text-[var(--cat-muted)]">
                {card.demo.caption}
              </p>
            ) : null}
          </div>
        ) : null}

        {card.poster ? (
          <figure className="mt-8">
            <a href={card.poster.href ?? card.poster.src} target="_blank" rel="noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element -- static asset, no optimizer needed */}
              <img
                src={card.poster.src}
                alt={`${card.title} poster`}
                className="w-full rounded-xl border border-[var(--cat-line)] bg-[var(--cat-surface)]"
              />
            </a>
            <figcaption className="mt-2 font-mono text-[11px] tracking-[0.06em] text-[var(--cat-muted)]">
              {card.poster.caption ?? "Poster · click for the full-size PDF"}
            </figcaption>
          </figure>
        ) : null}

        {card.links?.length ? (
          <div className="mt-9 flex flex-wrap gap-3">
            {card.links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg border border-[var(--cat-line)] px-4 py-2 font-mono text-[12.5px] text-[var(--cat-fg)]/80 transition-colors hover:border-[var(--cat-accent)] hover:text-[var(--cat-accent)]"
              >
                {link.label} ↗
              </a>
            ))}
          </div>
        ) : null}
      </article>

      <nav className="mt-14 flex justify-between gap-4 border-t border-[var(--cat-line)] pt-6">
        {prev ? (
          <Link
            href={`/projects/${prev.id}`}
            className="font-mono text-[12.5px] text-[var(--cat-muted)] transition-colors hover:text-[var(--cat-accent)]"
          >
            ← {prev.title}
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link
            href={`/projects/${next.id}`}
            className="text-right font-mono text-[12.5px] text-[var(--cat-muted)] transition-colors hover:text-[var(--cat-accent)]"
          >
            {next.title} →
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </Shell>
  );
}
