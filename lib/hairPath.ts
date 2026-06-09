/**
 * Centerline hair scribble — a single continuous SVG path that traces
 * many overlapping ovals to form a hand-drawn ink hair cloud.
 *
 * The result is one path with one M (moveto) followed entirely by smooth
 * cubic beziers (Catmull-Rom converted). That means stroke-dasharray +
 * stroke-dashoffset will animate it as ONE continuous pen stroke — no
 * masks, no fills, just the actual line being drawn.
 *
 * Deterministic (seeded), so SSR + client hydration produce identical d.
 */

// viewBox 0 0 820 1084 — matches pupa_pinart.svg reference
const HAIR_CX = 410;
const HAIR_CY = 290;
const HAIR_HW = 200; // half-width of hair cloud
const HAIR_HH = 150; // half-height of hair cloud

/** Mulberry32 — small deterministic PRNG */
function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Catmull-Rom through points -> cubic bezier SVG path */
function smoothPath(pts: Array<[number, number]>): string {
  if (pts.length < 2) return '';
  const f = (n: number) => n.toFixed(1);
  let d = `M ${f(pts[0][0])},${f(pts[0][1])} `;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += `C ${f(c1x)},${f(c1y)} ${f(c2x)},${f(c2y)} ${f(p2[0])},${f(p2[1])} `;
  }
  return d;
}

/** Build the hair centerline path */
export function buildHairPath(seed = 7): string {
  const rand = rng(seed);
  const pts: Array<[number, number]> = [];

  // descent from the drop position into the hair area —
  // a short loopy fall that the line "enters" through
  const dropX = HAIR_CX;
  const dropY = 180;
  pts.push([dropX, dropY]);
  const NA = 40;
  for (let i = 1; i <= NA; i++) {
    const t = i / NA;
    const cy = dropY + t * 80;
    const cx = dropX + Math.sin(t * Math.PI * 1.6) * 30;
    const ang = t * Math.PI * 3.6;
    const r = 12 + 14 * Math.sin(t * Math.PI);
    pts.push([cx + Math.cos(ang) * r, cy + Math.sin(ang) * r * 0.75]);
  }

  // hair cloud — concentric rings of looping ovals.
  // Each ring contributes a layer; together they read as one organic mess.
  const rings = [
    { count: 9, radius: 0.88, loop: [55, 38], steps: 18, jitter: 0.32 },
    { count: 7, radius: 0.58, loop: [44, 30], steps: 15, jitter: 0.45 },
    { count: 5, radius: 0.26, loop: [32, 22], steps: 12, jitter: 0.9 }
  ];

  for (const ring of rings) {
    for (let i = 0; i < ring.count; i++) {
      const angOffset =
        (i / ring.count) * Math.PI * 2 + (rand() - 0.5) * ring.jitter;
      const cx = HAIR_CX + Math.cos(angOffset) * HAIR_HW * ring.radius;
      const cy = HAIR_CY + Math.sin(angOffset) * HAIR_HH * ring.radius;
      const lrx = ring.loop[0] + rand() * 18;
      const lry = ring.loop[1] + rand() * 14;
      const rot = rand() * Math.PI;
      const cosR = Math.cos(rot);
      const sinR = Math.sin(rot);

      for (let s = 0; s <= ring.steps; s++) {
        const a = (s / ring.steps) * Math.PI * 2 + rand() * 0.04;
        const ux = Math.cos(a) * lrx;
        const uy = Math.sin(a) * lry;
        pts.push([
          cx + cosR * ux - sinR * uy,
          cy + sinR * ux + cosR * uy
        ]);
      }
    }
  }

  return smoothPath(pts);
}

/** Approximate bounding box for layout reasoning */
export const HAIR_BOUNDS = {
  cx: HAIR_CX,
  cy: HAIR_CY,
  width: HAIR_HW * 2,
  height: HAIR_HH * 2
};
