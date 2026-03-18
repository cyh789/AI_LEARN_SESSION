# Infographic CLI

This workspace includes a small CLI script to generate a PNG infographic from a Markdown summary using the Gemini Image API (Nano Banana Pro model).

## Setup

1. Set your API key in `.env`:

```
GEMINI_API_KEY=your_api_key_here
```

2. Install Node.js (LTS recommended).

## Run (default)

```
.\.tools\node-v20.20.1-win-x64\node.exe --preserve-symlinks --preserve-symlinks-main scripts\generate-ghibli-infographic.mjs
```

Output:
- `output\infographic.png`

## Run with custom input/output

```
.\.tools\node-v20.20.1-win-x64\node.exe --preserve-symlinks --preserve-symlinks-main scripts\generate-ghibli-infographic.mjs ^
  --input files\some-book-summary.md ^
  --output output\some-book-infographic.png ^
  --title "어떤 책 요약" ^
  --style ghibli ^
  --model gemini-3-pro-image-preview ^
  --width 1200 ^
  --height 800 ^
  --lang Korean
```

## Options

- `--input`, `-i`: Path to the Markdown summary.
- `--output`, `-o`: Output PNG path.
- `--title`: Title shown in the infographic.
- `--style`: Visual style string (e.g., `ghibli`).
- `--model`: Gemini image model (default: `gemini-3-pro-image-preview`).
- `--width`: Image width in pixels.
- `--height`: Image height in pixels.
- `--lang`: Language label for the prompt (default: `Korean`).
