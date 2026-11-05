# AR PoC 검증 기록

기록일: 2026-10-31. 현재 판정: **데모·웹 코드 검증 완료, 실제 SDK의 렌즈 그룹 조회 성공, 얼굴 추적과 실기기 미검증**.

## 실제 SDK 연결 시도

사용자가 Camera Kit 활성화 완료와 Web Sample Lens Group 정보를 공유했다. 제공된 토큰과 그룹 ID를 Git에서 제외되는 `.env.local`에 저장했다. 토큰 원문은 문서·로그에 기록하지 않는다.

Chrome에서 `http://127.0.0.1:5173`을 열고 설치된 SDK 1.22.0의 `bootstrapCameraKit` 및 `lensRepository.loadLensGroups`를 호출했다. 카메라 권한은 요청하지 않았다.

- SDK 초기 설정 요청 `Metrics/GetInitializationConfig`: HTTP 401.
- 그룹 조회 요청 `Lenses/GetGroup`: HTTP 401. 렌즈 목록은 받지 못했다.
- Lens ID는 아직 설정하지 않았다. 사용자 포털에 표시된 21개 렌즈를 API로 확인한 상태는 아니다.
- 초기 결과만으로 정확한 원인을 단정하지 않았다. 이후 새 Web 토큰과 origin별 비교로 아래 결과를 확인했다.

### 새 Web 토큰과 origin 비교

- 새 토큰을 로컬 설정으로 교체했다. 시작 유효 시각은 지났으며, JWT 해독만으로 서명을 검증했다고 주장하지 않는다.
- `http://127.0.0.1:5173`: 브라우저 콘솔에서 CORS preflight 차단을 확인했다. SDK의 no-cors 재시도 요청에는 인증 헤더가 없었고 401이 반환됐다. 이 401을 새 토큰 자체의 무효로 해석하지 않는다.
- `http://localhost:5173`: 같은 토큰·그룹으로 `loadLensGroups`가 오류 없이 렌즈 **21개**를 반환했다. 실제 서비스 인증과 그룹 접근 성공을 확인했다.
- 초기 연결용으로 **Face Landmarks**, Lens ID `49414230875`를 선택했다. `VITE_CAMERA_KIT_LENS_MODE=sample`로 설정해 메이크업 값은 보내지 않고, 화면에서 샘플 얼굴 추적 테스트로 구분한다.
- 개발 서버는 기존 `127.0.0.1` 접속을 `localhost`로 리디렉션한다. 실제 배포 origin은 Snap의 Trusted Origins 설정을 별도로 확인해야 한다.
- localhost의 앱에서 `getUserMedia`를 시험용 Canvas 영상 스트림으로 대체해 시작 버튼을 눌렀다. 실제 SDK의 세션 생성·Face Landmarks 적용·재생이 완료되어 Canvas가 표시됐고 앱 오류는 없었다. 사용자 카메라는 요청하지 않았으며, 이 결과는 실제 얼굴 검출 성공을 의미하지 않는다.

## 구현된 내용

- React 19.3.1, TypeScript 7.0.2, Vite 8.3.5, Camera Kit Web 1.22.0. package-lock.json으로 고정.
- 볼 템플릿 1종을 대상으로 하는 고정 스텝 3개와 정적 일러스트 데모.
- SDK의 실제 설치 타입에 맞춘 `createSession({ liveRenderTarget })`, `cameraType: 'user'`, `applyLens(lens, { launchParams })` 사용. SDK는 실제 카메라 경로에서만 지연 로딩.
- 카메라·세션 정리, 초기화 취소, 직렬 렌즈 적용, 대기 요청 병합, 가이드 상태 보존, 실행 중 오류 처리.
- 모바일 반응형 화면, 권한·실행 오류 안내, 연결 강의 빈 상태, 개발용 JSON 확인·복사.
- Lens Studio용 입력·가이드·얼굴 이탈 처리 스크립트와 텍스처 초안. 재질·UV 보정·게시 미수행.

## 검증 구분

| 항목 | 환경과 결과 | 판정의 한계 |
| --- | --- | --- |
| 타입 검사·production 빌드 | macOS, Node 24.14.1·npm 11.11.0에서 성공 | 렌즈나 실기기 지원을 증명하지 않음 |
| 스키마·실행부·렌즈 로직 자동 시험 | 43개. 데이터 경계, 적용 순서, 취소·정리, SDK 오류, 샘플 파라미터 제외, 렌즈 입력·얼굴 이탈을 mock으로 검증 | SDK·Lens Studio mock이며 실제 네트워크·렌더러가 아님 |
| 브라우저 데모 | Chrome 156.0.8078.74에서 4개 통과. 1440px 데스크톱·390px 모바일 화면 크기의 단계 이동·가이드·완료·재시작·pagehide 복귀 | 모바일은 Chromium 에뮬레이션으로 iOS 기기가 아님 |
| production 데모 | 개발 확인 도구 제외, 데모 시작, 320px 가로 넘침 없음, 페이지 예외 없음 확인 | 실제 SDK·렌즈 경로는 실행하지 않음 |
| 데모 자원 사용 | 브라우저 테스트에서 getUserMedia 요청 및 Snap SDK 요청이 없음을 확인 | 폰트 요청은 별개이며 인터넷 없는 환경에서는 시스템 폰트 사용 |
| Lens Studio 스크립트 | 입력 검증·얼굴 발견·이탈·가이드 토글을 JS mock 환경에서 검증 | Lens Studio API 실행·재질 호환은 미시험 |
| Camera Kit 실제 그룹 조회 | localhost에서 새 Web 토큰으로 샘플 21개 조회 성공 | 렌즈 실행·얼굴 추적을 증명하지 않음 |
| Camera Kit 샘플 렌더링 | localhost의 실제 앱에서 합성 Canvas 스트림 → SDK 세션 → Face Landmarks 렌즈 적용·재생 성공 | 사용자 카메라·얼굴 검출은 미시험 |
| iOS Safari | 기기·OS·SDK·Lens Studio·렌즈 버전·origin 미기록 | 미시험 |
| Android Chrome | 기기·OS·SDK·Lens Studio·렌즈 버전·origin 미기록 | 미시험 |
| iOS·Android WebView | 앱 셸 미구현 | 미시험 |
| 강의 영상 복귀 | 권한이 확인된 영상 미연결 | 미시험 |
| 30FPS·0.5초 전환·10분 연속 사용 | 실제 렌즈 성능 데이터 없음 | 미측정 |

## 남은 선행 조건

1. Camera Kit Web SDK 접근 권한·실토큰과 origin 설정 확인.
2. SDK 1.22.0에 호환되는 Lens Studio 버전 확인. 공식 호환표의 마지막 행만으로 대응 버전을 추정하지 않는다.
3. `lens/README.md`에 따라 재질 그래프·볼 마스크·점선 UV를 맞춘 렌즈 제작과 게시, Lens Group 연결.
4. 실제 렌즈에서 재적용 시 launch data 수신, 얼굴 추적·초기 얼굴 발견 이벤트, 경계 softness, 점선 토글, 눈 깜빡임·얼굴 회전·이탈·복귀 확인.
5. iOS Safari·Android Chrome 시험 후 Capacitor 셸 추가 및 WebView 권한·origin·복귀 경로 검증.

얼굴 인식·저조도 상태를 앱으로 가져오는 경로는 미확인이다. 렌즈 스크립트에는 얼굴 이탈 시 표시할 Text 입력을 준비했지만 실제 렌즈에서 시험하지 않았다. 앱의 정적 얼굴 위치 안내는 실시간 감지 결과가 아니다.

## 빌드와 의존성 메모

SDK는 지연 로딩되지만 SDK 청크가 약 529KB로 Vite 기본 500KB 경고를 낸다. 오류가 아니며 데모 시작 시 해당 SDK 청크를 다운로드하지 않는다. 네트워크·최초 실행 시간은 실기기에서 별도로 측정한다.

초기 `npm audit`에서 Camera Kit의 전이 의존성 uuid에 대해 moderate 2개가 보고됐다. 직접 사용하는 SDK 1.22.0에는 npm의 자동 수정 경로가 없었으며, 검증 없이 전이 패키지의 major 버전을 강제 교체하지 않았다. SDK 업데이트 시 재확인한다.

## 실기기 기록 양식

실제 실행 후 아래 값을 채우고 플랫폼마다 별도 행을 추가한다. 시험하지 않은 항목은 성공으로 바꾸지 않는다.

| 일시 | 기기 | OS | 브라우저 또는 WebView | SDK | Lens Studio·렌즈 버전 | origin | 시나리오 | 결과·재현 절차 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| — | — | — | — | 1.22.0 | — | — | — | 미시험 |
