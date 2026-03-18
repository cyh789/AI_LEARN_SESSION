## 이미지 생성 워크플로우

사용자가 “시각화”를 요청하면, 범용 인포그래픽 CLI 스크립트를 사용한다.

- 스크립트: `CLI_CHROME_NANOBANANA/scripts/generate-ghibli-infographic.mjs`

사용자가 “페페로 시각화”를 요청하면, 페페 전용 CLI 스크립트를 사용한다.

- 스크립트: `CLI_CHROME_NANOBANANA/scripts/generate-pepe-infographic.mjs`

이 워크스페이스에서는 항상 이 규칙을 따른다.

## files 및 output 폴더 규칙

`CLI_CHROME_NANOBANANA/files` 또는 `CLI_CHROME_NANOBANANA/output` 아래에 새 파일을 만들 때는 항상:

- 작업 내용과 연관된 이름의 새 하위 폴더를 만든다 (날짜 기반 이름 금지)
- 폴더 이름은 입력/요약 파일명과 스타일을 기반으로 한다 (예: `choyeok-nietzsche-mal-pepe`)
- 생성된 파일은 반드시 그 하위 폴더 안에 넣는다
