const names = [
  'VITE_CAMERA_KIT_API_TOKEN',
  'VITE_CAMERA_KIT_LENS_ID',
  'VITE_CAMERA_KIT_LENS_GROUP_ID',
] as const;

export type CameraKitConfig = {
  apiToken: string;
  lensId: string;
  lensGroupId: string;
  sampleLens?: boolean;
};
export function readConfig(env: Record<string, unknown> = import.meta.env) {
  const values = names.map((name) => (typeof env[name] === 'string' ? env[name].trim() : ''));
  const missing = names.filter((_, index) => !values[index]);
  return {
    missing,
    config: missing.length
      ? null
      : ({
          apiToken: values[0],
          lensId: values[1],
          lensGroupId: values[2],
          sampleLens: env.VITE_CAMERA_KIT_LENS_MODE === 'sample',
        } satisfies CameraKitConfig),
  };
}
