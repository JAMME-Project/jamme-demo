import { describe, expect, it } from 'vitest';
import raw from '../data/pocSteps.json';
import { buildLaunchParams, stepsSchema } from './arStep';
import { supportsStep } from './lensCapabilities';
import { validateFlatLaunchParams } from './validateLaunchParams';

describe('step contract', () => {
  it('accepts all fixtures and changes only a copy for the guide override', () => {
    const steps = stepsSchema.parse(raw);
    expect(steps).toHaveLength(3);
    for (const step of steps) {
      expect(supportsStep(step)).toBe(true);
      expect(buildLaunchParams(step, false).guide_on).toBe(0);
      expect(step.lens.launch_params.guide_on).toBe(1);
    }
  });
  it.each([
    (s: typeof raw) => {
      s[0].step_no = 2;
    },
    (s: typeof raw) => {
      s[0].total = 4;
    },
    (s: typeof raw) => {
      s[0].lens.launch_params.intensity = 1.1;
    },
    (s: typeof raw) => {
      s[0].lens.launch_params.color_rgb = [256, 0, 0];
    },
    (s: typeof raw) => {
      s[0].guide.region = 'outer_corner';
    },
  ])('rejects broken order, counts, ranges and mismatched regions', (mutate) => {
    const copy = structuredClone(raw);
    mutate(copy);
    expect(stepsSchema.safeParse(copy).success).toBe(false);
  });
  it('treats a valid unknown template as unsupported rather than displaying the previous effect', () => {
    const copy = structuredClone(raw);
    copy[0].lens.launch_params.template_id = 'BLUSH_FUTURE';
    expect(supportsStep(stepsSchema.parse(copy)[0])).toBe(false);
  });
  it('rejects unknown launch keys', () => {
    const copy = structuredClone(raw);
    Object.assign(copy[0].lens.launch_params, { unexpected: 'value' });
    expect(stepsSchema.safeParse(copy).success).toBe(false);
  });
  it('measures UTF-8 bytes and enforces the 3000-byte boundary', () => {
    expect(validateFlatLaunchParams({ a: '가'.repeat(997) })).toBe(2999);
    expect(() => validateFlatLaunchParams({ a: '가'.repeat(998) })).toThrow('3KB');
    expect(validateFlatLaunchParams({ a: 'x'.repeat(2992) })).toBe(3000);
  });
  it.each([true, null, { nested: 'value' }, ['a', 1], [NaN], Infinity, []])(
    'rejects non-flat or invalid values: %j',
    (value) => {
      expect(() => validateFlatLaunchParams({ value })).toThrow();
    },
  );
});
