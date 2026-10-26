# Theory Examer

A personal web app to learn the German driving theory exam (Führerschein, class B) in English, with spaced repetition and exam simulation. Runs fully in the browser — no account, no server.

## Features

- **Daily review** with FSRS spaced repetition: due reviews + 20 new questions per day (configurable). Wrong answers come back after 1–10 minutes; correct answers are rated Hard / Good / Easy.
- **Practice sets**: by theme or chapter, my mistakes, weak questions, high-point questions, flagged, random.
- **Exam simulation**: 30 questions (20 basic + 10 class), 45 min timer, real pass rules (≤ 10 error points, two wrong 5-point questions fail), video limit of 5 plays, result review.
- **Dashboard**: streak, accuracy, mastered questions, exam readiness estimate, 7-day forecast, activity heatmap, progress per theme.
- **Question catalogue** with search, filters, notes, flags, German text for every question, and per-question stats.
- Keyboard first (`A`/`B`/`C`, `Enter`, `1`–`3`, `F`, `G`, `?`), mobile friendly, dark mode, installable PWA with offline study.
- Progress is stored in IndexedDB in your browser. Export / import a backup file in **Settings → Data**.

## Develop

Requires [Bun](https://bun.sh).

```bash
bun install
bun run dev        # http://localhost:5173
bun test           # unit tests
bun run typecheck
bun run build      # production build in dist/
bun run preview    # serve the build
```

Refresh the question data (writes `public/data/*.json`):

```bash
bun run data
```

## Deploy to GitHub Pages

1. Push the repo to GitHub (branch `main`).
2. In the repo: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Every push to `main` runs `.github/workflows/deploy.yml` (tests, build, deploy). The app is then at `https://<user>.github.io/<repo>/`.

On a phone, open that URL and use **Add to Home Screen** to install it. Progress does not sync between devices; use backup export / import to move it.

## Notes

- The source data has no license-class field. Chapters that are clearly for trucks, buses or trailers are hidden by default; change this in **Settings → Topics**, or hide single questions from the question menu.
- Question images and videos load from the original hosts (Google Cloud Storage, with the GitHub copy as fallback). Seen images are cached for offline use; videos need a connection.

## Credits

Questions, answers and explanations: [yowmamasita/driving-theory](https://github.com/yowmamasita/driving-theory), scraped from [clickclickdrive.de](https://www.clickclickdrive.de/fragenkatalog/en). This project is for personal study only.
