"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Ambient dust drifting through a fixed shaft of lamplight — the "library
 * air" behind the whole page. Screen-blended, so motes glow against the dark
 * scene and all but vanish over the book's cream pages, keeping text legible
 * without any masking.
 *
 * Looks simple; underneath, each mote carries its own depth, wander phase and
 * twinkle, brightens as it crosses the light shaft, lags scroll by depth
 * (parallax), and eases away from the pointer.
 */

/** One mote per this many px² of viewport, capped for huge screens. */
const AREA_PER_MOTE = 11000;
const MAX_MOTES = 220;

/**
 * Light shaft: enters top-left and leans down-right, matching the key light
 * baked into the book artwork so the scene reads as one light source.
 * Negative lean = the beam's foot swings right of where it enters.
 */
const SHAFT_LEAN = -0.42; // radians from vertical
const SHAFT_TOP_X = 0.1; // where the beam crosses y=0, as a fraction of width
const SHAFT_HALF_WIDTH = 0.09; // as a fraction of viewport width

/** How far pointer influence reaches, and how hard it pushes. */
const REPEL_RADIUS = 120;
const REPEL_FORCE = 14;

type Mote = {
  x: number;
  y: number;
  /** 0 = far (small, slow, dim) … 1 = near (big, fast, bright). */
  depth: number;
  radius: number;
  baseAlpha: number;
  /** Phase offsets so wander/twinkle never sync up across motes. */
  wanderPhase: number;
  twinklePhase: number;
  twinkleSpeed: number;
  /** Residual pointer-push velocity, decayed each frame. */
  pushX: number;
  pushY: number;
};

const rand = (lo: number, hi: number) => lo + Math.random() * (hi - lo);

function makeMote(w: number, h: number): Mote {
  const depth = Math.random();
  return {
    x: Math.random() * w,
    y: Math.random() * h,
    depth,
    radius: rand(0.5, 1.1) + depth * rand(0.6, 1.6),
    baseAlpha: 0.1 + depth * rand(0.15, 0.4),
    wanderPhase: rand(0, Math.PI * 2),
    twinklePhase: rand(0, Math.PI * 2),
    twinkleSpeed: rand(0.4, 1.3),
    pushX: 0,
    pushY: 0,
  };
}

/**
 * Soft round sprite, drawn once and stamped for every mote — much cheaper
 * than per-mote radial gradients or shadowBlur.
 */
function makeSprite(): HTMLCanvasElement {
  const sprite = document.createElement("canvas");
  sprite.width = sprite.height = 64;
  const ctx = sprite.getContext("2d")!;
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, "rgba(255, 233, 196, 1)");
  g.addColorStop(0.35, "rgba(255, 226, 180, 0.55)");
  g.addColorStop(1, "rgba(255, 220, 170, 0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  return sprite;
}

/** Signed distance from the shaft's center line, in px at y-depth `y`. */
function shaftOffset(x: number, y: number, w: number) {
  const centerX = w * SHAFT_TOP_X - Math.tan(SHAFT_LEAN) * y;
  return x - centerX;
}

export default function DustMotes() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [mode, setMode] = useState<"off" | "static" | "animated">("off");

  useEffect(() => {
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setMode(calm.matches ? "static" : "animated");
    sync();
    calm.addEventListener("change", sync);
    return () => calm.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (mode === "off") return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const sprite = makeSprite();
    let motes: Mote[] = [];
    let w = 0;
    let h = 0;
    let dpr = 1;
    let raf = 0;
    let lastScrollY = window.scrollY;
    const pointer = { x: -1e4, y: -1e4 };

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      const want = Math.min(MAX_MOTES, Math.round((w * h) / AREA_PER_MOTE));
      while (motes.length < want) motes.push(makeMote(w, h));
      motes = motes.slice(0, want);
    };

    const drawShaft = (t: number) => {
      // Breathes over ~30s; barely-there by design.
      const breath = 0.05 + 0.02 * Math.sin(t * 0.00021);
      const half = w * SHAFT_HALF_WIDTH;
      ctx.save();
      ctx.translate(w * SHAFT_TOP_X, 0);
      ctx.rotate(SHAFT_LEAN);
      const g = ctx.createLinearGradient(-half * 2.5, 0, half * 2.5, 0);
      g.addColorStop(0, "rgba(255, 219, 168, 0)");
      g.addColorStop(0.5, `rgba(255, 219, 168, ${breath})`);
      g.addColorStop(1, "rgba(255, 219, 168, 0)");
      ctx.fillStyle = g;
      // Tall enough to cross the whole viewport at any lean.
      ctx.fillRect(-half * 2.5, -h, half * 5, h * 3);
      ctx.restore();
    };

    const step = (t: number, dt: number, scrollDelta: number) => {
      for (const m of motes) {
        const near = 0.35 + m.depth;
        // Warm air rises: slow climb with a lazy sideways wander.
        m.y -= dt * 6 * near;
        m.x += Math.sin(t * 0.00035 + m.wanderPhase) * dt * 3 * near;
        // The page scrolls; the dust hangs in the room and lags behind.
        m.y -= scrollDelta * 0.04 * m.depth;

        // Pointer stirs the air: push accumulates, then bleeds off.
        const dx = m.x - pointer.x;
        const dy = m.y - pointer.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < REPEL_RADIUS * REPEL_RADIUS && d2 > 1) {
          const d = Math.sqrt(d2);
          const f = ((REPEL_RADIUS - d) / REPEL_RADIUS) * REPEL_FORCE * m.depth;
          m.pushX += (dx / d) * f * dt;
          m.pushY += (dy / d) * f * dt;
        }
        m.pushX *= 0.92;
        m.pushY *= 0.92;
        m.x += m.pushX;
        m.y += m.pushY;

        // Wrap with a margin so nothing pops at the edges.
        if (m.y < -20) { m.y = h + 20; m.x = Math.random() * w; }
        if (m.y > h + 20) { m.y = -20; m.x = Math.random() * w; }
        if (m.x < -20) m.x = w + 20;
        if (m.x > w + 20) m.x = -20;
      }
    };

    const draw = (t: number) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      drawShaft(t);
      for (const m of motes) {
        const twinkle = 0.65 + 0.35 * Math.sin(t * 0.001 * m.twinkleSpeed + m.twinklePhase);
        // Motes light up crossing the shaft — that is what sells the beam.
        const inShaft = Math.exp(-((shaftOffset(m.x, m.y, w) / (w * SHAFT_HALF_WIDTH)) ** 2));
        const alpha = Math.min(1, m.baseAlpha * twinkle * (1 + inShaft * 1.6));
        const size = m.radius * 6; // sprite is mostly halo; 6x reads as a ~radius dot
        ctx.globalAlpha = alpha;
        ctx.drawImage(sprite, m.x - size / 2, m.y - size / 2, size, size);
      }
      ctx.globalAlpha = 1;
    };

    resize();

    if (mode === "static") {
      // Reduced motion: one quiet frame, no loop, no listeners beyond resize.
      const redraw = () => { resize(); draw(4000); };
      draw(4000);
      window.addEventListener("resize", redraw);
      return () => window.removeEventListener("resize", redraw);
    }

    let lastT = performance.now();
    const frame = (t: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min((t - lastT) / 1000, 0.064);
      lastT = t;
      const scrollY = window.scrollY;
      step(t, dt, scrollY - lastScrollY);
      lastScrollY = scrollY;
      draw(t);
    };

    const onPointerMove = (e: PointerEvent) => {
      pointer.x = e.clientX;
      pointer.y = e.clientY;
    };
    const onPointerLeave = () => {
      pointer.x = -1e4;
      pointer.y = -1e4;
    };
    const onVisibility = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden) {
        lastT = performance.now();
        raf = requestAnimationFrame(frame);
      }
    };

    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onPointerLeave);
    document.addEventListener("visibilitychange", onVisibility);
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointerMove);
      document.documentElement.removeEventListener("pointerleave", onPointerLeave);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [mode]);

  if (mode === "off") return null;

  // Negative z: the motes are room atmosphere BEHIND the book. Drawn over it
  // they read as the book being transparent.
  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 h-full w-full mix-blend-screen"
    />
  );
}
