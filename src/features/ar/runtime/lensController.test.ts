import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { describe, expect, it, vi } from 'vitest';
import raw from '../data/pocSteps.json';

const source = readFileSync(
  new URL('../../../../lens/scripts/MakeupController.js', import.meta.url),
  'utf8',
);
function run(params: Record<string, unknown>) {
  const handlers: Record<string, () => void> = {};
  const material = {
    mainPass: {},
    clone() {
      return { ...this, mainPass: {} };
    },
  };
  const script = {
    blush: { enabled: true, mainMaterial: material },
    guide: { enabled: true },
    faceHint: { enabled: false },
    createEvent: (name: string) => ({
      faceIndex: 0,
      bind: (fn: () => void) => {
        handlers[name] = fn;
      },
    }),
  };
  const store = {
    has: (key: string) => key in params,
    getString: (key: string) => params[key],
    getFloat: (key: string) => params[key],
    getFloatArray: (key: string) => params[key],
  };
  const print = vi.fn();
  vm.runInNewContext(source, {
    script,
    global: { launchParams: store },
    vec4: function (x: number, y: number, z: number, w: number) {
      return { x, y, z, w };
    },
    print,
  });
  handlers.OnStartEvent();
  return { script, handlers, print };
}
describe('lens controller input and face visibility in a simulated scripting environment', () => {
  it('keeps effects hidden until a face is found, and hides them again when lost', () => {
    const h = run(raw[0].lens.launch_params);
    expect(h.script.blush.enabled).toBe(false);
    expect(h.script.faceHint.enabled).toBe(true);
    h.handlers.FaceFoundEvent();
    expect(h.script.blush.enabled).toBe(true);
    expect(h.script.guide.enabled).toBe(true);
    expect(h.script.faceHint.enabled).toBe(false);
    h.handlers.FaceLostEvent();
    expect(h.script.blush.enabled).toBe(false);
    expect(h.script.guide.enabled).toBe(false);
  });
  it('allows effects while keeping a disabled guide hidden', () => {
    const h = run({ ...raw[0].lens.launch_params, guide_on: 0 });
    h.handlers.FaceFoundEvent();
    expect(h.script.blush.enabled).toBe(true);
    expect(h.script.guide.enabled).toBe(false);
  });
  it.each([
    { template_id: 'UNKNOWN' },
    { intensity: 2 },
    { color_rgb: [255, 256, 0] },
    { guide_on: true },
    { guide_region: 'outer_corner' },
    { softness: NaN },
  ])('hides all effects for invalid input %j', (override) => {
    const h = run({ ...raw[0].lens.launch_params, ...override });
    h.handlers.FaceFoundEvent();
    expect(h.script.blush.enabled).toBe(false);
    expect(h.script.guide.enabled).toBe(false);
    expect(h.print).toHaveBeenCalledTimes(1);
  });
});
