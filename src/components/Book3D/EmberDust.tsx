"use client";

/* eslint-disable react-hooks/purity, react-hooks/immutability --
   A particle simulation is imperative by design: positions seed from
   Math.random once (a different starfield per visit is the point, and this
   renders client-only inside the Canvas), and useFrame mutates the same
   buffers every frame instead of re-rendering React. */

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { AdditiveBlending, type Points, type PointsMaterial } from "three";

const COUNT = 150;
/** World-space box the motes drift through, behind the book. */
const BOUNDS = { x: 2.8, yMin: -1.7, yMax: 1.7, zNear: -0.7, zFar: -2.2 } as const;

/**
 * Dust motes catching the reading light — golden specks drifting slowly upward
 * behind the book. Faded in only while a project clipping is held up close
 * (the book receding into the dark), so the beats themselves stay clean.
 * Additive points on the transparent canvas composite straight onto the dark
 * page background.
 */
export default function EmberDust({ heldRef }: { heldRef: React.RefObject<number> }) {
  const pointsRef = useRef<Points>(null);
  const matRef = useRef<PointsMaterial>(null);
  /** Smoothed 0→1 presence; deliberately slow so the motes drift in, not pop. */
  const fadeCur = useRef(0);

  const sim = useMemo(() => {
    const positions = new Float32Array(COUNT * 3);
    const speed = new Float32Array(COUNT);
    const phase = new Float32Array(COUNT);
    const sway = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i++) {
      positions[i * 3] = (Math.random() * 2 - 1) * BOUNDS.x;
      positions[i * 3 + 1] = BOUNDS.yMin + Math.random() * (BOUNDS.yMax - BOUNDS.yMin);
      positions[i * 3 + 2] = BOUNDS.zFar + Math.random() * (BOUNDS.zNear - BOUNDS.zFar);
      speed[i] = 0.05 + Math.random() * 0.12;
      phase[i] = Math.random() * Math.PI * 2;
      sway[i] = 0.1 + Math.random() * 0.25;
    }
    return { positions, speed, phase, sway };
  }, []);

  useFrame((state, rawDt) => {
    // Tab-switch dt spikes would teleport the motes; cap the step instead.
    const dt = Math.min(rawDt, 0.05);
    const target = heldRef.current ?? 0;
    // Much slower in than out: motes should be noticed, not announced.
    fadeCur.current += (target - fadeCur.current) * Math.min(1, dt * (target > fadeCur.current ? 1.6 : 4));
    const d = fadeCur.current;
    const pts = pointsRef.current;
    const mat = matRef.current;
    if (mat) mat.opacity = d * d * 0.85;
    if (pts) pts.visible = d > 0.02;
    if (!pts || d <= 0.02) return;
    const t = state.clock.elapsedTime;
    const pos = sim.positions;
    for (let i = 0; i < COUNT; i++) {
      let y = pos[i * 3 + 1] + sim.speed[i] * dt;
      if (y > BOUNDS.yMax) y = BOUNDS.yMin;
      pos[i * 3 + 1] = y;
      let x = pos[i * 3] + Math.sin(t * 0.6 + sim.phase[i]) * sim.sway[i] * dt;
      if (x > BOUNDS.x) x = -BOUNDS.x;
      else if (x < -BOUNDS.x) x = BOUNDS.x;
      pos[i * 3] = x;
    }
    pts.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={pointsRef} visible={false} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[sim.positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        ref={matRef}
        color="#e8b264"
        size={0.028}
        transparent
        opacity={0}
        depthWrite={false}
        blending={AdditiveBlending}
        sizeAttenuation
      />
    </points>
  );
}
