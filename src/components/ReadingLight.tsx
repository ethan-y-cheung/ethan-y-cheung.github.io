"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

/** Diameter of the glow at rest, in px. */
const SIZE = 280;

/**
 * The lamp is drawn twice: full strength behind the book (room light), and at
 * this fraction above the canvas so it visibly falls on the cover and pages.
 * Kept low because a strong screen blend over the gold foil washes it out.
 */
const FRONT_STRENGTH = 0.32;

/** How long the cursor must sit still before the lamp breathes out. */
const IDLE_MS = 3500;

/**
 * Critically-damped smoothing times, in seconds. Larger = lazier. The follow
 * time is deliberately long so the light trails the cursor like a lamp being
 * dragged, never snapping or overshooting.
 */
const FOLLOW_SMOOTH = 0.4;
const PARAM_SMOOTH = 0.22;

/**
 * Unity-style SmoothDamp: a critically damped spring toward `target`.
 * Velocity persists in `vel.v` across frames, so motion eases in and out
 * instead of jumping to full speed the way plain lerp smoothing does.
 */
function smoothDamp(
  current: number,
  target: number,
  vel: { v: number },
  smoothTime: number,
  dt: number,
) {
  const omega = 2 / Math.max(smoothTime, 1e-4);
  const x = omega * dt;
  const decay = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
  const change = current - target;
  const temp = (vel.v + omega * change) * dt;
  vel.v = (vel.v - omega * temp) * decay;
  return target + (change + temp) * decay;
}

const INTERACTIVE = "a, button, [role='button'], input, select, textarea, summary, label";

/**
 * A warm reading-lamp glow that trails the cursor. Screen-blended, so it
 * lights the dark home spread and stays out of the way on light surfaces.
 * Pointer-events pass straight through. Skipped entirely on touch devices
 * and for prefers-reduced-motion.
 */
export default function ReadingLight() {
  const glowRef = useRef<HTMLDivElement | null>(null);
  const frontGlowRef = useRef<HTMLDivElement | null>(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const fine = window.matchMedia("(pointer: fine)");
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setEnabled(fine.matches && !calm.matches);
    sync();
    fine.addEventListener("change", sync);
    calm.addEventListener("change", sync);
    return () => {
      fine.removeEventListener("change", sync);
      calm.removeEventListener("change", sync);
    };
  }, []);

  useEffect(() => {
    if (!enabled) return;

    // All animation state lives in refs local to this effect; the rAF loop
    // writes styles directly and React never re-renders per frame.
    const pos = { x: 0, y: 0 };
    const target = { x: 0, y: 0 };
    const velX = { v: 0 };
    const velY = { v: 0 };
    const intensity = { value: 0, vel: { v: 0 } };
    const scale = { value: 1, vel: { v: 0 } };

    let seen = false; // becomes true on the first pointer move
    let inWindow = true;
    let hovering = false;
    let pressed = false;
    let lastMove = performance.now();
    let lastFrame = performance.now();
    let raf = 0;

    const onMove = (e: PointerEvent) => {
      target.x = e.clientX;
      target.y = e.clientY;
      lastMove = performance.now();
      inWindow = true;
      if (!seen) {
        // Snap to the first known position so the lamp fades in in place
        // instead of flying across the screen from a corner.
        seen = true;
        pos.x = target.x;
        pos.y = target.y;
      }
    };

    const onOver = (e: PointerEvent) => {
      const el = e.target instanceof Element ? e.target : null;
      hovering = !!el?.closest(INTERACTIVE);
    };

    const onDown = () => {
      pressed = true;
      lastMove = performance.now();
    };
    const onUp = () => {
      pressed = false;
    };
    const onLeave = () => {
      inWindow = false;
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      // Clamp dt so a backgrounded tab doesn't integrate one giant step.
      const dt = Math.min((now - lastFrame) / 1000, 0.064);
      lastFrame = now;

      const idle = now - lastMove > IDLE_MS;
      const lit = seen && inWindow && !idle;

      // Lean-in on press: tighter and brighter, like pulling the lamp closer.
      // Hover over a link warms it up a touch as passive feedback.
      const targetIntensity = !lit ? 0 : pressed ? 1.35 : hovering ? 1.18 : 1;
      const targetScale = pressed ? 0.85 : hovering ? 1.06 : 1;

      pos.x = smoothDamp(pos.x, target.x, velX, FOLLOW_SMOOTH, dt);
      pos.y = smoothDamp(pos.y, target.y, velY, FOLLOW_SMOOTH, dt);
      intensity.value = smoothDamp(intensity.value, targetIntensity, intensity.vel, PARAM_SMOOTH * 4, dt);
      scale.value = smoothDamp(scale.value, targetScale, scale.vel, PARAM_SMOOTH, dt);

      // Candle flicker: three incommensurate slow sines so it never reads as
      // a repeating pattern. Amplitude is small enough to feel like air
      // moving, not a strobe.
      const t = now / 1000;
      const flicker =
        1 +
        0.028 * Math.sin(t * 1.3) +
        0.018 * Math.sin(t * 2.9 + 1.7) +
        0.012 * Math.sin(t * 6.1 + 4.2);

      const tf = `translate3d(${pos.x - SIZE / 2}px, ${pos.y - SIZE / 2}px, 0) scale(${scale.value * (1 + (flicker - 1) * 0.5)})`;
      const o = Math.max(0, intensity.value * flicker);
      const back = glowRef.current;
      if (back) {
        back.style.transform = tf;
        back.style.opacity = String(o);
      }
      const front = frontGlowRef.current;
      if (front) {
        front.style.transform = tf;
        front.style.opacity = String(o * FRONT_STRENGTH);
      }
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerover", onOver, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });
    window.addEventListener("pointercancel", onUp, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    window.addEventListener("blur", onLeave);
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerover", onOver);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("blur", onLeave);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <>
      {/* Room layer: the lamp at full strength, behind the book (-z-10). The
          3D scene lights the book itself, and full-strength screen blend over
          the cover washed the gold foil unreadable. */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div ref={glowRef} className="absolute top-0 left-0 rounded-full" style={GLOW_STYLE} />
      </div>
      {/* Book layer: the same glow again above the canvas, dimmed hard, so the
          lamp visibly falls on the cover and pages instead of vanishing behind
          them — while staying too faint to wash the foil. */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-10 overflow-hidden">
        <div ref={frontGlowRef} className="absolute top-0 left-0 rounded-full" style={GLOW_STYLE} />
      </div>
    </>
  );
}

const GLOW_STYLE: CSSProperties = {
  width: SIZE,
  height: SIZE,
  opacity: 0,
  mixBlendMode: "screen",
  willChange: "transform, opacity",
  // A bright warm core inside a wide amber halo — lamplight, not a spotlight edge.
  background: [
    "radial-gradient(circle closest-side, rgba(255, 226, 180, 0.5) 0%, rgba(255, 226, 180, 0) 32%)",
    "radial-gradient(circle closest-side, rgba(255, 186, 105, 0.3) 0%, rgba(255, 168, 82, 0.14) 42%, rgba(255, 150, 60, 0.045) 70%, rgba(255, 150, 60, 0) 100%)",
  ].join(", "),
};
