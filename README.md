# JAMME 메이크업 스튜디오

React·TypeScript·Vite 기반의 카메라 아이라인 강습이다. MediaPipe Face Landmarker로 브라우저 안에서 얼굴 위치를 추적해 카메라 화면에 단계별 가이드를 그린다.

## 실행

Node.js 22.12 이상을 사용한다. 현재 개발 환경은 Node 24.14.1, npm 11.11.0이다.

```sh
npm ci
npm run dev
```

브라우저에서 http://localhost:5173 에 접속해 초대 코드 `241108`을 입력한 뒤 **카메라로 시작**을 누른다. 카메라 권한을 허용하면 준비부터 결과 확인까지 12개 화면을 진행할 수 있다. 휴대폰에서 개발 서버에 접속할 때는 카메라 권한을 받을 수 있는 HTTPS 주소를 사용한다.

강습 가이드는 카메라 영상과 함께 로컬에서 그려진다. 0.5cm 안내에 대응하는 점 위치는 눈 랜드마크를 기준으로 표시한다. 공유받은 Snap 렌즈 ID는 소스의 단계별 매핑에 보관했다. 현재 설정된 Snap 그룹에는 해당 렌즈 10개가 없어, 강습은 MediaPipe 가이드로 실행한다. [MediaPipe Face Landmarker](https://developers.google.com/edge/mediapipe/solutions/vision/face_landmarker/web_js)

## 검증

```sh
npm run typecheck
npm test
npm run build
npm run test:e2e
```

브라우저 테스트는 설치된 Google Chrome을 사용한다. Chrome이 없으면 `npx playwright install chromium` 후 `playwright.config.ts`의 `channel: 'chrome'` 설정을 제거한다. 브라우저 테스트는 데스크톱과 모바일 화면 크기의 Chromium 시험이며 iOS Safari·Android Chrome·WebView 실기기 결과를 대체하지 않는다.

## 구조

- `src/features/eyeliner`: 카메라 강습, 얼굴 추적, 가이드 렌더링 및 렌즈 ID 매핑.
- `src/features/ar/domain`: 스텝 스키마, flat launch data, UTF-8 3000바이트 상한, 렌즈 지원 판정.
- `src/features/ar/runtime`, `lens/`: 기존 Camera Kit PoC와 Lens Studio 작업 자료.

## 문서

- [구현 설계](docs/implementation-plan.md)
- [AR 데이터 계약과 고정 샘플](docs/ar-contract.md)
- [검증 결과와 미확인 항목](docs/feasibility.md)

첫 PoC에서는 실제 영상이나 가짜 강의 시간을 넣지 않았다. 권한이 확인된 강의가 연결되기 전에는 빈 상태를 표시한다. 앱 셸·로그인·AI 분석·피드는 후속 범위다.
