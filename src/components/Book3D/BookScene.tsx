"use client";

import { Canvas } from "@react-three/fiber";
import type { ReactNode } from "react";

import { camera as cam } from "@/lib/book3d.config";

import { Book, type Spread } from "./Book";
import EmberDust from "./EmberDust";

/**
 * The canvas is transparent on purpose: the book composites straight onto the
 * page background in either theme. This is the thing the frame-sequence version
 * could never do, because a dark subject on a black plate cannot be keyed. The
 * book itself is fully opaque — every material is solid, and the lighting is
 * pitched so the dark cloth separates from the dark page background.
 */
export default function BookScene({
  progressRef,
  heldRef,
  spreads,
  coverFace,
}: {
  progressRef: React.RefObject<number>;
  /** 1 while a project clipping is held up close, 0 otherwise. */
  heldRef: React.RefObject<number>;
  spreads: Spread[];
  coverFace: ReactNode;
}) {
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      gl={{ alpha: true, antialias: true }}
      camera={{ position: [...cam.position], fov: cam.fov }}
      style={{ background: "transparent" }}
    >
      <ambientLight intensity={0.5} />
      {/* Key light, warm, upper left — the reading-lamp direction. */}
      <directionalLight
        position={[-2.6, 3.1, 2.4]}
        intensity={2.3}
        color="#fff3dd"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0005}
      />
      {/* Cool fill from the opposite side so the shadow side is not dead. */}
      <directionalLight position={[2.8, 0.6, 1.8]} intensity={0.5} color="#cfe0ff" />
      {/* Rim from behind: pops the cloth silhouette off the dark background. */}
      <directionalLight position={[0.4, 1.2, -2.6]} intensity={1.05} color="#ffe9c7" />

      {/* Dust motes behind the book; drift in while a clipping is held. */}
      <EmberDust heldRef={heldRef} />

      <Book progressRef={progressRef} heldRef={heldRef} spreads={spreads} coverFace={coverFace} />
    </Canvas>
  );
}
