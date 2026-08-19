import { socials } from "@/lib/socials";

/**
 * Row of social icon links, styled like gold foil stamped into a book cover:
 * warm metallic fill, a hairline ring, and a soft lift + glow on hover.
 *
 * Sized in `em` throughout so the parent's font-size scales the whole row —
 * the cover overlay drives it with container-relative units, the static
 * fallback with plain text sizes.
 */
export default function SocialIcons({ className = "" }: { className?: string }) {
  return (
    <ul className={`flex items-center justify-center gap-[0.9em] ${className}`}>
      {socials.map((social) => (
        <li key={social.id}>
          <a
            href={social.href}
            aria-label={social.label}
            title={social.label}
            target={social.href.startsWith("http") ? "_blank" : undefined}
            rel={social.href.startsWith("http") ? "noreferrer" : undefined}
            className="group flex h-[2.4em] w-[2.4em] items-center justify-center rounded-full border border-foil/40 text-foil transition-all duration-300 ease-out hover:-translate-y-[0.15em] hover:border-foil hover:text-amber hover:shadow-[0_0_1.2em_rgba(212,162,78,0.45)] focus-visible:-translate-y-[0.15em]"
          >
            <svg
              viewBox="0 0 16 16"
              fill="currentColor"
              aria-hidden="true"
              className="h-[1.15em] w-[1.15em] transition-transform duration-300 ease-out group-hover:scale-110"
            >
              <path d={social.path} />
            </svg>
          </a>
        </li>
      ))}
    </ul>
  );
}
