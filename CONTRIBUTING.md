# Contributing

Thanks for helping keep Nokintosh small and sharp.

## Scope

Nokintosh is a focused digicam-effect utility, not a photo editor. Pull
requests that add cropping, layers, text, stickers, filters unrelated to the
digicam look, or accounts/cloud features will be declined.

Good contributions:

- new presets (see [docs/presets.md](docs/presets.md))
- more convincing sensor / lens / compression simulation
- performance work on mobile GPUs
- accessibility and keyboard handling
- bug fixes

## Setup

```bash
npm install
npm run dev
```

## Code rules

- TypeScript everywhere, no `any` in public signatures.
- `src/engine/**` must not import React or any UI module.
- `src/ui/**` must not contain pixel processing.
- No gradients, no emoji, no modern "SaaS" styling in the interface.
- Keep the Windows 2000 visual language consistent across breakpoints.

## Before opening a PR

- `npm run build` passes.
- Preview and export produce the same look (check `u_scale` usage in shaders).
- Test on a phone if the change touches layout or performance.
