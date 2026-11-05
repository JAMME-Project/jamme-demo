import { z } from 'zod';
import { validateFlatLaunchParams } from './validateLaunchParams';

const unit = z.number().finite().min(0).max(1);
const zone = z.enum(['eyeshadow', 'eyeliner', 'shading', 'blush', 'highlighter', 'lip']);
export const launchParamsSchema = z
  .object({
    zone,
    part: z.enum(['apply', 'line', 'tail', 'blend', 'gloss']),
    template_id: z.string().min(1).max(100),
    color_rgb: z.tuple([
      z.number().int().min(0).max(255),
      z.number().int().min(0).max(255),
      z.number().int().min(0).max(255),
    ]),
    intensity: unit,
    softness: unit,
    guide_on: z.union([z.literal(0), z.literal(1)]),
    guide_region: z.string().min(1).max(80),
    thickness: z.enum(['thin', 'medium', 'thick']).optional(),
    finish: z.enum(['matte', 'satin', 'dewy', 'glossy']).optional(),
    tail_direction: z.enum(['up', 'straight', 'down']).optional(),
    tail_length: z.enum(['short', 'medium', 'long']).optional(),
    tail_angle_deg: z.number().finite().min(-15).max(40).optional(),
  })
  .strict()
  .superRefine((params, ctx) => {
    try {
      validateFlatLaunchParams(params);
    } catch {
      ctx.addIssue({
        code: 'custom',
        message: '렌즈 전달값의 타입 또는 크기가 올바르지 않습니다.',
      });
    }
  });

const stepSchema = z
  .object({
    schema: z.literal('ar-step/0.4'),
    step_no: z.number().int().positive(),
    total: z.number().int().positive(),
    sub_step: z.string().min(1).max(100),
    zone,
    title: z.string().min(1).max(120),
    lens: z
      .object({ launch_params: launchParamsSchema, show_previous_steps: z.literal(false) })
      .strict(),
    guide: z
      .object({
        region: z.string().min(1).max(80),
        direction: z.string().min(1).max(80),
        style: z.literal('dashed'),
      })
      .strict(),
    ui: z
      .object({
        tip: z.string().min(1).max(2000),
        product_id: z.string().nullable(),
        product_hint: z.string().nullable(),
      })
      .strict(),
    lecture: z
      .object({
        video_id: z.string().min(1),
        cue: z
          .object({ start_sec: z.number().nonnegative(), end_sec: z.number().positive() })
          .refine((cue) => cue.end_sec > cue.start_sec),
        chapter: z.string(),
        teacher_comment: z.string().nullable(),
      })
      .strict()
      .nullable(),
    source: z
      .object({
        kind: z.enum(['image', 'profile', 'default']),
        confidence: z.enum(['high', 'medium', 'low']),
        evidence: z.string(),
        color_swapped_from: z.string().nullable(),
      })
      .strict(),
  })
  .strict()
  .superRefine((step, ctx) => {
    if (
      step.zone !== step.lens.launch_params.zone ||
      step.guide.region !== step.lens.launch_params.guide_region
    ) {
      ctx.addIssue({ code: 'custom', message: '단계와 렌즈의 영역이 일치하지 않습니다.' });
    }
  });

export const stepsSchema = z
  .array(stepSchema)
  .min(1)
  .max(100)
  .superRefine((steps, ctx) => {
    steps.forEach((step, index) => {
      if (step.step_no !== index + 1 || step.total !== steps.length)
        ctx.addIssue({
          code: 'custom',
          path: [index, 'step_no'],
          message: '단계 순서 또는 전체 개수가 올바르지 않습니다.',
        });
    });
  });
export type ArStep = z.infer<typeof stepSchema>;
export type LaunchParams = z.infer<typeof launchParamsSchema>;

export function buildLaunchParams(step: ArStep, guideOn: boolean): LaunchParams {
  const params = launchParamsSchema.parse({
    ...step.lens.launch_params,
    guide_on: guideOn ? 1 : 0,
  });
  validateFlatLaunchParams(params);
  return params;
}
