# AI 메이크업 튜터 — 에이전트 작업 가이드

## 목표와 현재 상태

- React + TypeScript 웹에서 Lens Studio 렌즈를 Camera Kit Web SDK로 실행한다.
- 향후 iOS·Android 앱 WebView에서 같은 웹을 사용하는 것이 목표다.
- Snap 계정 가입 완료. SDK 접근 권한, API 토큰, Lens ID·Lens Group ID 준비 여부는 별도로 확인한다.
- 참고 요구사항: `PRD_AI_Makeup_Tutor_MVP_v0.3.docx`의 M6 AR 따라 하기.
- 현재는 문서 기반 구현 가능성을 확인한 상태다. 실제 렌즈·WebView 동작은 검증 전이다.

## 이번 작업 범위

전체 MVP 구현보다 최소 AR 경로의 실행 검증을 우선한다. AI 분석·로그인·피드·결제·공유는 이번 범위에서 제외한다. 고정된 스텝 JSON으로 시험한다.

## 역할 분리

- React: 스텝 이동, 안내 문구, 강의 UI, 오류 처리.
- Camera Kit Web SDK: 카메라 입력, 렌즈 실행, Canvas 출력.
- Lens Studio 렌즈: 얼굴 추적, 영역별 효과, 얼굴에 붙는 점선 가이드.
- 서버(후속): 이미지 분석 결과를 검증된 프리셋·스텝 JSON으로 변환.

## 작업 순서

### 1. 프로젝트와 SDK 연결

- [ ] 기존 프로젝트가 있으면 구조를 확인하고 재사용한다. 없으면 React + TypeScript + Vite로 시작한다.
- [ ] `@snap/camera-kit`을 설치하고 SDK·Lens Studio 호환 버전을 기록한다.
- [ ] `.env.example`에 필요한 설정 이름만 작성한다. 실제 인증값을 커밋하거나 로그에 출력하지 않는다.
- [ ] SDK 접근 권한·토큰·렌즈 식별자를 확인한다. 없는 값은 추정하지 않는다.
- [ ] HTTPS 또는 SDK·카메라가 허용되는 개발 환경에서 실행한다.
- [ ] 카메라 권한 요청 → SDK 초기화 → 세션·카메라 연결 → 렌즈 적용을 구현한다.
- [ ] 권한 거부, 로딩 실패, 렌즈 실행 오류를 화면에 표시한다.
- [ ] 종료·화면 이탈 시 세션과 카메라 트랙을 정리한다.

### 2. 최소 렌즈 제작·연결

- [ ] Face Mask로 볼 영역에 단순한 색상을 표시한다.
- [ ] 색상·강도를 launch parameters로 받는다.
- [ ] 점선 가이드 텍스처를 제작하고 표시·숨김을 제어한다.
- [ ] 알 수 없는 template_id나 잘못된 값은 효과를 숨기고 안전하게 처리한다.
- [ ] 렌즈 등록 후 실제 Lens ID·Lens Group ID로 웹에 연결한다.

Lens Studio 편집·게시를 직접 수행할 수 없으면 필요한 수동 작업과 입력값을 구체적으로 남긴다. 수행하지 않은 작업을 완료로 표시하지 않는다.

### 3. 고정 스텝으로 검증

- [ ] 고정 JSON 3개로 이전·다음 이동을 구현한다.
- [ ] 스텝 전체는 React에서 보관하고 렌즈에는 launch_params만 전달한다.
- [ ] 단계 변경·가이드 토글 시 동일 렌즈를 새 값으로 재적용한다.
- [ ] 현재 단계의 목표 효과만 표시하고 이전 단계 효과를 가상으로 누적하지 않는다.
- [ ] 빠른 연속 클릭 시 오래된 적용 결과가 최신 단계를 덮지 않도록 처리한다.
- [ ] 모바일 Safari·Chrome에서 결과를 기록한다.

### 4. WebView 검증

- [ ] Capacitor 또는 React Native WebView 중 하나로 최소 앱 셸을 만든다.
- [ ] iOS·Android 카메라 권한과 WebView 권한 처리를 연결한다.
- [ ] 렌즈 실행, 화면 재진입, 백그라운드 복귀, 권한 거부 후 재시도를 확인한다.
- [ ] 강의 영상 재생·복귀와 10분 연속 사용을 확인한다.
- [ ] 기기·OS·브라우저/WebView·SDK 버전과 성공/실패를 기록한다.

웹 브라우저 성공만으로 WebView 지원 완료라고 판단하지 않는다.

### 5. 메이크업 확장 가능성 확인

- [ ] 2D Makeup Helper의 Camera Kit 실행 여부부터 확인한다.
- [ ] 립·블러셔·아이섀도·아이라인을 개별 시험한다.
- [ ] Helper 실패 시 Face Mask 대체 가능성과 추가 제작량을 기록한다.
- [ ] 눈꼬리 각도·길이, 쉐딩·하이라이터는 별도 검증 항목으로 둔다.

## 데이터·코드 설계

- AR 실행부는 React 화면과 분리한다. 추후 네이티브 SDK 구현으로 교체할 수 있게 한다.
- 초기 공통 인터페이스는 `start()`, `applyStep(step)`, `stop()` 정도로 작게 유지한다.
- launch parameters는 숫자·문자열·각 타입의 배열로 구성된 평평한 구조, 3KB 이하로 제한한다.
- guide_on은 0 또는 1로 전달한다. PRD의 launch_params와 SDK의 launchParams 객체를 어댑터에서 연결한다.
- zone·template_id·color_rgb 등을 보내는 것만으로 효과가 생기지 않는다. 렌즈 스크립트에서 직접 해석·반영해야 한다.
- SDK 실제 타입·예제를 확인하고 사용한다. 확인하지 않은 API·버전·지원 여부를 만들어내지 않는다.
- Remote API와 완성본 누적 미리보기는 초기 PoC에서 제외한다.

## 완료 기준

- 모바일 웹에서 최소 렌즈, 스텝 전환, 가이드 토글이 실제 동작한다.
- WebView는 iOS·Android 각각 별도 판정한다. 미시험은 미시험으로 남긴다.
- 초기 성능 목표: 30FPS, 단계 전환 후 0.5초 이내 반영, 10분 사용 중 중단 없음. 공식 보장치가 아닌 제안 기준이다.
- 얼굴 움직임·눈 깜빡임·얼굴 이탈 시 효과와 가이드 품질을 확인한다.
- 빌드·타입 검사 결과와 실기기 확인 결과를 구분해 보고한다.

## 산출물·보고

1. 최소 실행 프로젝트와 실행 방법.
2. `.env.example` 및 필요한 수동 설정 목록.
3. `docs/ar-contract.md`: 실제 전달 스키마와 샘플 3개.
4. `docs/feasibility.md`: 환경별 결과, 제한사항, 다음 판단.

각 작업 후 변경 내용, 실행한 검사, 실기기에서 확인한 내용, 미확인·차단 항목을 짧게 보고한다. WebView가 실패하면 React 일반 화면을 유지하고 앱 AR 화면만 Camera Kit 네이티브 SDK로 분리하는 대안을 검토한다.

## 공식 참고 문서

- Web SDK: https://developers.snap.com/camera-kit/integrate-sdk/web/web-configuration
- 호환 버전: https://developers.snap.com/camera-kit/ar-content/lens-studio-compatibility
- Launch Data: https://developers.snap.com/camera-kit/integrate-sdk/web/guides/remote-api
- Face Mask: https://developers.snap.com/lens-studio/features/ar-tracking/face/face-mask
- Makeup Helper: https://developers.snap.com/lens-studio/features/ar-tracking/face/face-templates/makeup

공식 문서는 구현 시 재확인한다. 이 가이드는 지원 플랫폼·실행 결과를 보장하는 문서가 아니다.
