import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import simdLoader from '../../../node_modules/@mediapipe/tasks-vision/wasm/vision_wasm_internal.js?url';
import simdBinary from '../../../node_modules/@mediapipe/tasks-vision/wasm/vision_wasm_internal.wasm?url';
import basicLoader from '../../../node_modules/@mediapipe/tasks-vision/wasm/vision_wasm_nosimd_internal.js?url';
import basicBinary from '../../../node_modules/@mediapipe/tasks-vision/wasm/vision_wasm_nosimd_internal.wasm?url';

export async function createFaceTracker() {
  const simd = await FilesetResolver.isSimdSupported();
  return FaceLandmarker.createFromOptions(
    {
      wasmLoaderPath: simd ? simdLoader : basicLoader,
      wasmBinaryPath: simd ? simdBinary : basicBinary,
    },
    {
      baseOptions: { modelAssetPath: `${import.meta.env.BASE_URL}face-landmarker.task` },
      runningMode: 'VIDEO',
      numFaces: 1,
    },
  );
}
