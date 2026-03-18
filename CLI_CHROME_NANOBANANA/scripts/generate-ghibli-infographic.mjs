import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const ENV_PATH = path.join(ROOT, ".env");

function parseArgs(argv) {
  const out = {
    input: path.join(
      ROOT,
      "files",
      "nietzsche-ui-mal-summary-middle-school.md"
    ),
    output: "infographic.png",
    title: "니체의 말 — 중학생도 이해하는 요약",
    style: "ghibli",
    model: "gemini-3-pro-image-preview",
    width: 1200,
    height: 800,
    lang: "Korean",
  };

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === "--input" || arg === "-i") out.input = next;
    if (arg === "--output" || arg === "-o") out.output = next;
    if (arg === "--title") out.title = next;
    if (arg === "--style") out.style = next;
    if (arg === "--model") out.model = next;
    if (arg === "--width") out.width = Number(next);
    if (arg === "--height") out.height = Number(next);
    if (arg === "--lang") out.lang = next;
  }

  return out;
}

function parseEnv(text) {
  const out = {};
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

const options = parseArgs(process.argv);

let envText = "";
try {
  envText = await fs.readFile(ENV_PATH, "utf8");
} catch {
  // ignore; we'll error below if key is missing
}
const env = parseEnv(envText);
const apiKey = env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("GEMINI_API_KEY is not set. Add it to .env first.");
  process.exit(1);
}

const summary = await fs.readFile(options.input, "utf8");
const inputBase = path.basename(options.input, path.extname(options.input));
const styleTag = options.style ? `-${options.style}` : "";
const folderName = `${inputBase}${styleTag}`;
const inputSnapshotDir = path.join(ROOT, "files", folderName);
const inputSnapshotName = path.basename(options.input);
await fs.mkdir(inputSnapshotDir, { recursive: true });
await fs.writeFile(path.join(inputSnapshotDir, inputSnapshotName), summary);

const sizeText = `${options.width}x${options.height} PNG`;
const styleText =
  options.style === "ghibli"
    ? "Ghibli-inspired, warm, hand-painted look with gentle gradients and soft textures."
    : options.style;

const prompt = `
You are a visual designer. Create an infographic for middle-school students.
Language: ${options.lang}.
Theme: "${options.title}".
Use the summary below as the only content source.

Design requirements:
- ${sizeText}
- 4 main cards with short bullets
- ${styleText}
- Nature motifs are fine but keep the layout clean
- Large title, clear hierarchy, generous spacing
- Avoid dense text; use short sentences
- Output should be a single infographic image (no extra borders)

Summary content:
${summary}
`.trim();

const endpoint =
  `https://generativelanguage.googleapis.com/v1beta/models/${options.model}:generateContent`;

const body = {
  contents: [
    {
      role: "user",
      parts: [{ text: prompt }],
    },
  ],
};

let response;
try {
  response = await fetch(`${endpoint}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
} catch (err) {
  console.error("Network request failed.");
  console.error(err?.message || err);
  process.exit(1);
}

if (!response.ok) {
  const errText = await response.text();
  console.error(`API error: ${response.status}`);
  console.error(errText);
  process.exit(1);
}

const json = await response.json();
const parts = json?.candidates?.[0]?.content?.parts || [];
const imagePart = parts.find(
  (part) => part.inlineData?.data || part.inline_data?.data
);
const b64 = imagePart?.inlineData?.data || imagePart?.inline_data?.data;

if (!b64) {
  console.error("No image data returned from the model.");
  process.exit(1);
}

const outputDir = path.join(ROOT, "output", folderName);
const outputName = path.basename(options.output);
const finalOutputPath = path.join(outputDir, outputName);
await fs.mkdir(outputDir, { recursive: true });
const buffer = Buffer.from(b64, "base64");
await fs.writeFile(finalOutputPath, buffer);

console.log(`Saved: ${finalOutputPath}`);
