import artwork from './eyelidArtwork.data.json';
import {
  firstDotFraction,
  secondDotFraction,
  sampleUpperLid,
  type GuideEye,
  type Point,
} from './guideMesh';
import type { LensKey } from './lesson';

export const eyelidRibbons = artwork.map((eye) => {
  const vertices = eye.samples.flatMap(({ x }) => [
    { x, y: eye.top },
    { x, y: eye.bottom },
  ]);
  const triangles = eye.samples.slice(1).flatMap((_, i) => [
    [i * 2, i * 2 + 2, i * 2 + 1],
    [i * 2 + 1, i * 2 + 2, i * 2 + 3],
  ]);
  const patches = triangles.map((indices) => {
    const points = indices.map((index) => vertices[index]);
    const left = Math.floor(Math.min(...points.map((p) => p.x))) - 1;
    const right = Math.ceil(Math.max(...points.map((p) => p.x))) + 1;
    return {
      indices,
      points,
      left,
      top: eye.top,
      width: right - left,
      height: eye.bottom - eye.top,
    };
  });
  return { ...eye, patches };
});

export function activeRibbonPatches(side: number, guides: readonly LensKey[]) {
  const ribbon = eyelidRibbons[side];
  const ranges = guides.filter((guide) => guide !== 'eye2').map((guide) => ribbon.ranges[guide]);
  const left = Math.min(...ranges.map((range) => range[0]));
  const right = Math.max(...ranges.map((range) => range[1]));
  return ribbon.patches.filter((patch) => patch.left < right && patch.left + patch.width > left);
}

export function projectEyelidRibbon(eye: GuideEye, side: number): Point[] {
  const ribbon = eyelidRibbons[side];
  const scale = eye.width / Math.abs(ribbon.inner - (2 * ribbon.first.x - ribbon.second.x));
  return ribbon.samples.flatMap((sample) => {
    const wingAmount = (sample.x - ribbon.tail.x) / (ribbon.first.x - ribbon.tail.x);
    let center: Point;
    if (wingAmount < 1) {
      center = {
        x: eye.tail.x + (eye.first.x - eye.tail.x) * wingAmount,
        y: eye.tail.y + (eye.first.y - eye.tail.y) * wingAmount,
      };
    } else {
      const beforeSecond = (sample.x - ribbon.first.x) / (ribbon.second.x - ribbon.first.x);
      const fraction =
        beforeSecond < 1
          ? firstDotFraction + (secondDotFraction - firstDotFraction) * beforeSecond
          : secondDotFraction +
            ((1 - secondDotFraction) * (sample.x - ribbon.second.x)) /
              (ribbon.inner - ribbon.second.x);
      center = sampleUpperLid(eye.upper, fraction);
    }
    return [ribbon.top, ribbon.bottom].map((y) => {
      const offset = (y - sample.y) * scale;
      return { x: center.x + eye.down.x * offset, y: center.y + eye.down.y * offset };
    });
  });
}
