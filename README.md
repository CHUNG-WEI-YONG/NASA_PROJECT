# Orbit Cadet: Probe Quest

Explore the Moon and Mars in a browser game with a colorful, blocky 3D style. Scan NASA spacecraft records, build your field guide, and spend points on upgrades while dodging meteor showers and fictional alien drones.

## Play locally

Keep `index.html`, `styles.css`, and `game.js` together in the same folder. Open `index.html` in a modern browser. The game needs no installation or build step.

Choose **Moon** or **Mars**, then open **Mission brief** for the in-game tutorial. Click **Music off** to start the background music. The **Effects** button controls sound effects separately.

| Action | Keyboard or screen control |
| --- | --- |
| Move | WASD, arrow keys, or hold the on-screen arrows |
| Jump | Space or **Jump** |
| Scan | E or **Scan** |
| Clear a nearby drone | F or **Pulse** |

Follow the highlighted beacon. Move close to a surface device, violet orbital relay, or historical signal and scan it. Each new record earns **100 points**. Open the **Field guide** to read about a spacecraft and filter records by category.

## Levels and upgrades

- **Moon and Mars:** Both have low gravity. The Moon gives you more time in the air per jump.
- **Field guide:** Collect 30 records across both levels. Some records cover a mission series or several spacecraft.
- **Upgrade shop:** Speed costs 200 points, one shield costs 100 points, and an 18-second power boost costs 150 points.
- **Hazards:** Move out of marked impact zones before meteors hit. Use your pulse when a fictional drone comes within range.

The terrain, equipment models, and orbital paths are simplified for gameplay. Orbiter records are collected at ground relays. Other historical missions can be represented by archive beacons.

## Project files

| File | Purpose |
| --- | --- |
| `index.html` | Game page, menus, and mission brief |
| `styles.css` | Cockpit layout, colors, and responsive styles |
| `game.js` | Rendering, controls, physics, spacecraft records, hazards, upgrades, and audio |
| `README.md` | Play and publishing instructions |

## Publish on GitHub Pages

1. Upload the project files to the root of a GitHub repository.
2. In the repository, open **Settings → Pages**.
3. Select **Deploy from a branch**, then select **main** and **/(root)**.
4. Save and open the site URL shown in Pages after deployment.

## NASA references

- [NASA Moon mission catalog](https://science.nasa.gov/moon/missions/)
- [NASA Mars Exploration Program mission timeline](https://science.nasa.gov/planetary-science/programs/mars-exploration/)
