# ZZAP // Tactical Ops

An original browser-based tactical FPS prototype built with React, TypeScript, Vite, Three.js, and React Three Fiber. The project uses procedural geometry and CSS operator artwork; it does not include third-party character or weapon assets.

## Run locally

```bash
npm install
npm run dev
```

Create a production build with `npm run build`; serve it with `npm run preview`. The included Vite setup is suitable for static hosting such as Vercel or Render.

## Current playable scope

- Operator selection and three simulation difficulty presets.
- First-person pointer-lock controls, mouse aiming, WASD movement, firing, hit detection, reload, sprint/crouch, and basic boundary/cover collision.
- Original procedural training yard, target bots, a compact HUD/minimap, settings, and a small weapon purchase panel.
- E ability and X ultimate inputs, with prototype effects tied to the selected operator.
- Five local AI targets with simple pursuit and difficulty-scaled firing; no online multiplayer or server networking.

This is a playable prototype, not a finished production FPS. Character art, weapon view model, bots, and map are procedural prototype geometry, and the AI, round/economy rules, sound, and animation are intentionally lightweight. The armory and systems should not be represented as feature-complete competitive gameplay.
