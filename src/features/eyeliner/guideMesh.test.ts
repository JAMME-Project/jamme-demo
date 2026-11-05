import { describe, expect, it } from 'vitest';
import type { NormalizedLandmark } from '@mediapipe/tasks-vision';
import mesh from './guideMesh.data.json';
import { projectGuideVertices, triangleTransform } from './guideMesh';

describe('face guide mesh', () => {
  it('anchors the eyelid, brow, and nose independently in the mirrored preview', () => {
    const face: NormalizedLandmark[] = Array.from({ length: 468 }, () => ({
      x: 0.5,
      y: 0.5,
      z: 0,
      visibility: 1,
    }));
    face[386] = { x: 0.72, y: 0.31, z: 0, visibility: 1 };
    face[300] = { x: 0.8, y: 0.21, z: 0, visibility: 1 };
    face[327] = { x: 0.6, y: 0.59, z: 0, visibility: 1 };
    const points = projectGuideVertices(face, 640, 480);

    for (const index of [386, 300, 327]) {
      const vertex = mesh.vertices.findIndex(
        ({ anchors }) => anchors.length === 1 && anchors[0].index === index,
      );
      expect(vertex).toBeGreaterThanOrEqual(0);
      expect(points[vertex].x).toBeCloseTo((1 - face[index].x) * 640);
      expect(points[vertex].y).toBeCloseTo(face[index].y * 480);
    }

    face[386].y += 0.06;
    const next = projectGuideVertices(face, 640, 480);
    const eyelid = mesh.vertices.findIndex(
      ({ anchors }) => anchors.length === 1 && anchors[0].index === 386,
    );
    expect(next[eyelid].y - points[eyelid].y).toBeCloseTo(28.8);
    const brow = mesh.vertices.findIndex(
      ({ anchors }) => anchors.length === 1 && anchors[0].index === 300,
    );
    expect(next[brow]).toEqual(points[brow]);
  });

  it('maps all three triangle corners under rotation and unequal horizontal and vertical scaling', () => {
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
  });

  it('omits collapsed and folded regions instead of drawing a stretched patch', () => {
    const source = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 0, y: 10 },
    ];
    expect(triangleTransform(source, [source[0], source[1], source[1]])).toBeNull();
    expect(triangleTransform(source, [source[0], source[2], source[1]])).toBeNull();
  });

  it('keeps every artwork patch valid and every projected vertex tied to facial landmarks', () => {
    for (const { anchors } of mesh.vertices) {
      expect(anchors.reduce((sum, anchor) => sum + anchor.weight, 0)).toBeCloseTo(1);
      expect(anchors.every(({ index }) => index >= 0 && index < 468)).toBe(true);
    }
    for (const patches of Object.values(mesh.guides)) {
      expect(patches.length).toBeGreaterThan(0);
      for (const patch of patches) {
        const source = mesh.triangles[patch].map((index) => mesh.vertices[index]);
        expect(triangleTransform(source, source)).not.toBeNull();
      }
    }
  });
});
