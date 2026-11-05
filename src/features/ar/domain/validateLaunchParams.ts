export const MAX_LAUNCH_BYTES = 3000;

export function validateFlatLaunchParams(value: unknown): number {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('전달값은 객체여야 합니다.');
  for (const item of Object.values(value)) {
    const scalar = (v: unknown) =>
      typeof v === 'string' || (typeof v === 'number' && Number.isFinite(v));
    if (Array.isArray(item)) {
      if (!item.length || !item.every(scalar) || !item.every((v) => typeof v === typeof item[0])) {
        throw new Error('전달 배열은 같은 타입의 문자열 또는 유한한 숫자로 구성해야 합니다.');
      }
    } else if (!scalar(item)) throw new Error('중첩 객체·불리언·null은 전달할 수 없습니다.');
  }
  const bytes = new TextEncoder().encode(JSON.stringify(value)).byteLength;
  if (bytes > MAX_LAUNCH_BYTES) throw new Error('렌즈 전달값이 3KB를 초과했습니다.');
  return bytes;
}
