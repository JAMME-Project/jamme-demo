import type { NormalizedLandmark } from '@mediapipe/tasks-vision';

export type Point = { x: number; y: number };

export const eyeContours = [
  [263, 249, 390, 373, 374, 380, 381, 382, 362, 398, 384, 385, 386, 387, 388, 466],
  [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246],
] as const;

// Distances along each upper eyelid, measured from its outer corner.
export const firstDotFraction = 0.18;
export const secondDotFraction = 0.38;

export function sampleUpperLid(points: readonly Point[], fraction: number) {
  const lengths = points
    .slice(1)
    .map((point, i) => Math.hypot(point.x - points[i].x, point.y - points[i].y));
  let distance =
    lengths.reduce((sum, length) => sum + length, 0) * Math.max(0, Math.min(1, fraction));
  for (let i = 0; i < lengths.length; i++) {
    const a = points[i],
      b = points[i + 1],
      length = lengths[i];
    if (distance <= length || i === lengths.length - 1) {
      const amount = length > 0 ? distance / length : 0;
      return { x: a.x + (b.x - a.x) * amount, y: a.y + (b.y - a.y) * amount };
    }
    distance -= length;
  }
  return points[0];
}

export function getGuideEyes(
  landmarks: readonly NormalizedLandmark[],
  width: number,
  height: number,
) {
  const point = (index: number): Point => ({
    x: (1 - landmarks[index].x) * width,
    y: landmarks[index].y * height,
  });
  return [
    { upper: [263, 466, 388, 387, 386, 385, 384, 398, 362], nose: 327, brow: 300 },
    { upper: [33, 246, 161, 160, 159, 158, 157, 173, 133], nose: 98, brow: 70 },
  ].map(({ upper: indices, nose: noseIndex, brow: browIndex }) => {
    const upper = indices.map(point);
    const outer = upper[0],
      inner = upper[upper.length - 1];
    const eyeWidth = Math.hypot(inner.x - outer.x, inner.y - outer.y);
    const outward = {
      x: (outer.x - inner.x) / Math.max(1, eyeWidth),
      y: (outer.y - inner.y) / Math.max(1, eyeWidth),
    };
    const down = { x: -outward.y, y: outward.x };
    if (down.y < 0) {
      down.x *= -1;
      down.y *= -1;
    }
    const first = sampleUpperLid(upper, firstDotFraction);
    const second = sampleUpperLid(upper, secondDotFraction);
    const nose = point(noseIndex),
      brow = point(browIndex);
    const dx = brow.x - nose.x,
      dy = brow.y - nose.y;
    // Intersect the ray at the first mark's height with the same line drawn as the brow guide.
    const determinant = outward.x * dy - outward.y * dx;
    const along =
      Math.abs(determinant) > 0.01
        ? ((nose.x - first.x) * dy - (nose.y - first.y) * dx) / determinant
        : eyeWidth * 0.35;
    let tail = { x: first.x + outward.x * along, y: first.y + outward.y * along };
    const extension =
      ((tail.x - outer.x) * outward.x + (tail.y - outer.y) * outward.y) / Math.max(1, eyeWidth);
    const desired = Math.max(0.08, Math.min(0.28, extension));
    const baselineProjection = dx * outward.x + dy * outward.y;
    if (Math.abs(extension - desired) > 0.001 && Math.abs(baselineProjection) > 0.01) {
      // Keep the endpoint on the nose-to-brow guide while ensuring a visible outer wing.
      const amount =
        ((outer.x - nose.x) * outward.x + (outer.y - nose.y) * outward.y + desired * eyeWidth) /
        baselineProjection;
      tail = { x: nose.x + amount * dx, y: nose.y + amount * dy };
    }
    return {
      upper,
      outer,
      inner,
      first,
      second,
      tail,
      nose,
      brow,
      down,
      width: eyeWidth,
    };
  });
}

export type GuideEye = ReturnType<typeof getGuideEyes>[number];

export function triangleTransform(source: readonly Point[], target: readonly Point[]) {
  const [a, b, c] = source;
  const [p, q, r] = target;
  const sx = b.x - a.x;
  const sy = b.y - a.y;
  const tx = c.x - a.x;
  const ty = c.y - a.y;
  const determinant = sx * ty - sy * tx;
  const ux = q.x - p.x;
  const uy = q.y - p.y;
  const vx = r.x - p.x;
  const vy = r.y - p.y;
  const targetArea = ux * vy - uy * vx;

  // Do not render collapsed or folded triangles when landmarks overlap or an eye turns away.
  if (
    Math.abs(determinant) < 0.01 ||
    Math.abs(targetArea) < 0.01 ||
    determinant * targetArea <= 0
  ) {
    return null;
  }

  const m11 = (ux * ty - vx * sy) / determinant;
  const m12 = (uy * ty - vy * sy) / determinant;
  const m21 = (vx * sx - ux * tx) / determinant;
  const m22 = (vy * sx - uy * tx) / determinant;
  return [m11, m12, m21, m22, p.x - m11 * a.x - m21 * a.y, p.y - m12 * a.x - m22 * a.y] as const;
}
