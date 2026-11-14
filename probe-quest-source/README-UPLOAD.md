# Upload Probe Quest to NASA_PROJECT

Nothing has been pushed to GitHub automatically.

## Fastest option: ready-to-upload website ZIP

Use `probe-quest-github-pages.zip`. It contains the built game, not the editable TypeScript source.

1. Extract the ZIP on your computer.
2. Open https://github.com/CHUNG-WEI-YONG/NASA_PROJECT.
3. Create a new branch first if you want to preserve/review the current website before replacing it.
4. Use **Add file → Upload files**. Upload `index.html`, `favicon.svg`, and the entire `assets` folder to the repository root. Upload the extracted contents, not the ZIP and not an extra enclosing folder.
5. These files replace any existing root `index.html`. Review that replacement before committing. Old files such as `game.js` or `styles.css` are no longer used by the new index.
6. Merge your reviewed branch into `main` when ready.
7. Under **Settings → Pages**, select **Deploy from a branch**, `main`, and `/(root)`.
8. Open the website link GitHub Pages displays after deployment.

This built ZIP is configured specifically for the `/NASA_PROJECT/` URL path. Do not rename the repository without rebuilding from source with the new path. If you already use GitHub Actions to publish Pages, choose one publishing method rather than combining both.

Double-clicking the built index.html on your computer is not a supported preview: use an HTTP web server or GitHub Pages.

## Editable source option

Use `probe-quest-source.zip`. It contains the game source, shared workspace libraries, configuration and a manual GitHub Pages workflow. It excludes secrets, node_modules, editor history, and unrelated applications.

For this option, upload the entire extracted source structure rather than combining it with the built ZIP. Preserve the folders. Review conflicts with your existing repository before overwriting files.

If you want the editable code grouped in one folder alongside an already-built website, you may put the complete extracted source structure inside `probe-quest-source/`. Run the commands below from that folder. Its nested `.github/workflows` folder will not run automatically: GitHub only recognizes workflows in the repository's top-level `.github/workflows`, and the supplied workflow assumes source is at the repository root. For this grouped-source option, use the ready-built website for publishing, or adapt the workflow working directory before using it.

Keep compiled assets in the exact directories shown in the website ZIP. In particular, do not flatten files from `assets/` into the repository root. Moving the entire website into another folder requires rebuilding with that folder included in `BASE_PATH`.

Requirements: Node.js 24 and pnpm 10.

```sh
pnpm install
PORT=5173 BASE_PATH=/ pnpm --filter @workspace/probe-quest run dev
```

Build for your repository:

```sh
PORT=5173 BASE_PATH=/NASA_PROJECT/ NODE_ENV=production pnpm --filter @workspace/probe-quest run build
```

On Windows PowerShell:

```powershell
$env:PORT="5173"
$env:BASE_PATH="/NASA_PROJECT/"
$env:NODE_ENV="production"
pnpm --filter @workspace/probe-quest run build
```

Built files appear in `artifacts/probe-quest/dist/public`.

Alternatively, enable **GitHub Actions** under Settings → Pages, then run **Actions → Publish Probe Quest to GitHub Pages → Run workflow**. That workflow builds from source and handles the repository base path.

## What changed

- Space, terrain, character and hazard rendering have been overhauled while retaining the existing modular game architecture.
- See the game README for the relationship between `info.docx`, the existing modules and the unchanged educational rules.

- Each uncollected station pauses gameplay for one multiple-choice question.
- Exactly four choices, one correct answer.
- Correct answers award a record and 100 points once.
- Wrong answers award nothing and lock only that station for 60 real-world seconds.
- The countdown continues while paused or visiting other stations and is saved in this browser.
- Existing discoveries and upgrades are retained.
- Mission brief, quiz source labels and credits explain the supplied hackathon resources.

Question bank: `artifacts/probe-quest/src/game/quizzes.ts`.
Quiz UI: `artifacts/probe-quest/src/components/StationQuiz.tsx`.
Collection and retry flow: `artifacts/probe-quest/src/pages/Expedition.tsx`.

The game uses your supplied resource sheet and original mission guide, with links to NASA's NSSDCA catalog and NASA Science. It does not claim to fetch live NASA data or to be endorsed by NASA.
