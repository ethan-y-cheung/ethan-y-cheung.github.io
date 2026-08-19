"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { beats, timing } from "@/lib/book3d.config";

const LAST = beats.length - 1;

const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

type Tween = { from: number; to: number; start: number; duration: number } | null;

/**
 * Drives the book as a state machine rather than a scrub.
 *
 * One gesture buys exactly one complete transition: while a tween is running,
 * wheel/touch/key input is swallowed, so the book cannot be parked halfway
 * through opening or mid page-turn. At the first and last beat the gesture is
 * released back to the document so the rest of the page scrolls normally and the
 * user is never trapped in the hero.
 */
export function useBookSequence(enabled: boolean) {
  const [index, setIndex] = useState(0);
  const [animating, setAnimating] = useState(false);

  /** Continuous position through the beats, e.g. 1.5 = halfway cover->about. */
  const progressRef = useRef(0);
  const targetRef = useRef(0);
  const tweenRef = useRef<Tween>(null);
  const lockedUntilRef = useRef(0);
  const wheelAccRef = useRef(0);
  const touchStartRef = useRef<number | null>(null);
  const rafRef = useRef(0);
  const sectionRef = useRef<HTMLDivElement | null>(null);

  const isLocked = () => tweenRef.current !== null || performance.now() < lockedUntilRef.current;

  const goTo = useCallback((next: number) => {
    const clamped = Math.max(0, Math.min(LAST, next));
    if (clamped === targetRef.current) return false;
    const from = progressRef.current;
    // Opening/closing the cover and the contact finale are bigger moves than a
    // page turn, so each gets its own duration rather than one global speed.
    const crossesCover = Math.min(from, clamped) < 1 && Math.max(from, clamped) >= 1;
    const crossesFinale = Math.max(from, clamped) > LAST - 1;
    tweenRef.current = {
      from,
      to: clamped,
      start: performance.now(),
      duration: (crossesFinale ? timing.finale : crossesCover ? timing.open : timing.turn) * 1000,
    };
    targetRef.current = clamped;
    setIndex(clamped);
    setAnimating(true);
    return true;
  }, []);

  // Tween loop. Runs only while a transition is in flight.
  useEffect(() => {
    if (!enabled) return;
    const tick = () => {
      rafRef.current = requestAnimationFrame(tick);
      const tween = tweenRef.current;
      if (!tween) return;
      const t = Math.min(1, (performance.now() - tween.start) / tween.duration);
      progressRef.current = tween.from + (tween.to - tween.from) * easeInOutCubic(t);
      if (t >= 1) {
        progressRef.current = tween.to;
        tweenRef.current = null;
        lockedUntilRef.current = performance.now() + timing.cooldown * 1000;
        wheelAccRef.current = 0;
        setAnimating(false);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;

    /** True while the hero owns the viewport. */
    const engaged = () => {
      const el = sectionRef.current;
      if (!el) return false;
      const rect = el.getBoundingClientRect();
      return rect.top <= 2 && rect.bottom >= window.innerHeight - 2;
    };

    /**
     * Whether a gesture in this direction should be consumed by the book. At the
     * ends we hand it back to the document instead of trapping the user.
     */
    const shouldConsume = (dir: 1 | -1) => {
      if (!engaged()) return false;
      if (dir > 0) return targetRef.current < LAST;
      return targetRef.current > 0;
    };

    const onWheel = (e: WheelEvent) => {
      const dir = e.deltaY > 0 ? 1 : -1;
      if (!shouldConsume(dir)) return;
      // Consume the gesture even while locked, otherwise the page lurches
      // mid-animation and the transition reads as broken.
      e.preventDefault();
      if (isLocked()) return;
      wheelAccRef.current += e.deltaY;
      if (Math.abs(wheelAccRef.current) < timing.wheelThreshold) return;
      const step = wheelAccRef.current > 0 ? 1 : -1;
      wheelAccRef.current = 0;
      goTo(targetRef.current + step);
    };

    const onTouchStart = (e: TouchEvent) => {
      touchStartRef.current = e.touches[0]?.clientY ?? null;
    };

    const onTouchMove = (e: TouchEvent) => {
      const start = touchStartRef.current;
      const y = e.touches[0]?.clientY;
      if (start == null || y == null) return;
      const delta = start - y;
      const dir = delta > 0 ? 1 : -1;
      if (!shouldConsume(dir)) return;
      e.preventDefault();
      if (isLocked() || Math.abs(delta) < timing.swipeThreshold) return;
      touchStartRef.current = y;
      goTo(targetRef.current + dir);
    };

    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      const forward = ["ArrowDown", "PageDown", " ", "ArrowRight"].includes(e.key);
      const back = ["ArrowUp", "PageUp", "ArrowLeft"].includes(e.key);
      if (!forward && !back) return;
      const dir = forward ? 1 : -1;
      if (!shouldConsume(dir)) return;
      e.preventDefault();
      if (isLocked()) return;
      goTo(targetRef.current + dir);
    };

    // passive:false is required to be allowed to preventDefault.
    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("keydown", onKey);
    };
  }, [enabled, goTo]);

  return { index, animating, progressRef, sectionRef, goTo };
}
