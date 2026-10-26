/**
 * Downloads the question catalogue (EN + DE) once and writes compact copies
 * to public/data/. Run with `bun run data`. The app never depends on GitHub
 * for question text at runtime; only media files are linked remotely.
 */
import type { Catalog, GermanText, Question } from "../src/lib/types";

const REPO = "https://raw.githubusercontent.com/yowmamasita/driving-theory/main";
const OUT = new URL("../public/data/", import.meta.url);

interface RawOption { letter: string; text: string }
interface RawQuestion {
  theme_number: string;
  theme_name: string;
  chapter_number: string;
  chapter_name: string;
  question_id: string;
  points: string;
  question_text: string;
  options: RawOption[];
  correct_answers: RawOption[];
  comment: string;
  image_urls: string[];
  local_image_paths: string[];
  video_urls: string[];
  local_video_paths: string[];
  url: string;
}

const letter = (l: string) => l.replace(/\.$/, "").trim();
const clean = (s: string) => s.replace(/\s+/g, " ").trim();

async function load(file: string): Promise<RawQuestion[]> {
  const res = await fetch(`${REPO}/${file}`);
  if (!res.ok) throw new Error(`${file}: HTTP ${res.status}`);
  return (await res.json()) as RawQuestion[];
}

const [en, de] = await Promise.all([
  load("driving_theory_questions.json"),
  load("driving_theory_questions_de.json"),
]);

const problems: string[] = [];
const themes = new Map<string, string>();
const chapters = new Map<string, { theme: string; name: string; count: number }>();

const questions: Question[] = en.map((r) => {
  const theme = r.theme_number.replace(/^Theme\s+/, "").replace(/\.$/, "");
  const chapter = r.chapter_number.replace(/\s+Chapter$/, "");
  themes.set(theme, clean(r.theme_name));
  const ch = chapters.get(chapter) ?? { theme, name: clean(r.chapter_name), count: 0 };
  ch.count++;
  chapters.set(chapter, ch);

  const numeric = r.options.length === 0;
  const correct = r.correct_answers.map((a) => letter(a.letter));
  if (numeric && (correct.length !== 1 || !/^\d+([.,]\d+)?$/.test(correct[0]!))) {
    problems.push(`${r.question_id}: odd numeric answer ${JSON.stringify(correct)}`);
  }
  if (!numeric) {
    const keys = new Set(r.options.map((o) => letter(o.letter)));
    for (const c of correct) if (!keys.has(c)) problems.push(`${r.question_id}: answer ${c} not in options`);
  }

  const media = (urls: string[], local: string[]) =>
    urls.map((u, i) => ({ src: u, alt: local[i] ? `${REPO}/${local[i]}` : u }));

  return {
    id: r.question_id,
    theme,
    chapter,
    points: Number.parseInt(r.points, 10),
    text: clean(r.question_text),
    options: r.options.map((o) => ({ key: letter(o.letter), text: clean(o.text) })),
    correct,
    comment: clean(r.comment ?? ""),
    images: media(r.image_urls, r.local_image_paths),
    videos: media(r.video_urls, r.local_video_paths),
    url: r.url,
  };
});

const german: Record<string, GermanText> = {};
const enById = new Map(questions.map((q) => [q.id, q]));
for (const r of de) {
  const q = enById.get(r.question_id);
  if (!q) {
    problems.push(`DE ${r.question_id}: no English question`);
    continue;
  }
  if (r.options.length !== q.options.length) {
    problems.push(`DE ${r.question_id}: option count differs`);
    continue;
  }
  german[q.id] = {
    text: clean(r.question_text),
    options: r.options.map((o) => clean(o.text)),
    comment: clean(r.comment ?? ""),
  };
}

const catalog: Catalog = {
  generatedAt: new Date().toISOString(),
  themes: [...themes].map(([id, name]) => ({ id, name })),
  chapters: [...chapters].map(([id, c]) => ({ id, ...c })),
  questions,
};

await Bun.write(new URL("questions.json", OUT), JSON.stringify(catalog));
await Bun.write(new URL("questions.de.json", OUT), JSON.stringify(german));

console.log(`questions: ${questions.length}, themes: ${themes.size}, chapters: ${chapters.size}`);
console.log(`german: ${Object.keys(german).length}`);
console.log(problems.length ? `problems (${problems.length}):\n  ${problems.join("\n  ")}` : "no problems");
