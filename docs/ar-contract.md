# AR 스텝 데이터 계약안

상태: 웹 구현에 반영됨. PRD의 `ar-step/0.4`를 유지하며 첫 PoC에서 사용하는 부분을 정의한다. 실제 렌즈 전달은 미확인이다.

## 1. 앱이 보관하는 데이터

고정 JSON은 `ArStep[]`로 정한다. 추후 서버로 전환해도 같은 배열을 받는다. 각 요소는 `schema`, `step_no`, `total`, `sub_step`, `zone`, `title`, `lens`, `guide`, `ui`, `lecture`, `source`를 포함한다.

`step_no`는 1부터 연속하고 `total`은 배열 길이와 일치해야 한다. 빈 배열은 허용하지 않는다. 출처·설명·강도는 고정 데이터의 값을 표시하고 사용자가 각도나 강도를 바꾸는 기능은 두지 않는다.

앱 전체의 형식 검증과 현재 렌즈의 지원 여부 판정을 나눈다. 형식이 맞아도 미지원 템플릿이면 텍스트 안내로 전환한다. 잘못된 형식의 입력은 실행하지 않는다.

## 2. 렌즈에 전달하는 데이터

스텝 JSON 전체를 전달하지 않고 `lens.launch_params`만 SDK의 launch data로 변환한다. 설치한 SDK 1.22.0의 `LensLaunchData` 타입을 확인해 `CameraKitDriver`에서 `applyLens(lens, { launchParams: params })`로 전달하도록 구현했다. SDK API 형태 확인과 실제 렌즈 수신 성공을 구분한다.

| 키 | PoC에서 허용하는 값 |
| --- | --- |
| `zone` | `blush` |
| `part` | `apply` |
| `template_id` | `BLUSH_APPLE` |
| `color_rgb` | 0~255 정수 3개의 배열 |
| `intensity` | 유한한 수, 0~1 |
| `softness` | 유한한 수, 0~1 |
| `guide_on` | 숫자 0 또는 1 |
| `guide_region` | `cheek_apple` |

이 표는 최소 렌즈의 지원 범위이며 제품 전체 enum을 제한하지 않는다. 영역 추가 시 렌즈의 지원 목록과 함께 갱신한다.

- 값은 문자열·숫자·각 타입의 배열만 허용한다. boolean, null, 객체, 혼합 배열, NaN, Infinity는 거부한다.
- 초기 계약은 미정의 키도 거부한다. 템플릿과 zone·part·guide_region 조합을 검증한다.
- `new TextEncoder().encode(JSON.stringify(params)).byteLength <= 3000`을 앱의 보수적 상한으로 정한다. SDK 전달 직전 가이드 상태를 반영한 최종 객체로 측정한다. SDK 고유 인코딩 제한도 실제 전달로 확인한다.
- 가이드 스위치는 원본 JSON을 변경하지 않고 적용 시 복사본의 `guide_on`만 덮어쓴다. 단계 이동 후에도 스위치 상태를 유지한다.
- `lens.show_previous_steps`는 항상 `false`이다. 이전 효과를 렌즈 내부에 저장하지 않는다.
- guide의 region과 launch_params의 guide_region은 일치해야 한다. 방향·스타일은 템플릿의 고정 표현에 대응시키고 이번에는 추가 키로 전달하지 않는다.
- RGB는 0~255이며 렌즈 내부 색상 계산 시 0~1로 변환한다.

## 3. 고정 샘플 3개

구현용 시험값이며 AI 분석 결과나 전문가가 검수한 화장 안내가 아니다. 3단계에서는 색상도 변경해 강도 외 값의 재적용을 확인한다.

```json
[
  {
    "schema": "ar-step/0.4",
    "step_no": 1,
    "total": 3,
    "sub_step": "blush_apply_apple",
    "zone": "blush",
    "title": "볼 색상 옅게 표시",
    "lens": {
      "launch_params": {
        "zone": "blush",
        "part": "apply",
        "template_id": "BLUSH_APPLE",
        "color_rgb": [235, 140, 155],
        "intensity": 0.2,
        "softness": 0.3,
        "guide_on": 1,
        "guide_region": "cheek_apple"
      },
      "show_previous_steps": false
    },
    "guide": {"region": "cheek_apple", "direction": "tap", "style": "dashed"},
    "ui": {"tip": "볼의 색상과 점선 위치를 확인하세요.", "product_id": null, "product_hint": null},
    "lecture": null,
    "source": {"kind": "default", "confidence": "low", "evidence": "AR 전달값 검증용 고정 샘플", "color_swapped_from": null}
  },
  {
    "schema": "ar-step/0.4",
    "step_no": 2,
    "total": 3,
    "sub_step": "blush_apply_apple",
    "zone": "blush",
    "title": "볼 색상 진하게 표시",
    "lens": {
      "launch_params": {
        "zone": "blush",
        "part": "apply",
        "template_id": "BLUSH_APPLE",
        "color_rgb": [235, 140, 155],
        "intensity": 0.5,
        "softness": 0.3,
        "guide_on": 1,
        "guide_region": "cheek_apple"
      },
      "show_previous_steps": false
    },
    "guide": {"region": "cheek_apple", "direction": "tap", "style": "dashed"},
    "ui": {"tip": "이전 단계보다 색이 진해지는지 확인하세요.", "product_id": null, "product_hint": null},
    "lecture": null,
    "source": {"kind": "default", "confidence": "low", "evidence": "AR 전달값 검증용 고정 샘플", "color_swapped_from": null}
  },
  {
    "schema": "ar-step/0.4",
    "step_no": 3,
    "total": 3,
    "sub_step": "blush_apply_apple",
    "zone": "blush",
    "title": "색상과 경계 변경",
    "lens": {
      "launch_params": {
        "zone": "blush",
        "part": "apply",
        "template_id": "BLUSH_APPLE",
        "color_rgb": [245, 165, 120],
        "intensity": 0.35,
        "softness": 0.8,
        "guide_on": 1,
        "guide_region": "cheek_apple"
      },
      "show_previous_steps": false
    },
    "guide": {"region": "cheek_apple", "direction": "tap", "style": "dashed"},
    "ui": {"tip": "색상 변화와 부드러워진 경계를 확인하세요.", "product_id": null, "product_hint": null},
    "lecture": null,
    "source": {"kind": "default", "confidence": "low", "evidence": "AR 전달값 검증용 고정 샘플", "color_swapped_from": null}
  }
]
```

`source.confidence`는 원본 PRD 필드 유지를 위한 값이다. UI에서는 고정 시험 데이터임을 우선 표시하고 AI 판독 신뢰도처럼 설명하지 않는다.

## 4. 적용 결과와 실패 처리

프런트엔드는 렌즈 적용 요청이 완료됐다는 이유만으로 성공 처리하지 않는다. SDK의 성공 반환값과 현재 요청 번호를 확인하고 실행 중 렌즈 오류도 처리한다. 렌즈 내 입력 거부를 자동 확인할 응답 경로는 아직 없으므로 계약 검증과 실기기 화면 확인을 함께 사용한다.

부드러움·색상·강도·가이드의 실제 반영은 실기기 검증 항목이다. 샘플 JSON 검사나 데모 통과를 렌즈 지원 완료로 표시하지 않는다.
