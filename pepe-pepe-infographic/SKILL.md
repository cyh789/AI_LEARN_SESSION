---
name: pepe-pepe-infographic
description: Generate pepe-style infographic PNGs from book or content summaries using the local CLI. Use when a user asks to “페페로 시각화”, “pepe 시각화”, or requests a pepe-themed infographic output.
---

# Pepe Summary Infographic

## Overview
Create a short Markdown summary, then run the pepe infographic CLI to render a PNG. Keep text concise and student-friendly.

## Workflow
1. Write a Markdown summary file under `CLI_CHROME_NANOBANANA/files/<content-name>/`.
2. Run the pepe infographic CLI with the summary as input.
3. Save the PNG under `CLI_CHROME_NANOBANANA/output/<content-name>/`.

## Folder Rules
- Always create a new subfolder under `CLI_CHROME_NANOBANANA/files` or `CLI_CHROME_NANOBANANA/output` that matches the task.
- Folder names must be based on input/summary filename and style. No date-based names.
- All generated files must live inside that subfolder.

## CLI Command (Pepe)
Use the dedicated pepe script:

```powershell
.\.tools\node-v20.20.1-win-x64\node.exe --preserve-symlinks --preserve-symlinks-main scripts\generate-pepe-infographic.mjs --input files\<content-folder>\<summary>.md --output <output-name>.png --title "요약 제목" --style pepe --model gemini-3-pro-image-preview --width 1200 --height 800 --lang Korean
```

## Summary Template (Suggested)
```markdown
# 제목

## 한줄요약
한 문장으로 핵심 요약.

## 배경
핵심 배경/상황 요약.

## 주요 인물/개념
- 인물/개념 1
- 인물/개념 2

## 주요 흐름
1. 사건/전개 1
2. 사건/전개 2
3. 사건/전개 3

## 주제 키워드
키워드 4~6개.
```

## Notes
- Keep bullet points short to avoid dense text.
- Use the summary content as the only content source.
