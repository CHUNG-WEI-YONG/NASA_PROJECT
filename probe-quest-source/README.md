# Orbit Cadet: Probe Quest

A friendly, cube-built 3D game for primary-school space explorers. Visit the Moon and Mars, scan mission records, discover the science behind NASA hardware, and spend earned points on equipment.

## Relationship to the supplied project

This game adapts the `game.js`, `index.html`, `styles.css` and README included in the supplied NASA Word document. It retains its 30 grouped mission records, Moon/Mars gravity, scanning economy, upgrades, and fictional hazards. The original canvas renderer is replaced by real 3D rendering in React Three Fiber.

The 30 entries include mission series, paired spacecraft, historical attempts and instruments. They are the catalog from the supplied document, **not a claim to cover every NASA mission ever launched**. The catalog can be expanded in `src/game/catalog.ts`.

The intended repository is `https://github.com/CHUNG-WEI-YONG/NASA_PROJECT`. The user chose downloadable files for manual upload. No source has been pushed by the agent. A GitHub repository stores the game's source; GitHub Pages can host the built game. Neither is a runtime game server.

## Play

- Move: WASD or arrow keys; on-screen movement controls are also available.
- Jump: Space.
- Scan nearby hardware, relay or archive beacon: E.
- Clear nearby fictional alien drones: F.
- Read the mission brief for the in-game controls.

Press E at a station to pause gameplay and open one question with four answer choices and one correct answer. A correct answer collects the record and awards **100 points**, once. A wrong answer awards nothing and locks only that station for **60 real-world seconds**. Play resumes so the player can explore other stations. A countdown shows when to return. Closing an unanswered question does not award progress or apply a penalty. Cooldowns persist across reloads in the same browser and continue while the game is paused.

Existing discoveries are retained; already-collected records do not award points again. Browser saves are local, not tamper-proof competitive scores.

Speed upgrades cost **200 points** and have three levels. Shields cost **100 points** and absorb one hit. A power boost costs **150 points**, increases speed and protects against hazards for **18 seconds**.

Moon gravity is **1.62 m/s²** and Mars gravity is **3.71 m/s²**. Terrain and jump dimensions are scaled for play. Losing all health returns the player to base with their discoveries and points intact.

Progress is saved in this browser's local storage. It does not sync across devices or domains. Switching from a preview address to a GitHub Pages address starts a separate browser save.

## Develop locally

From the repository root:

```sh
pnpm install
PORT=5173 BASE_PATH=/ pnpm --filter @workspace/probe-quest run dev
```

The game is frontend-only: no database, authentication, NASA API key, or running API server is needed.

## Build

```sh
PORT=5173 BASE_PATH=/ NODE_ENV=production pnpm --filter @workspace/probe-quest run build
```

Output: `artifacts/probe-quest/dist/public`.

For hosting at a repository subpath, set `BASE_PATH=/your-repository-name/` instead. Keep the whole pnpm workspace when transferring source, including the lockfile, root configuration, `lib/` packages, and this artifact. Do not copy only the old three files into this new build.

## GitHub Pages

The root `.github/workflows/probe-quest-pages.yml` provides a **manual** publishing workflow. It does not publish anything until someone explicitly runs it.

1. Review and push the workspace source into the chosen GitHub repository.
2. In the repository's **Settings → Pages**, choose **GitHub Actions** as the source.
3. Open **Actions → Publish Probe Quest to GitHub Pages → Run workflow**.
4. Open the URL provided by the completed workflow.

The workflow derives the correct base path from GitHub Pages configuration, including project repositories. If the repository already contains an app, integrate the files in a separate branch and review conflicts before merging; do not overwrite existing work.

## Science and fiction

Surface hardware is represented by simplified models. Orbital spacecraft records are scanned through ground relays. Flybys, impactors and unsuccessful missions use historical archive beacons; they are not presented as intact spacecraft on the surface. Some grouped records include craft with different fates (for example InSight and MarCO). Descriptions explain the difference.

Alien drones are fictional game challenges, not evidence of life on either world. Landscapes, distances, equipment placements, and orbital paths are illustrative. This is an independent educational project, not a NASA product.

NASA references:

- Supplied hackathon `Resources` Word document: directly used for questions on Apollo lunar modules, lunar rovers, ALSEP, Surveyor, Sojourner, Spirit/Opportunity, Viking, Phoenix, InSight, and Ingenuity.
- [NASA Space Science Data Coordinated Archive (NSSDCA)](https://nssdc.gsfc.nasa.gov/nmc/) — the official catalog named by the hackathon resource sheet, linked in the game for further exploration. This build uses a curated question bank, not a live NSSDCA data feed.
- [Moon mission catalog](https://science.nasa.gov/moon/missions/)
- [Mars Exploration Program](https://science.nasa.gov/planetary-science/programs/mars-exploration/)

The resource sheet also names Dawn, NEAR Shoemaker, Pioneer 10/11 and Kepler. They are not Moon/Mars surface hardware, so they have not been incorrectly placed in either level. The full source list is in `src/game/quizzes.ts`. Additional questions use the original mission guide's educational facts.
