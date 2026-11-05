import type { NormalizedLandmark } from '@mediapipe/tasks-vision';
import type { LensKey } from './lesson';

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
type Point = readonly [number, number];

// Eye corners measured on the 390 × 844 Figma camera reference. The live camera is mirrored.
const eyes = [
  { outer: [41.71, 383.13], inner: [133.01, 402.9], live: [263, 362, 280], side: 0 },
  { outer: [332.71, 388.09], inner: [255.95, 403.89], live: [33, 133, 50], side: 1 },
] as const;
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

export function drawGuides(
  ctx: CanvasRenderingContext2D,
  landmarks: NormalizedLandmark[],
  images: GuideImages,
  guides: readonly LensKey[],
  setup: boolean,
  elapsed: number,
) {
  const { width, height } = ctx.canvas;
  const point = (index: number): Point => [
    (1 - landmarks[index].x) * width,
    landmarks[index].y * height,
  ];

  for (const { outer, inner, live, side } of eyes) {
    const [x, y] = point(live[0]);
    const [innerX, innerY] = point(live[1]);
    const dx = innerX - x;
    const dy = innerY - y;
    const liveWidth = Math.hypot(dx, dy);
    if (liveWidth < 5) continue;

    if (setup) {
      const [cx, cy] = point(live[2]);
      const size = liveWidth * 0.72;
      ctx.drawImage(images.puff, cx - size / 2, cy - size / 2, size, size);
      continue;
    }

    const sx = inner[0] - outer[0];
    const sy = inner[1] - outer[1];
    const lengthSquared = sx * sx + sy * sy;
    const scaleCos = (dx * sx + dy * sy) / lengthSquared;
    const scaleSin = (dy * sx - dx * sy) / lengthSquared;
    ctx.save();
    ctx.translate(x, y);
    ctx.transform(scaleCos, scaleSin, -scaleSin, scaleCos, 0, 0);
    ctx.translate(-outer[0], -outer[1]);

    for (const guide of guides) {
      let left = side * 195;
      let span = 195;
      if (guide === 'animation1' || guide === 'animation2') {
        const [start, end] = animationBounds[guide][side];
        left = start;
        span = (end - start) * Math.min(1, elapsed / 900);
      }

      ctx.save();
      ctx.beginPath();
      ctx.rect(left, 0, span, 844);
      ctx.clip();
      ctx.drawImage(images[guide], -29.016, 135.04, 452.205, 613.841);
      ctx.restore();
    }
    ctx.restore();
  }
}
