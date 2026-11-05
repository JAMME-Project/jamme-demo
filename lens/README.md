# 최소 볼 렌즈 제작과 연결

현재는 컨트롤러 스크립트와 제작용 텍스처 초안이다. Lens Studio 프로젝트 생성·재질 그래프 구성·얼굴 UV 보정·게시·실행 검증은 수행하지 않았다. 이 폴더만으로 실행 가능한 렌즈가 만들어지지는 않는다.

## 준비

1. Camera Kit Web SDK 접근 권한과 Web용 API 토큰을 준비한다.
2. 설치한 SDK는 `@snap/camera-kit` **1.22.0**이다. [공식 호환표](https://developers.snap.com/camera-kit/ar-content/lens-studio-compatibility)와 해당 버전의 배포 정보를 대조하고 사용할 Lens Studio 버전을 확인한다. 현재 표만으로 1.22.0의 대응 버전을 확정하지 않았다.
3. Lens Studio에서 빈 프로젝트를 만들고 얼굴 인덱스 0의 Face Mask 2개를 만든다. 하나는 볼 효과, 다른 하나는 점선 가이드다. 카메라 원본을 가리는 전체 화면 레이어를 넣지 않는다.

## 텍스처와 재질

`assets/cheek-field.svg`는 볼 영역의 중심이 흰색, 바깥이 검정인 거리 필드 초안이다. `assets/cheek-guide.svg`는 투명 배경의 점선 초안이다. 같은 이름의 PNG도 함께 제공한다. **좌표는 얼굴 UV에 맞춰 보정하기 전의 제작 시작점이다.** 공식 [Face Mask reference](https://developers.snap.com/lens-studio/features/ar-tracking/face/face-mask)를 기준으로 위치와 크기를 조정하고, 정면·회전한 얼굴에서 확인한다. 두 텍스처의 좌표를 함께 수정한다.

볼 Face Mask에는 다음 사용자 정의 파라미터를 가진 Unlit 투명 재질 그래프를 만든다. 이 이름은 앱 계약을 위해 정한 값으로, 기본 Face Mask 재질에 자동으로 존재하지 않는다.

| 파라미터 | 타입 | 동작 |
| --- | --- | --- |
| `makeupColor` | vec4 | RGB는 색, A는 intensity |
| `edgeSoftness` | float | 0~1 경계 부드러움 |
| 볼 거리 필드 텍스처 | texture | R 채널을 영역 값으로 샘플링 |

권장 그래프 계산은 다음과 같다. Material Editor의 노드로 구성하고 Transparent/Normal 블렌딩을 확인한다.

```text
field = texture(cheek-field, UV).r
edgeWidth = 0.02 + edgeSoftness * 0.75
alpha = smoothstep(0.0, edgeWidth, field) * makeupColor.a
output.rgb = makeupColor.rgb
output.a = alpha
```

softness가 달라질 때 경계만 부드러워지는지 확인한다. 필드 초안과 실제 Face Mask UV에 따라 크기·색상·경계를 조정해야 한다. 투명도만 변경하는 것으로 softness 구현을 대체하지 않는다. 이 계산은 미검증 시작점이며 실제 화장 품질을 보장하지 않는다.

가이드 Face Mask는 투명 PNG의 RGB와 알파를 표시하는 별도 재질을 사용하고 효과보다 위에 그린다. 부모 SceneObject를 끄는 대신 visual 컴포넌트만 켜고 꺼 추적 이벤트가 유지되게 한다.

## 스크립트 연결

1. `scripts/MakeupController.js`를 가져와 활성 SceneObject의 Script 컴포넌트에 연결한다.
2. `blush`, `guide` 입력에 각각 Face Mask 컴포넌트를 지정한다.
3. 선택 사항인 `faceHint`에는 “얼굴이 화면 중앙에 보이게 해 주세요”라는 화면 고정 Text를 연결한다. 얼굴 이탈 시 표시된다. 실제 표시 위치와 앱 UI 겹침은 확인한다.
4. `global.launchParams`에서 입력을 읽는다. SDK는 `{ launchParams: step.lens.launch_params }` 형태로 보낸다. 문자열·숫자·RGB 배열은 getter로 읽는다.
5. FaceFound/FaceLost 이벤트로 효과·가이드를 함께 숨기고 표시한다. 최초 시작과 렌즈 재적용 시 이미 얼굴이 보이는 경우에도 이벤트가 발생하는지 확인한다. 미발생 시 사용할 Lens Studio 버전에 맞는 초기 얼굴 상태 조회를 추가한다.
6. 기본 입력이 없거나 잘못된 템플릿이면 효과를 숨긴다. 미리보기용 fallback을 실제 배포 스크립트에 넣지 않았다. [Launch Data 안내](https://developers.snap.com/camera-kit/integrate-sdk/web/guides/remote-api#launch-data)를 참고해 **호스트 앱에서** 시험한다.

## 게시 후 연결

렌즈를 게시하고 Camera Kit용 Lens Group에 연결한다. 실제 ID를 `.env.local`에 넣는다. API 토큰, Lens ID, Lens Group ID의 정확한 출처와 배포 origin 설정은 Camera Kit 포털에서 확인한다. 값이 준비되면 웹의 “카메라로 시작” 버튼이 활성 경로가 된다.

`docs/ar-contract.md`의 세 샘플과 가이드 0/1을 모두 시험한다. 잘못된 template_id·RGB·강도·가이드 값에서 효과가 숨겨지는지, 스텝 전환 후 이전 상태가 남지 않는지 확인한다. 결과는 `docs/feasibility.md`에 기록한다.
