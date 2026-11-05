import type { NormalizedLandmark } from '@mediapipe/tasks-vision';
import mesh from './guideMesh.data.json';

export type Point = { x: number; y: number };

export const eyeContours = [
  [263, 249, 390, 373, 374, 380, 381, 382, 362, 398, 384, 385, 386, 387, 388, 466],
  [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246],
] as const;

// Each eye's artwork contour is calibrated to its own upper-eyelid landmarks.
// The nose-to-brow guide retains the original facial surface calibration.
export function projectGuideVertices(
  landmarks: readonly NormalizedLandmark[],
  width: number,
  height: number,
): Point[] {
  return mesh.vertices.map(({ anchors }) => {
    let x = 0;
    let y = 0;
    for (const { index, weight } of anchors) {
      x += landmarks[index].x * weight;
      y += landmarks[index].y * weight;
    }
    return { x: (1 - x) * width, y: y * height };
  });
}

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
