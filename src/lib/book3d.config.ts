/**
 * Geometry, materials and choreography for the 3D book hero.
 *
 * Nothing here is measured off artwork — the book is procedural, so it stays
 * crisp at any size and the text sits on surfaces whose position we know
 * exactly.
 */

/** Page dimensions in world units. Roughly a 5:7 trade hardcover. */
export const dims = {
  pageWidth: 1,
  pageHeight: 1.4,
  /** Half-thickness of the whole book at the spine. */
  blockDepth: 0.075,
  /** Cover overhangs the pages slightly, as real hardcovers do. */
  coverOverhang: 0.025,
  coverThickness: 0.018,
  leafThickness: 0.0045,
} as const;

export const palette = {
  cloth: "#2a3036",
  paper: "#f4efe3",
  gilt: "#c9a44c",
  ink: "#2a2118",
} as const;

/**
 * The sequence is a state machine, not a free scrub: each gesture plays one
 * complete transition and input is ignored until it finishes, so the book can
 * never be parked halfway through opening or mid page-turn.
 */
export const beats = [
  { id: "cover", label: "Cover" },
  { id: "about", label: "I. About" },
  { id: "experience", label: "II. Experience" },
  { id: "projects", label: "III. Projects" },
  /** Not a spread: the finale beat riffles the book shut and swipes it away. */
  { id: "contact", label: "Epilogue. Contact" },
] as const;

export type BeatId = (typeof beats)[number]["id"];

export const timing = {
  /** Cover open / close, in seconds. The longest move, so it gets the most time. */
  open: 1.3,
  /** One spread-to-spread riffle, in seconds. */
  turn: 1.05,
  /**
   * The contact finale: remaining pages riffle away, then the whole book
   * swipes off screen while the letter fades in. The longest move of all.
   */
  finale: 1.9,
  /**
   * Extra hold after a transition completes before input is accepted again.
   * Stops a single flick of a trackpad from advancing two beats.
   */
  cooldown: 0.12,
  /** Wheel delta that must accumulate before a beat advances. */
  wheelThreshold: 90,
  /** Touch swipe distance in px that advances a beat. */
  swipeThreshold: 48,
} as const;

/** Camera framing. The book sits at the origin. */
export const camera = {
  position: [0, 0.18, 3.0] as const,
  fov: 32,
  /** Book tilt when closed vs open, in radians. */
  tiltClosed: -0.16,
  /**
   * Kept shallow on purpose: the flatter the open book sits, the less the page
   * type is foreshortened and the easier it reads.
   */
  tiltOpen: -0.12,
  /** Book yaw when closed, so the cover reads with a hint of depth. */
  yawClosed: -0.26,
  yawOpen: 0,
} as const;

/**
 * The pose the book recedes into while a project clipping is held up close:
 * it lies back toward the desk, sinks and drops away from the camera, so the
 * lifted card reads as pulled OUT of the book rather than shown next to it.
 * Values are deltas applied on top of the open pose, driven 0→1 by the
 * pickup state (not by any beat), and paired with a CSS blur on the scene.
 */
export const desk = {
  /** Backward tilt (radians) at full recede. */
  tilt: -0.5,
  /** Sink below the resting position. */
  lift: -0.24,
  /** Slightly TOWARD the camera: lying back forshortens the book, so without
      this it reads as shrinking away instead of lying down under the card. */
  dolly: 0.15,
} as const;

/** Blank leaves that riffle open along with the cover. */
const RIFFLE = 4;
/** Leaves per spread-to-spread transition: the content leaf plus blanks. */
const GROUP = 4;
/** Leaves in the finale riffle: last content leaf plus closing blanks. */
const FINALE = 5;

export type LeafSpec = {
  /** Resting depth in the un-turned (right) stack. */
  zClosed: number;
  /** Resting depth in the turned (left) pile. */
  zOpen: number;
  /** Progress where this leaf's turn starts / completes. Infinity = never turns. */
  a: number;
  b: number;
};

export type BookPlan = {
  leaves: LeafSpec[];
  /** Per spread: the leaf whose back face is its LEFT page / front its RIGHT. */
  faces: { leftLeaf: number; rightLeaf: number }[];
};

/**
 * Lays out the page stack so every transition riffles a staggered group of
 * leaves instead of turning a single one.
 *
 * z choreography matters: in the closed stack the top page has the highest z,
 * but on the left pile the most recently landed page must end up on top. A
 * fixed z per leaf gets that backwards, so each leaf lerps from `zClosed` to
 * `zOpen` (which grows with n) as it turns.
 */
export function buildBookPlan(spreadCount: number): BookPlan {
  const zTop = 0.07;
  const dz = 0.0048;
  const zBase = 0.006;
  const leaves: LeafSpec[] = [];

  const add = (window: [number, number] | null, g: number, count: number, stagger: number) => {
    const n = leaves.length;
    let a = Number.POSITIVE_INFINITY;
    let b = Number.POSITIVE_INFINITY;
    if (window) {
      const span = 1 - (count - 1) * stagger;
      a = window[0] + (window[1] - window[0]) * (g * stagger);
      b = a + (window[1] - window[0]) * span;
    }
    leaves.push({ zClosed: zTop - n * dz, zOpen: zBase + n * dz, a, b });
  };

  // Opening: the riffle starts once the cover is well out of the way, so the
  // cover's swing (always ahead in angle) can never intersect a flying leaf.
  for (let g = 0; g < RIFFLE; g++) add([0.45, 1], g, RIFFLE, 0.16);
  // One group per spread transition; the content leaf (g=0) leads the riffle.
  for (let k = 0; k < spreadCount - 1; k++)
    for (let g = 0; g < GROUP; g++) add([k + 1, k + 2], g, GROUP, 0.14);
  // Finale: the last spread's right page leads a closing riffle in the first
  // 60% of the finale beat — the book "reads itself to the end" before the
  // swipe-away (driven in Book's useFrame) carries it off screen.
  for (let g = 0; g < FINALE; g++) add([spreadCount, spreadCount + 0.6], g, FINALE, 0.14);

  const faces = Array.from({ length: spreadCount }, (_, k) => ({
    leftLeaf: k === 0 ? RIFFLE - 1 : RIFFLE + k * GROUP - 1,
    rightLeaf: RIFFLE + k * GROUP,
  }));

  return { leaves, faces };
}
