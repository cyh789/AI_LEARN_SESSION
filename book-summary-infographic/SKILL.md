---
name: book-summary-infographic
description: 책 내용을 요약하고 PNG 인포그래픽을 만드는 워크플로우. 책 요약을 요청하면서 시각화를 함께 요구하거나, 요약 내용을 이미지로 만들라고 요청할 때 사용.
---

# 책 요약 인포그래픽 스킬

## 작업 흐름

1. 요청된 책을 요약해서 `CLI_CHROME_NANOBANANA/files/<content-name>/` 아래에 Markdown 파일로 저장한다.
2. 사용자가 “시각화”를 요청하면 범용 인포그래픽 CLI를 사용한다.
   - `CLI_CHROME_NANOBANANA/scripts/generate-ghibli-infographic.mjs`
3. 사용자가 “페페로 시각화”를 요청하면 페페 전용 CLI를 사용한다.
   - `CLI_CHROME_NANOBANANA/scripts/generate-pepe-infographic.mjs`
4. 생성된 이미지는 항상 `CLI_CHROME_NANOBANANA/output/<content-name>/` 아래에 저장한다.

## 네이밍 규칙

- `files/`와 `output/` 아래에는 항상 작업 내용과 관련된 하위 폴더를 만든다.
- 폴더 이름은 입력/요약 파일명과 스타일을 기반으로 한다 (예: `choyeok-nietzsche-mal-pepe`).
- 날짜 기반 폴더명은 사용하지 않는다.

## CLI 사용 예시

범용:
```
.\.tools\node-v20.20.1-win-x64\node.exe --preserve-symlinks --preserve-symlinks-main scripts\generate-ghibli-infographic.mjs --input files\book\summary.md --output book-infographic.png --title "Book Summary" --style ghibli --model gemini-3-pro-image-preview --width 1200 --height 800 --lang Korean
```

페페:
```
.\.tools\node-v20.20.1-win-x64\node.exe --preserve-symlinks --preserve-symlinks-main scripts\generate-pepe-infographic.mjs --input files\book\summary.md --output book-pepe.png --title "Book Summary" --style pepe --model gemini-3-pro-image-preview --width 1200 --height 800 --lang Korean
```
