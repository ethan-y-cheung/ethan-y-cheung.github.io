"use client";

import { useId, useLayoutEffect, useRef } from "react";

import { coverGlyphs, letteringText } from "./cover-lettering";
import styles from "./CoverTitle.module.css";

const SESSION_KEY = "portfolio:cover-written";
const SPARK_COUNT = 128;
const SPARK_INTERVAL_MS = 24;
const SPARKS_PER_EMISSION = 2;
/** Width of the drawing, and of the gold band that rakes across it at the end. */
const VIEW_WIDTH = 345.25;
/**
 * The finishing glint. Once the last stroke lands, a raking band of light
 * crosses the whole inscription and throws a few flecks off each letter as its
 * crest passes — the wave that turns finished lettering into stamped foil.
 * Wide and unhurried on purpose: a narrow, fast band reads as a scanner.
 */
/**
 * The pen strokes only approximate the outlines they reveal, so a few serifs
 * and thin terminals are never covered by any of them. Dropping the mask the
 * instant the writing lands pops those in; fading a white plate into each mask
 * first fills the gaps, and by the time the mask goes the switch is a no-op.
 */
const SETTLE_MS = 220;
/**
 * The pen strokes are drawn a little fatter than the nib that authored them.
 * A stroke reveals the glyph THROUGH a mask, so anything the widening spills
 * past the outline is discarded — the only visible effect is that terminals
 * and serifs sitting just outside a stroke get covered instead of clipped.
 */
const PEN_COVERAGE = 1.3;
const SHEEN_DELAY_MS = 110;
const SHEEN_DURATION_MS = 980;
const SHEEN_BAND = 150;
/** Lean of the band, as the x-shift per unit of height (skewX(-12deg)). */
const SHEEN_LEAN = Math.tan((12 * Math.PI) / 180);
const SHEEN_SPARKS_PER_LETTER = 3;
/** Roughly the middle of a glyph: the em is 100 units with the baseline at 80. */
const GLYPH_MID = 45;
// Also remember the intro when browser storage is unavailable.
let writtenThisVisit = false;

const letters = letteringText.split(" ").flatMap((word, row) => {
  const characters = [...word] as (keyof typeof coverGlyphs)[];
  const width = characters.reduce((sum, char) => sum + coverGlyphs[char].width + 1.5, 0);
  let x = (VIEW_WIDTH - width) / 2;
  return characters.map((char) => {
    const glyph = coverGlyphs[char];
    const letter = {
      char,
      x,
      y: 23.15 + row * 114,
      ...glyph,
      // SVG dashes restart at every move command. Separate pen lifts so each
      // glint tracks the stroke being revealed, including individual serifs.
      strokes: glyph.strokes.flatMap((stroke) =>
        (stroke.d.match(/M[^M]*/g) ?? [stroke.d]).map((d) => ({
          ...stroke,
          d,
          width: stroke.width * PEN_COVERAGE,
        })),
      ),
    };
    x += letter.width + 1.5;
    return letter;
  });
});

/** A 1.2-second gold inscription with glitter, played once per browser session. */
export default function CoverTitle({ active }: { active: boolean }) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const id = useId();

  useLayoutEffect(() => {
    const title = titleRef.current;
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!title || !active || calm.matches || writtenThisVisit) return;
    try {
      if (sessionStorage.getItem(SESSION_KEY)) return;
    } catch {
      // The in-memory flag still prevents repeats during this visit.
    }

    let frame = 0;
    let finished = false;
    let writingComplete = false;
    let sparkIndex = 0;
    /** 0 until the writing lands; then the timestamp the sheen is due to start. */
    /** 0 until the writing lands; then when the gap-filling fade is done. */
    let settleUntil = 0;
    let sheenDue = 0;
    let sheenBegan = 0;
    let sheenDone = false;
    /** Letters whose crest burst has already fired, so each sparks once. */
    const sheened = new Set<number>();
    const animations: Animation[] = [];
    const sparks = Array.from(title.querySelectorAll<SVGGElement>("[data-spark]")).map((node) => ({
      node,
      born: -Infinity,
      lifetime: 0,
      x: 0,
      y: 0,
      dx: 0,
      dy: 0,
      scale: 1,
      rotation: 0,
    }));
    const band = title.querySelector<SVGGElement>("[data-sheen-band]");
    title.dataset.tracing = "true";

    /** Throws `count` flecks off one point, in a golden-angle fan. */
    const emit = (now: number, x: number, y: number, count: number) => {
      for (let fleck = 0; fleck < count; fleck++) {
        const seed = sparkIndex++;
        const spark = sparks[seed % sparks.length];
        const angle = seed * 2.399963;
        spark.born = now;
        spark.lifetime = 260 + (seed % 5) * 40;
        spark.x = x + Math.cos(angle) * 1.2;
        spark.y = y + Math.sin(angle) * 1.2;
        spark.dx = Math.cos(angle) * 9;
        spark.dy = Math.sin(angle) * 6 - 3;
        spark.scale = 0.85 + (seed % 4) * 0.2;
        spark.rotation = (seed * 47) % 180;
      }
    };

    const finish = () => {
      if (finished) return;
      finished = true;
      cancelAnimationFrame(frame);
      delete title.dataset.tracing;
      delete title.dataset.glitter;
      delete title.dataset.sheen;
      sparks.forEach(({ node }) => node.setAttribute("opacity", "0"));
      animations.forEach((animation) => animation.cancel());
    };

    const start = () => {
      // drei mounts its HTML before the first frame exposes the cover. Start
      // the clock on the visible book, not while WebGL is still preparing it.
      if (!title.isConnected || getComputedStyle(title).visibility === "hidden") {
        frame = requestAnimationFrame(start);
        return;
      }
      writtenThisVisit = true;
      try {
        sessionStorage.setItem(SESSION_KEY, "1");
      } catch {
        // Storage can be blocked in private or embedded browsing contexts.
      }
      title.dataset.glitter = "true";

      const plates = Array.from(title.querySelectorAll<SVGPathElement>("[data-settle]"));
      const pens = Array.from(title.querySelectorAll<SVGPathElement>("[data-pen]")).map((path) => {
        const animation = path.animate(
          [
            { strokeDashoffset: "1", visibility: "hidden" },
            { strokeDashoffset: "0", visibility: "visible" },
          ],
          {
            delay: Number(path.dataset.delay),
            duration: Number(path.dataset.duration),
            easing: "cubic-bezier(0.4, 0, 0.2, 1)",
            fill: "both",
          },
        );
        animations.push(animation);
        return {
          path,
          animation,
          length: path.getTotalLength(),
          letter: letters[Number(path.dataset.letter)],
          lastSpark: -Infinity,
        };
      });

      const tick = (now: number) => {
        if (finished) return;
        if (!writingComplete) {
          for (const pen of pens) {
            // Read the animation's eased progress, so glitter follows the
            // actual mask instead of drifting ahead on a separate timer.
            const progress = pen.animation.effect?.getComputedTiming().progress;
            if (
              progress == null || progress <= 0 || progress >= 1
              || now - pen.lastSpark < SPARK_INTERVAL_MS
            ) continue;
            const point = pen.path.getPointAtLength(progress * pen.length);
            emit(now, pen.letter.x + point.x, pen.letter.y + point.y, SPARKS_PER_EMISSION);
            pen.lastSpark = now;
          }
        }

        // Only drop the masks once the plates are fully faded, so the switch
        // to the plain glyph is a change the eye has nothing to catch.
        if (settleUntil > 0 && now >= settleUntil) {
          settleUntil = 0;
          delete title.dataset.tracing;
          sheenDue = now + SHEEN_DELAY_MS;
        }

        if (sheenDue > 0 && now >= sheenDue && !sheenDone) {
          if (sheenBegan === 0) {
            sheenBegan = now;
            title.dataset.sheen = "true";
          }
          // Linear on purpose: an eased glint reads as a hesitating one, and a
          // constant sweep keeps the crest maths below honest.
          const swept = Math.min(1, (now - sheenBegan) / SHEEN_DURATION_MS);
          const travel = swept * (VIEW_WIDTH + SHEEN_BAND * 2) - SHEEN_BAND;
          band?.setAttribute("transform", `translate(${travel.toFixed(2)} 0)`);

          for (const [index, letter] of letters.entries()) {
            if (sheened.has(index)) continue;
            // Where the band's bright core sits at this letter's own height —
            // the band leans, so every row crosses at a different moment.
            const crest = travel - SHEEN_BAND / 2 - SHEEN_LEAN * (letter.y + GLYPH_MID);
            if (crest < letter.x + letter.width / 2) continue;
            sheened.add(index);
            const strokes = pens.filter((pen) => pen.letter === letter);
            const pen = strokes[index % strokes.length];
            if (!pen) continue;
            const point = pen.path.getPointAtLength(Math.random() * pen.length);
            emit(now, letter.x + point.x, letter.y + point.y, SHEEN_SPARKS_PER_LETTER);
          }
          if (swept >= 1) sheenDone = true;
        }

        let liveSparks = false;
        for (const spark of sparks) {
          if (spark.born === -Infinity) continue;
          const age = (now - spark.born) / spark.lifetime;
          if (age >= 1) {
            spark.node.setAttribute("opacity", "0");
            spark.born = -Infinity;
            continue;
          }
          liveSparks = true;
          const scale = spark.scale * (1 + 0.25 * Math.sin(age * Math.PI));
          spark.node.setAttribute(
            "transform",
            `translate(${(spark.x + spark.dx * age).toFixed(2)} ${(spark.y + spark.dy * age).toFixed(2)}) rotate(${spark.rotation}) scale(${scale.toFixed(3)})`,
          );
          spark.node.setAttribute("opacity", ((1 - age) ** 2).toFixed(3));
        }
        // Let the glint cross and the last flecks fade, then stop all
        // per-frame work.
        if (writingComplete && sheenDone && !liveSparks) finish();
        else frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
      void Promise.all(animations.map((animation) => animation.finished))
        .then(() => {
          if (!finished) {
            writingComplete = true;
            plates.forEach((plate) => {
              animations.push(
                plate.animate([{ opacity: 0 }, { opacity: 1 }], {
                  duration: SETTLE_MS,
                  easing: "ease-out",
                  fill: "both",
                }),
              );
            });
            settleUntil = performance.now() + SETTLE_MS;
          }
        })
        .catch(() => {
          // Opening the cover or cancelling an animation also stops its trail.
          finish();
        });
    };

    const onVisibilityChange = () => {
      if (document.hidden) finish();
    };
    frame = requestAnimationFrame(start);
    calm.addEventListener("change", finish);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      finish();
      calm.removeEventListener("change", finish);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [active]);

  return (
    <h1 ref={titleRef} className={styles.title}>
      <span className="sr-only">{letteringText}</span>
      <svg viewBox="0 0 345.25 258" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient
            id={`${id}-foil`}
            gradientUnits="userSpaceOnUse"
            x1="138.1"
            y1="-28.38"
            x2="207.15"
            y2="286.38"
          >
            <stop offset="0%" stopColor="#f3e6bd" />
            <stop offset="38%" stopColor="#d9bc7d" />
            <stop offset="66%" stopColor="#a08347" />
            <stop offset="100%" stopColor="#e3cd96" />
          </linearGradient>
          {letters.map((letter, index) => (
            <linearGradient
              key={index}
              id={`${id}-foil-${index}`}
              href={`#${id}-foil`}
              gradientTransform={`translate(${-letter.x} ${-letter.y})`}
            />
          ))}
          {/* The finishing glint. A black-to-white-to-black band, leaned over
              and parked off the left edge; the rAF loop above slides its
              wrapper across, and the mask turns it into light on the foil. */}
          <linearGradient id={`${id}-sheen`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#000" />
            <stop offset="34%" stopColor="#000" />
            <stop offset="50%" stopColor="#fff" />
            <stop offset="66%" stopColor="#000" />
            <stop offset="100%" stopColor="#000" />
          </linearGradient>
          <mask
            id={`${id}-sheen-mask`}
            maskUnits="userSpaceOnUse"
            x="-260"
            y="-140"
            width="900"
            height="560"
          >
            <g data-sheen-band="">
              {/* Tall and overhanging: the lean shifts the band by ~0.21 of
                  its height, so it has to start well outside the drawing. */}
              <rect
                x={-SHEEN_BAND}
                y="-140"
                width={SHEEN_BAND}
                height="560"
                fill={`url(#${id}-sheen)`}
                transform="skewX(-12)"
              />
            </g>
          </mask>
          {letters.map((letter, index) => (
            <mask
              key={index}
              id={`${id}-letter-${index}`}
              maskUnits="userSpaceOnUse"
              x="-15"
              y="-10"
              width="110"
              height="135"
            >
              {letter.strokes.map((stroke, pen) => (
                <path
                  key={pen}
                  data-pen=""
                  data-letter={index}
                  // 40ms lead-in + 10 × 82ms stagger + 340ms = 1.2 seconds.
                  data-delay={40 + index * 82 + pen * (340 / letter.strokes.length)}
                  data-duration={340 / letter.strokes.length}
                  d={stroke.d}
                  fill="none"
                  stroke="white"
                  strokeWidth={stroke.width}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  pathLength="1"
                  strokeDasharray="1 1"
                  className={styles.pen}
                />
              ))}
            </mask>
          ))}
        </defs>
        {/* Offsetting the shared gradient keeps its gold continuous across lines.
            Direct masks also let browsers repaint each animated pen reliably. */}
        {letters.map((letter, index) => (
          <g key={index} transform={`translate(${letter.x} ${letter.y})`}>
            <path
              d={letter.d}
              fill={`url(#${id}-foil-${index})`}
              mask={`url(#${id}-letter-${index})`}
              className={styles.glyph}
            />
            {/* The gap filler: the same glyph, unmasked, faded in once the
                writing lands so whatever the pens still missed arrives with
                the rest instead of popping. It sits OUTSIDE the mask on
                purpose — opacity animated on mask content is not reliably
                repainted, which is why filling the mask itself did nothing. */}
            <path
              data-settle=""
              d={letter.d}
              fill={`url(#${id}-foil-${index})`}
              className={styles.settle}
            />
          </g>
        ))}
        {/* The same glyphs again in near-white, showing only where the band
            crosses them — the letters catch the light rather than the page. */}
        <g className={styles.sheen} mask={`url(#${id}-sheen-mask)`}>
          {letters.map((letter, index) => (
            <g key={index} transform={`translate(${letter.x} ${letter.y})`}>
              <path d={letter.d} fill="#fff6df" />
            </g>
          ))}
        </g>
        <g className={styles.glitter}>
          {Array.from({ length: SPARK_COUNT }, (_, index) => (
            <g key={index} data-spark="" opacity="0">
              {index % 3 === 0 ? (
                <path
                  d="M0-2 .35-.35 2 0 .35 .35 0 2-.35 .35-2 0-.35-.35Z"
                  fill="#fff6d9"
                />
              ) : (
                <circle r={0.45 + (index % 3) * 0.15} fill="#f5d791" />
              )}
            </g>
          ))}
        </g>
      </svg>
    </h1>
  );
}
