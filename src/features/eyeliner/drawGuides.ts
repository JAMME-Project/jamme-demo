import type { NormalizedLandmark } from '@mediapipe/tasks-vision';
import type { LensKey } from './lesson';
import mesh from './guideMesh.data.json';
import { projectGuideVertices, triangleTransform } from './guideMesh';

const artwork = {
  eye1: 'eye-1.png',
  eye2: 'eye-2.png',
  eye3: 'eye-3.png',
  eye4: 'eye-4.png',
  eye5: 'eye-5.png',
  eye6: 'eye-6.png',
  eye7: 'eye-7.png',
  final: 'final.png',
  animation1: 'tail-animation.png',
  animation2: 'connect-animation.png',
  puff: 'puff.png',
} satisfies Record<LensKey | 'puff', string>;

type GuideImages = Record<keyof typeof artwork, HTMLImageElement>;
const animationBounds = {
  animation1: [
    [34, 68],
    [328, 359],
  ],
  animation2: [
    [61, 90],
    [305, 335],
  ],
} as const;

let pendingArtwork: Promise<GuideImages> | undefined;

export function loadGuideArtwork() {
  pendingArtwork ??= Promise.all(
    Object.entries(artwork).map(async ([key, file]) => {
      const image = new Image();
      image.src = `${import.meta.env.BASE_URL}figma-v2/${file}`;
      await image.decode();
      return [key, image] as const;
    }),
  )
    .then((entries) => Object.fromEntries(entries) as GuideImages)
    .catch((error: unknown) => {
      pendingArtwork = undefined;
      throw error;
    });
  return pendingArtwork;
}

const sourceTriangles = mesh.triangles.map((indices) => {
  const points = indices.map((index) => mesh.vertices[index]);
  const left = Math.max(0, Math.floor(Math.min(...points.map((p) => p.x))) - 1);
  const top = Math.max(0, Math.floor(Math.min(...points.map((p) => p.y))) - 1);
  const right = Math.min(390, Math.ceil(Math.max(...points.map((p) => p.x))) + 1);
  const bottom = Math.min(844, Math.ceil(Math.max(...points.map((p) => p.y))) + 1);
  return { indices, points, left, top, width: right - left, height: bottom - top };
});

export function createGuideRenderer(images: GuideImages) {
  const texture = document.createElement('canvas');
  texture.width = 390;
  texture.height = 844;
  const paint = texture.getContext('2d');
  if (!paint) throw new Error('아이라인 가이드를 준비할 수 없어요.');
  let lastGuides = '';
  let lastProgress = -1;
  let activeTriangles: number[] = [];

  return (
    ctx: CanvasRenderingContext2D,
    landmarks: NormalizedLandmark[],
    guides: readonly LensKey[],
    setup: boolean,
    elapsed: number,
  ) => {
    if (landmarks.length < 468) return;
    const { width, height } = ctx.canvas;
    if (setup) {
      for (const [outer, inner, cheek] of [
        [263, 362, 280],
        [33, 133, 50],
      ]) {
        const size =
          Math.hypot(
            (landmarks[outer].x - landmarks[inner].x) * width,
            (landmarks[outer].y - landmarks[inner].y) * height,
          ) * 0.72;
        const x = (1 - landmarks[cheek].x) * width;
        const y = landmarks[cheek].y * height;
        ctx.drawImage(images.puff, x - size / 2, y - size / 2, size, size);
      }
      return;
    }
    if (!guides.length) return;

    const key = guides.join(',');
    const animated = guides.includes('animation1') || guides.includes('animation2');
    const progress = animated ? Math.min(1, elapsed / 900) : 1;
    const changed = key !== lastGuides;
    if (changed) {
      activeTriangles = [...new Set(guides.flatMap((guide) => mesh.guides[guide]))];
    }
    if (changed || progress !== lastProgress) {
      paint.clearRect(0, 0, 390, 844);
      for (const guide of guides) {
        if (guide === 'animation1' || guide === 'animation2') {
          for (const [start, end] of animationBounds[guide]) {
            paint.save();
            paint.beginPath();
            paint.rect(start, 0, (end - start) * progress, 844);
            paint.clip();
            paint.drawImage(images[guide], -29.016, 135.04, 452.205, 613.841);
            paint.restore();
          }
        } else {
          paint.drawImage(images[guide], -29.016, 135.04, 452.205, 613.841);
        }
      }
      lastGuides = key;
      lastProgress = progress;
    }

    const vertices = projectGuideVertices(landmarks, width, height);
    for (const index of activeTriangles) {
      const patch = sourceTriangles[index];
      const target = patch.indices.map((id) => vertices[id]);
      const transform = triangleTransform(patch.points, target);
      if (!transform || patch.width <= 0 || patch.height <= 0) continue;
      const cx = (target[0].x + target[1].x + target[2].x) / 3;
      const cy = (target[0].y + target[1].y + target[2].y) / 3;
      ctx.save();
      ctx.beginPath();
      // Overlap the clips slightly to avoid antialiasing gaps between adjacent patches.
      for (const [i, point] of target.entries()) {
        const dx = point.x - cx;
        const dy = point.y - cy;
        const length = Math.max(1, Math.hypot(dx, dy));
        const x = point.x + (dx * 0.35) / length;
        const y = point.y + (dy * 0.35) / length;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.clip();
      ctx.setTransform(...transform);
      ctx.drawImage(
        texture,
        patch.left,
        patch.top,
        patch.width,
        patch.height,
        patch.left,
        patch.top,
        patch.width,
        patch.height,
      );
      ctx.restore();
    }
  };
}
