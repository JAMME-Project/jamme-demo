import type { ArStep } from './arStep';

export function supportsStep(step: ArStep): boolean {
  const p = step.lens.launch_params;
  return (
    p.template_id === 'BLUSH_APPLE' &&
    p.zone === 'blush' &&
    p.part === 'apply' &&
    p.guide_region === 'cheek_apple' &&
    step.guide.direction === 'tap' &&
    p.thickness === undefined &&
    p.finish === undefined &&
    p.tail_direction === undefined &&
    p.tail_length === undefined &&
    p.tail_angle_deg === undefined
  );
}
