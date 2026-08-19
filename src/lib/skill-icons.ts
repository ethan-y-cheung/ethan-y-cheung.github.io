/**
 * Brand icon + color for each skill chip on the Skills page.
 *
 * Paths come from `simple-icons` (24×24 viewBox, single fill path) so marks are
 * pixel-accurate; the few brands the library dropped (AWS, OpenAI, Playwright,
 * DSPy, Langfuse) get hand-drawn stand-in glyphs in the same format.
 *
 * Colors are the official brand hex, auto-darkened when too light to read on
 * the cream paper the book pages are printed on.
 */

import {
  siClaude,
  siCplusplus,
  siCursor,
  siDocker,
  siExpress,
  siFastapi,
  siFastify,
  siFigma,
  siFirebase,
  siGit,
  siGnubash,
  siGoogle,
  siGooglegemini,
  siHtml5,
  siHuggingface,
  siJavascript,
  siJira,
  siModelcontextprotocol,
  siNextdotjs,
  siNodedotjs,
  siNotion,
  siNumpy,
  siOpenjdk,
  siPandas,
  siPostgresql,
  siPython,
  siPytorch,
  siReact,
  siScikitlearn,
  siSpringboot,
  siSupabase,
  siTypescript,
  siVercel,
} from "simple-icons";

export type SkillIcon = { path: string; hex: string };

/** Darken colors that would wash out on the cream page (JS yellow, React cyan…). */
function legible(hex: string): string {
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  if (luminance <= 0.62) return `#${hex}`;
  const k = 0.55;
  const to2 = (v: number) => Math.round(v * k).toString(16).padStart(2, "0");
  return `#${to2(r)}${to2(g)}${to2(b)}`;
}

function brand(icon: { path: string; hex: string }): SkillIcon {
  return { path: icon.path, hex: legible(icon.hex) };
}

function custom(path: string, hex: string): SkillIcon {
  return { path, hex: legible(hex.slice(1)) };
}

/* Stand-in glyphs for brands simple-icons no longer ships. */
const GLYPH = {
  cloud: "M18.4 9.1a6.5 6.5 0 0 0-12.7-.9A4.5 4.5 0 0 0 6.5 17H18a4 4 0 0 0 .4-7.9z",
  sparkle:
    "M11 2l1.7 5.3L18 9l-5.3 1.7L11 16l-1.7-5.3L4 9l5.3-1.7zM18.5 14l1 3 3 1-3 1-1 3-1-3-3-1 3-1z",
  flask: "M15 4V2H9v2h1v5.3L4.6 18a2 2 0 0 0 1.7 3h11.4a2 2 0 0 0 1.7-3L14 9.3V4h1z",
  terminal: "M4.4 5L3 6.4 8.6 12 3 17.6 4.4 19l7-7-7-7zM12 19h9v-2h-9v2z",
  database:
    "M12 2C7.6 2 4 3.3 4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5c0-1.7-3.6-3-8-3zm6 17c-.2.6-2.6 1.6-6 1.6S6.2 19.6 6 19v-3.2c1.5.8 3.7 1.2 6 1.2s4.5-.4 6-1.2V19zm0-5.5c-.2.6-2.6 1.6-6 1.6s-5.8-1-6-1.6v-3.2c1.5.8 3.7 1.2 6 1.2s4.5-.4 6-1.2v3.2zM12 9.5c-3.4 0-5.8-1-6-1.6V5c.2-.6 2.6-1.6 6-1.6s5.8 1 6 1.6v3c-.2.6-2.6 1.6-6 1.6z",
  plug: "M16 7V3h-2v4h-4V3H8v4H6v6a6 6 0 0 0 5 5.9V22h2v-3.1A6 6 0 0 0 18 13V7h-2zm0 6a4 4 0 0 1-8 0V9h8v4z",
  bars: "M4 20v-8h3.5v8H4zm6.25 0V4h3.5v16h-3.5zM16.5 20v-11H20v11h-3.5z",
} as const;

export const SKILL_ICONS: Record<string, SkillIcon> = {
  // Languages
  TypeScript: brand(siTypescript),
  JavaScript: brand(siJavascript),
  Python: brand(siPython),
  Java: custom(siOpenjdk.path, "#437291"),
  "C++": brand(siCplusplus),
  Bash: brand(siGnubash),
  SQL: custom(GLYPH.database, "#4479A1"),
  "HTML/CSS": brand(siHtml5),
  // Frameworks
  React: brand(siReact),
  Node: brand(siNodedotjs),
  Next: brand(siNextdotjs),
  Fastify: brand(siFastify),
  Express: brand(siExpress),
  FastAPI: brand(siFastapi),
  Playwright: custom(GLYPH.flask, "#2EAD33"),
  "Spring Boot": brand(siSpringboot),
  // Cloud & DB
  Supabase: brand(siSupabase),
  AWS: custom(GLYPH.cloud, "#FF9900"),
  Vercel: brand(siVercel),
  Firebase: brand(siFirebase),
  Docker: brand(siDocker),
  "REST API": custom(GLYPH.plug, "#0F766E"),
  // Tools
  Git: brand(siGit),
  Figma: brand(siFigma),
  Jira: brand(siJira),
  Notion: brand(siNotion),
  Cursor: brand(siCursor),
  "Claude Code": brand(siClaude),
  Codex: custom(GLYPH.terminal, "#10A37F"),
  // AI & ML
  "Gemini API": brand(siGooglegemini),
  "OpenAI API": custom(GLYPH.sparkle, "#10A37F"),
  PyTorch: brand(siPytorch),
  Transformers: brand(siHuggingface),
  "scikit-learn": brand(siScikitlearn),
  pandas: brand(siPandas),
  NumPy: brand(siNumpy),
  DSPy: custom(GLYPH.sparkle, "#8C1515"),
  pgvector: brand(siPostgresql),
  BERT: brand(siGoogle),
  MCP: brand(siModelcontextprotocol),
  Langfuse: custom(GLYPH.bars, "#C2410C"),
};
