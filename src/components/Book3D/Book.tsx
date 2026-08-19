"use client";

import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { MeshStandardMaterial, type Group } from "three";

import { buildBookPlan, camera as cam, desk as deskPose, dims, palette } from "@/lib/book3d.config";

import { leatherMaps, paperMaps, stripeMap } from "./textures";

/**
 * DOM width, in CSS px, that maps to one page. Panels are authored at this size
 * and scaled into world units, so type is specified in px and still lands
 * exactly on the page surface.
 */
const PAGE_PX = 520;
const PAGE_PX_HEIGHT = PAGE_PX * (dims.pageHeight / dims.pageWidth);

/**
 * drei's `transform` mode already maps CSS px into world units, so this is a
 * correction factor on top of that mapping, not a px-to-world conversion.
 * Calibrated by measuring the rendered panel against the page it sits on; it is
 * camera-independent (both live in world space). 0.0769 makes the 520×728 panel
 * cover the page exactly (full bleed), so the panel's own CSS padding is the
 * only print margin.
 */
const PAGE_SCALE = 0.0769;

/**
 * Print margin, in CSS px on the 520×728 page panel. The panel covers the page
 * surface exactly (see PAGE_SCALE), so this is THE margin — adjust freely.
 * Order: top / sides / bottom.
 */
const PAGE_PADDING = "36px 40px 36px";

/** Slight fan so stacked pages never read as one fused slab. */
const SPLAY = 0.05;

const COVER_Z_CLOSED = dims.blockDepth + dims.coverThickness / 2;
/** Open, the cover sinks below the left pile: it is the bottom of that stack. */
const COVER_Z_OPEN = -0.01;

/** The un-flippable mass of pages, ending just below the bottom leaf. */
const BLOCK_FRONT = 0.008;
const BLOCK_BACK = -dims.blockDepth;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const ss = (v: number, a: number, b: number) => {
  const t = clamp01((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};

/**
 * One printed page face: real DOM positioned on the page surface in 3D, so the
 * copy stays selectable, accessible and indexable. Opacity is driven per frame
 * by the Book from the physical state of the stack — print rides its page
 * through a turn and hides when the face turns away or another leaf lands on
 * it, exactly like paper. Nothing here re-renders during animation.
 */
function PageFace({
  children,
  facing,
  surface,
  innerRef,
}: {
  children: ReactNode;
  facing: 1 | -1;
  /** Distance from the leaf midplane out to the printed surface. */
  surface: number;
  innerRef: (el: HTMLDivElement | null) => void;
}) {
  return (
    <Html
      transform
      position={[dims.pageWidth / 2, 0, facing * surface]}
      rotation={[0, facing === 1 ? 0 : Math.PI, 0]}
      scale={PAGE_SCALE}
      // Belt: hide the mirrored ghost when the face points away. The braces are
      // the orientation fades below, which do the same thing deterministically.
      style={{
        width: `${PAGE_PX}px`,
        height: `${PAGE_PX_HEIGHT}px`,
        backfaceVisibility: "hidden",
        pointerEvents: "none",
      }}
    >
      <div
        ref={innerRef}
        style={{
          // Explicit px, not 100%: drei's `style` sizes the outer transform
          // wrapper, so a percentage here shrink-to-fits and collapses the page.
          width: `${PAGE_PX}px`,
          height: `${PAGE_PX_HEIGHT}px`,
          padding: PAGE_PADDING,
          boxSizing: "border-box",
          color: palette.ink,
          fontSize: "19px",
          lineHeight: 1.58,
          opacity: 0,
          visibility: "hidden",
          pointerEvents: "none",
        }}
      >
        {children}
      </div>
    </Html>
  );
}

export type Spread = { left: ReactNode; right: ReactNode };

export function Book({
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
  const root = useRef<Group>(null);
  const coverGroup = useRef<Group>(null);
  const leafRefs = useRef<(Group | null)[]>([]);
  const faceEls = useRef<Record<string, HTMLDivElement | null>>({});
  /**
   * Last opacity written, cached ON the node rather than under the face key.
  */
  const lastFade = useRef(new WeakMap<HTMLDivElement, number>());
  /** Smoothed pickup pose, eased toward heldRef every frame. */
  const deskCur = useRef(0);

  const plan = useMemo(() => buildBookPlan(spreads.length), [spreads.length]);

  // Procedural surface maps: leather grain, paper tooth, page-edge striations.
  const mats = useMemo(() => {
    const leather = leatherMaps();
    const paper = paperMaps();
    return {
      cloth: new MeshStandardMaterial({
        map: leather.map,
        bumpMap: leather.bumpMap,
        bumpScale: 0.4,
        roughness: 0.78,
        metalness: 0.03,
      }),
      paper: new MeshStandardMaterial({
        map: paper.map,
        bumpMap: paper.bumpMap,
        bumpScale: 0.12,
        roughness: 0.97,
      }),
      edge: new MeshStandardMaterial({
        map: stripeMap(["#e8dfc8", "#cdbfa0"], "horizontal"),
        roughness: 0.95,
      }),
      gilt: new MeshStandardMaterial({
        map: stripeMap(["#caa24f", "#8f7434"], "vertical"),
        roughness: 0.45,
        metalness: 0.5,
      }),
    };
  }, []);

  useEffect(
    () => () => {
      for (const m of Object.values(mats)) {
        m.map?.dispose();
        m.bumpMap?.dispose();
        m.dispose();
      }
    },
    [mats],
  );

  const applyFade = (key: string, o: number) => {
    const el = faceEls.current[key];
    if (!el) return;
    const q = Math.round(o * 50) / 50;
    if (lastFade.current.get(el) === q) return;
    lastFade.current.set(el, q);
    el.style.opacity = String(q);
    el.style.visibility = q < 0.02 ? "hidden" : "visible";
    el.style.pointerEvents = q > 0.5 ? "auto" : "none";
  };

  // The sequencer owns the tweened progress; this maps it onto transforms and
  // print visibility. No React state is touched per frame.
  useFrame((_, dt) => {
    const p = progressRef.current ?? 0;
    const openness = clamp01(p);
    // The finale beat: pages riffle to the end (handled by the plan windows),
    // then the whole book is swept off the desk to the left, lifting and
    // tipping as it goes — clearing the stage for the contact letter.
    const exit = ss(clamp01(p - spreads.length), 0.3, 0.98);
    // While a clipping is held up close the book lies back, sinks and drops
    // away. Critically-damped ease toward the boolean target, so the recede
    // and the recover both play smoothly at any frame rate.
    const target = heldRef.current ?? 0;
    deskCur.current += (target - deskCur.current) * Math.min(1, dt * 5);
    const desk = ss(deskCur.current, 0, 1);

    if (root.current) {
      root.current.rotation.y =
        cam.yawClosed + (cam.yawOpen - cam.yawClosed) * openness - exit * 0.85;
      root.current.rotation.x =
        cam.tiltClosed + (cam.tiltOpen - cam.tiltClosed) * openness + desk * deskPose.tilt;
      root.current.rotation.z = exit * 0.2;
      // Closed, the book is one page wide and must sit centred; open, it is two
      // pages wide around the spine. Slide the hinge to keep it framed.
      root.current.position.x = (-dims.pageWidth / 2) * (1 - openness) - exit * 3.4;
      root.current.position.y = exit * 0.3 + desk * deskPose.lift;
      root.current.position.z = desk * deskPose.dolly;
    }
    if (coverGroup.current) {
      coverGroup.current.rotation.y = -openness * (Math.PI - SPLAY);
      coverGroup.current.position.z =
        COVER_Z_CLOSED + (COVER_Z_OPEN - COVER_Z_CLOSED) * openness;
    }

    // Eased turn per leaf from its window in the plan.
    const T = plan.leaves.map((L) => {
      if (!Number.isFinite(L.a)) return 0;
      const raw = clamp01((p - L.a) / (L.b - L.a));
      return raw * raw * (3 - 2 * raw);
    });

    // Splay fades in with openness: a lifted fore-edge on a shut book would
    // poke straight through the front cover.
    const splay = SPLAY * openness;
    for (let n = 0; n < plan.leaves.length; n++) {
      const g = leafRefs.current[n];
      if (!g) continue;
      const L = plan.leaves[n];
      g.rotation.y = -T[n] * (Math.PI - splay) - (1 - T[n]) * splay;
      g.position.z = L.zClosed + (L.zOpen - L.zClosed) * T[n];
    }

    // Print visibility, driven physically:
    // - outgoing print rides its page and drops out as the face passes 90°;
    // - incoming print is revealed by its own leaf landing;
    // - a left page clears just before the next riffle sweeps across it, so
    //   type never floats over a moving page (the DOM layer cannot be occluded
    //   by WebGL, so this choreography is what "solid paper" means here).
    applyFade("cover", 1 - ss(openness, 0.46, 0.54));
    for (let k = 0; k < plan.faces.length; k++) {
      const f = plan.faces[k];
      const settle = T[f.leftLeaf];
      const departure = T[f.rightLeaf];
      applyFade(`l${k}`, ss(settle, 0.6, 0.85) * (1 - ss(departure, 0.2, 0.45)));
      applyFade(`r${k}`, ss(settle, 0.7, 0.9) * (1 - ss(departure, 0.46, 0.54)));
    }
  });

  const coverWidth = dims.pageWidth + dims.coverOverhang;
  const coverHeight = dims.pageHeight + dims.coverOverhang;
  /** Slightly narrower than the block so fore-edges never share a plane. */
  const leafWidth = dims.pageWidth - 0.006;

  return (
    <group ref={root}>
      {/* Back cover */}
      <mesh
        material={mats.cloth}
        position={[
          dims.pageWidth / 2 - dims.coverOverhang / 2,
          0,
          -dims.blockDepth - dims.coverThickness / 2,
        ]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[coverWidth, coverHeight, dims.coverThickness]} />
      </mesh>

      {/* Spine */}
      <mesh material={mats.cloth} position={[-dims.coverOverhang / 2, 0, 0]} castShadow receiveShadow>
        <boxGeometry
          args={[dims.coverThickness, coverHeight, dims.blockDepth * 2 + dims.coverThickness * 2]}
        />
      </mesh>

      {/* Page block: ends below the flippable leaves instead of intersecting them */}
      <mesh
        material={mats.edge}
        position={[dims.pageWidth / 2, 0, (BLOCK_FRONT + BLOCK_BACK) / 2]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[dims.pageWidth, dims.pageHeight, BLOCK_FRONT - BLOCK_BACK]} />
      </mesh>

      {/* Gilt fore-edge, proud of the block */}
      <mesh material={mats.gilt} position={[dims.pageWidth - 0.004, 0, (BLOCK_FRONT + BLOCK_BACK) / 2]}>
        <boxGeometry
          args={[0.009, dims.pageHeight * 0.99, (BLOCK_FRONT - BLOCK_BACK) * 0.98]}
        />
      </mesh>

      {/* Front cover: cloth, endpaper inside, title stamped outside */}
      <group ref={coverGroup} position={[0, 0, COVER_Z_CLOSED]}>
        <mesh
          material={mats.cloth}
          position={[dims.pageWidth / 2 - dims.coverOverhang / 2, 0, 0]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[coverWidth, coverHeight, dims.coverThickness]} />
        </mesh>
        <mesh
          material={mats.paper}
          position={[dims.pageWidth / 2, 0, -dims.coverThickness / 2 - 0.001]}
          receiveShadow
        >
          <boxGeometry args={[dims.pageWidth, dims.pageHeight, 0.002]} />
        </mesh>
        <PageFace
          facing={1}
          surface={dims.coverThickness / 2 + 0.004}
          innerRef={(el) => {
            faceEls.current.cover = el;
          }}
        >
          {coverFace}
        </PageFace>
      </group>

      {/* Flippable leaves. Most are blank riffle stock; content leaves carry a
          spread's right page on their front and the NEXT left page on their back. */}
      {plan.leaves.map((L, n) => {
        const frontOf = plan.faces.findIndex((f) => f.rightLeaf === n);
        const backOf = plan.faces.findIndex((f) => f.leftLeaf === n);
        return (
          <group
            key={n}
            ref={(el) => {
              leafRefs.current[n] = el;
            }}
            position={[0, 0, L.zClosed]}
          >
            <mesh material={mats.paper} position={[leafWidth / 2, 0, 0]} castShadow receiveShadow>
              <boxGeometry args={[leafWidth, dims.pageHeight, dims.leafThickness]} />
            </mesh>
            {frontOf >= 0 ? (
              <PageFace
                facing={1}
                surface={dims.leafThickness / 2 + 0.003}
                innerRef={(el) => {
                  faceEls.current[`r${frontOf}`] = el;
                }}
              >
                {spreads[frontOf]?.right}
              </PageFace>
            ) : null}
            {backOf >= 0 ? (
              <PageFace
                facing={-1}
                surface={dims.leafThickness / 2 + 0.003}
                innerRef={(el) => {
                  faceEls.current[`l${backOf}`] = el;
                }}
              >
                {spreads[backOf]?.left}
              </PageFace>
            ) : null}
          </group>
        );
      })}
    </group>
  );
}
