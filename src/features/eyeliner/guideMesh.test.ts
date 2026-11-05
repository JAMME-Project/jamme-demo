import { describe, expect, it } from 'vitest';
import type { NormalizedLandmark } from '@mediapipe/tasks-vision';
import {
  firstDotFraction,
  getGuideEyes,
  sampleUpperLid,
  secondDotFraction,
  triangleTransform,
  type Point,
} from './guideMesh';
import { eyelidRibbons, projectEyelidRibbon } from './eyelidRibbon';

const width = 400;
const height = 600;

function makeFace() {
  const face: NormalizedLandmark[] = Array.from({ length: 468 }, () => ({
    x: 0.5,
    y: 0.5,
    z: 0,
    visibility: 1,
  }));
  const upper = [
    [70, 240],
    [73, 237],
    [79, 232],
    [90, 227],
    [110, 225],
    [129, 229],
    [140, 235],
    [147, 241],
    [150, 246],
  ];
  for (const [side, indices] of [
    [263, 466, 388, 387, 386, 385, 384, 398, 362],
    [33, 246, 161, 160, 159, 158, 157, 173, 133],
  ].entries()) {
    indices.forEach((index, i) => {
      const [x, y] = upper[i];
      face[index] = { x: 1 - (side ? width - x : x) / width, y: y / height, z: 0, visibility: 1 };
    });
  }
  for (const [index, x, y] of [
    [327, 150, 360],
    [300, 40, 180],
    [98, 250, 360],
    [70, 360, 180],
  ]) {
    face[index] = { x: 1 - x / width, y: y / height, z: 0, visibility: 1 };
  }
  return face;
}

describe('eyeliner placement', () => {
  it('places the two marks by upper-lid arc length, closer to the outer corner', () => {
    for (const eye of getGuideEyes(makeFace(), width, height)) {
      expect(eye.first).toEqual(sampleUpperLid(eye.upper, firstDotFraction));
      expect(eye.second).toEqual(sampleUpperLid(eye.upper, secondDotFraction));
      expect(firstDotFraction).toBeLessThan(0.25);
      expect(secondDotFraction).toBeLessThan(0.5);
    }
  });

  it('places both wing endpoints outside the eye and on the nose-to-brow guide', () => {
    for (const eye of getGuideEyes(makeFace(), width, height)) {
      const dx = eye.brow.x - eye.nose.x,
        dy = eye.brow.y - eye.nose.y;
      const cross = (eye.tail.x - eye.nose.x) * dy - (eye.tail.y - eye.nose.y) * dx;
      expect(cross).toBeCloseTo(0);
      const outward = {
        x: (eye.outer.x - eye.inner.x) / eye.width,
        y: (eye.outer.y - eye.inner.y) / eye.width,
      };
      const extension =
        ((eye.tail.x - eye.outer.x) * outward.x + (eye.tail.y - eye.outer.y) * outward.y) /
        eye.width;
      expect(extension).toBeGreaterThanOrEqual(0.079);
      expect(extension).toBeLessThanOrEqual(0.281);
    }
  });

  it('attaches the original endpoint artwork to that same intersection on both sides', () => {
    const eyes = getGuideEyes(makeFace(), width, height);
    for (const [side, eye] of eyes.entries()) {
      const ribbon = eyelidRibbons[side];
      const index = ribbon.samples.findIndex(
        (sample) => Math.abs(sample.x - ribbon.tail.x) < 0.001,
      );
      expect(index).toBeGreaterThanOrEqual(0);
      const vertices = projectEyelidRibbon(eye, side);
      const top = vertices[index * 2],
        bottom = vertices[index * 2 + 1];
      const fraction = (ribbon.tail.y - ribbon.top) / (ribbon.bottom - ribbon.top);
      expect(top.x + (bottom.x - top.x) * fraction).toBeCloseTo(eye.tail.x, 2);
      expect(top.y + (bottom.y - top.y) * fraction).toBeCloseTo(eye.tail.y, 2);
    }
  });

  it('preserves the attachment when the face rotates and changes scale', () => {
    const face = makeFace();
    const before = getGuideEyes(face, width, height);
    const angle = Math.PI / 12;
    const transform = (point: Point) => {
      const x = point.x - 200,
        y = point.y - 240;
      return {
        x: 200 + 1.1 * (x * Math.cos(angle) - y * Math.sin(angle)),
        y: 240 + 1.1 * (x * Math.sin(angle) + y * Math.cos(angle)),
      };
    };
    const rotated = face.map((point) => {
      const next = transform({ x: (1 - point.x) * width, y: point.y * height });
      return { ...point, x: 1 - next.x / width, y: next.y / height };
    });
    const after = getGuideEyes(rotated, width, height);
    for (const [i, eye] of after.entries()) {
      for (const key of ['first', 'second', 'tail'] as const) {
        const expected = transform(before[i][key]);
        expect(eye[key].x).toBeCloseTo(expected.x);
        expect(eye[key].y).toBeCloseTo(expected.y);
      }
    }
  });

  it('maps triangle corners under unequal scaling and omits folded regions', () => {
    const source = [
      { x: 2, y: 3 },
      { x: 12, y: 3 },
      { x: 2, y: 13 },
    ];
    const target = [
      { x: 20, y: 40 },
      { x: 40, y: 45 },
      { x: 18, y: 70 },
    ];
    const transform = triangleTransform(source, target);
    expect(transform).not.toBeNull();
    const [a, b, c, d, e, f] = transform!;
    source.forEach((point, index) => {
      expect(a * point.x + c * point.y + e).toBeCloseTo(target[index].x);
      expect(b * point.x + d * point.y + f).toBeCloseTo(target[index].y);
    });
    expect(triangleTransform(source, [source[0], source[1], source[1]])).toBeNull();
    expect(triangleTransform(source, [source[0], source[2], source[1]])).toBeNull();
  });
});
