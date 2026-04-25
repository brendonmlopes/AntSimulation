# Ant Colony Lab

Interactive browser ant colony simulation built with p5.js. It is static-only: no backend, no serverless functions, no build step required.

## Run

Serve the folder with any static server:

```sh
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.

You can also use:

```sh
npm run dev
```

## Controls

- Click and hold: spawn ants
- Space: pause/resume
- `r`: reset simulation
- `f`: add food at cursor
- `d`: toggle field-of-view debug overlay

The toolbar exposes the same actions, plus sound and sprite toggles.

## Deploy on Vercel

Use the project root as the Vercel root directory. No build command is needed. The included `vercel.json` serves this as a static site and adds basic security/cache headers.

## Notes

The simulation uses centered world coordinates: `(0, 0)` is the middle of the canvas. Ants search for food, carry it home, and drop pheromones while carrying. Sounds are generated with the Web Audio API after the user enables sound.
