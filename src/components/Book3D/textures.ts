import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from "three";

/**
 * Procedural surface maps for the book. Generated once on the client — no image
 * assets, no generation credits — and deterministic (seeded PRNG) so the grain
 * is identical on every load.
 */

/** mulberry32: tiny deterministic PRNG. */
function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeCanvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

function toTexture(
  c: HTMLCanvasElement,
  opts: { srgb?: boolean; repeat?: [number, number]; anisotropy?: number } = {},
) {
  const t = new CanvasTexture(c);
  if (opts.srgb) t.colorSpace = SRGBColorSpace;
  t.wrapS = t.wrapT = RepeatWrapping;
  if (opts.repeat) t.repeat.set(opts.repeat[0], opts.repeat[1]);
  t.anisotropy = opts.anisotropy ?? 4;
  return t;
}

/**
 * Bookbinding leather: cellular grain built from a jittered-grid Voronoi.
 * F2−F1 close to zero marks the creases between grain cells (darkened and
 * carved into the bump map); distance to the nearest feature point rounds each
 * cell into a little cushion. Distances are toroidal so the texture tiles.
 */
export function leatherMaps(base: [number, number, number] = [47, 40, 33]) {
  const size = 512;
  const cell = 16;
  const grid = size / cell;
  const rand = rng(11);

  // One jittered feature point per grid cell.
  const px: number[] = [];
  const py: number[] = [];
  for (let gy = 0; gy < grid; gy++) {
    for (let gx = 0; gx < grid; gx++) {
      px.push((gx + rand()) * cell);
      py.push((gy + rand()) * cell);
    }
  }

  const color = makeCanvas(size, size);
  const bump = makeCanvas(size, size);
  const cctx = color.getContext("2d")!;
  const bctx = bump.getContext("2d")!;
  const ci = cctx.createImageData(size, size);
  const bi = bctx.createImageData(size, size);
  const noise = rng(13);

  for (let y = 0; y < size; y++) {
    const gy = Math.floor(y / cell);
    for (let x = 0; x < size; x++) {
      const gx = Math.floor(x / cell);
      let f1 = Infinity;
      let f2 = Infinity;
      for (let oy = -1; oy <= 1; oy++) {
        for (let ox = -1; ox <= 1; ox++) {
          const c = (((gy + oy + grid) % grid) * grid + ((gx + ox + grid) % grid));
          let dx = Math.abs(x - px[c]);
          let dy = Math.abs(y - py[c]);
          if (dx > size / 2) dx = size - dx;
          if (dy > size / 2) dy = size - dy;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < f1) {
            f2 = f1;
            f1 = d;
          } else if (d < f2) {
            f2 = d;
          }
        }
      }
      // Crease where the two nearest cells meet; cushion toward each centre.
      const crease = Math.max(0, 1 - (f2 - f1) / 2.4) ** 1.5;
      const puff = Math.max(0, 1 - f1 / (cell * 0.8));
      const n = (noise() - 0.5) * 2;

      const i = (y * size + x) * 4;
      const v = puff * 5 - crease * 15 + n * 5;
      ci.data[i] = base[0] + v;
      ci.data[i + 1] = base[1] + v;
      ci.data[i + 2] = base[2] + v;
      ci.data[i + 3] = 255;
      const b = 128 + puff * 26 - crease * 54 + n * 9;
      bi.data[i] = b;
      bi.data[i + 1] = b;
      bi.data[i + 2] = b;
      bi.data[i + 3] = 255;
    }
  }
  cctx.putImageData(ci, 0, 0);
  bctx.putImageData(bi, 0, 0);
  return {
    map: toTexture(color, { srgb: true, repeat: [1.6, 2.2] }),
    bumpMap: toTexture(bump, { repeat: [1.6, 2.2] }),
  };
}

/** Blurry low-frequency blotches, for large-scale unevenness in a sheet. */
function mottle(size: number, seed: number, amplitude: number) {
  const small = makeCanvas(32, 32);
  const sctx = small.getContext("2d")!;
  const img = sctx.createImageData(32, 32);
  const rand = rng(seed);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 128 + (rand() - 0.5) * amplitude;
    img.data[i] = v;
    img.data[i + 1] = v;
    img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  sctx.putImageData(img, 0, 0);
  const big = makeCanvas(size, size);
  const bctx = big.getContext("2d")!;
  bctx.imageSmoothingEnabled = true;
  bctx.drawImage(small, 0, 0, size, size);
  return big;
}

/**
 * Cream book stock, textured enough to read as paper at arm's length: per-pixel
 * tooth, cloudy formation mottle, faint laid lines, and pressed-in fibers. The
 * amplitudes stay low where it matters — type has to remain comfortable to read
 * on top of it.
 */
export function paperMaps(base = "#f4efe3", fiber = "#c2b493") {
  const size = 512;
  const color = makeCanvas(size, size);
  const cctx = color.getContext("2d")!;
  cctx.fillStyle = base;
  cctx.fillRect(0, 0, size, size);

  // Per-pixel tooth.
  const img = cctx.getImageData(0, 0, size, size);
  const d = img.data;
  const rand = rng(21);
  for (let i = 0; i < d.length; i += 4) {
    const n = (rand() - 0.5) * 9;
    d[i] += n;
    d[i + 1] += n;
    d[i + 2] += n;
  }
  cctx.putImageData(img, 0, 0);

  // Cloudy formation unevenness. Kept gentle: past ~0.1 the sheet reads dirty
  // rather than textured and the ink loses contrast.
  cctx.globalCompositeOperation = "multiply";
  cctx.globalAlpha = 0.09;
  cctx.drawImage(mottle(size, 41, 90), 0, 0);
  cctx.globalCompositeOperation = "source-over";

  // Faint laid lines, like the wire marks in laid stock.
  cctx.globalAlpha = 0.035;
  cctx.fillStyle = fiber;
  for (let y = 0; y < size; y += 9) cctx.fillRect(0, y, size, 1);

  // Pressed-in fibers.
  cctx.strokeStyle = fiber;
  cctx.lineWidth = 1;
  for (let k = 0; k < 260; k++) {
    cctx.globalAlpha = 0.05 + rand() * 0.07;
    const x = rand() * size;
    const y = rand() * size;
    const a = rand() * Math.PI;
    const l = 3 + rand() * 11;
    cctx.beginPath();
    cctx.moveTo(x, y);
    cctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
    cctx.stroke();
  }
  cctx.globalAlpha = 1;

  // Bump: tooth plus the same cloudy mottle so raking light shows the sheet.
  const bump = makeCanvas(size, size);
  const bctx = bump.getContext("2d")!;
  const bimg = bctx.createImageData(size, size);
  const bd = bimg.data;
  const rand2 = rng(33);
  for (let i = 0; i < bd.length; i += 4) {
    const b = 128 + (rand2() - 0.5) * 24;
    bd[i] = b;
    bd[i + 1] = b;
    bd[i + 2] = b;
    bd[i + 3] = 255;
  }
  bctx.putImageData(bimg, 0, 0);
  bctx.globalAlpha = 0.35;
  bctx.drawImage(mottle(size, 43, 120), 0, 0);
  bctx.globalAlpha = 1;

  return {
    map: toTexture(color, { srgb: true }),
    bumpMap: toTexture(bump, { repeat: [2, 2] }),
  };
}

/**
 * Stacked-page striations for the block edges and the gilt fore-edge. Direction
 * matters because box UVs differ per face: the block's top/bottom faces need the
 * lines varying along v ("horizontal"), the gilt's outward face along u
 * ("vertical").
 */
export function stripeMap(colors: [string, string], direction: "horizontal" | "vertical") {
  const vertical = direction === "vertical";
  const w = vertical ? 512 : 128;
  const h = vertical ? 128 : 512;
  const c = makeCanvas(w, h);
  const ctx = c.getContext("2d")!;
  const rand = rng(55);
  ctx.fillStyle = colors[0];
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = colors[1];
  const across = vertical ? w : h;
  for (let p = 0; p < across; p += 2) {
    ctx.globalAlpha = 0.2 + rand() * 0.55;
    if (vertical) ctx.fillRect(p, 0, 1, h);
    else ctx.fillRect(0, p, w, 1);
  }
  ctx.globalAlpha = 1;
  return toTexture(c, { srgb: true, anisotropy: 8 });
}
