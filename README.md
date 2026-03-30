# Reaction Trainer

[![Deploy](https://github.com/wkyleg/reaction-trainer/actions/workflows/deploy.yml/badge.svg)](https://github.com/wkyleg/reaction-trainer/actions/workflows/deploy.yml)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue?logo=typescript)](tsconfig.json)

**[Play Now](https://wkyleg.github.io/reaction-trainer/)** | [Elata Biosciences](https://elata.bio) | [Elata SDK Docs](https://docs.elata.bio/sdk/overview)

A neural arcade that tests reaction speed while your biometrics shape the difficulty. Hit targets fast, stay calm under pressure. EEG headbands and webcam heart rate tracking reveal how stress affects your performance in real time. When you're calm, the game rewards you. When stress spikes, the game fights back.

## Features

- **Stress-modulated difficulty** -- your heart rate and brain state actively change how the game plays (target behavior, timing windows, visual chaos)
- **Real-time EEG integration** via Muse headband (Web Bluetooth) using the [Elata SDK](https://docs.elata.bio/sdk/overview)
- **Webcam heart rate (rPPG)** -- heart rate and HRV via facial video analysis, no wearables needed
- **Flow state rewards** -- calm composure unlocks easier target patterns and score multipliers
- **Post-session analytics** -- charts showing reaction times, hit accuracy, stress curves, heart rate, and brain wave activity
- **Calibration baseline** -- pre-session measurement for accurate stress/calm comparison
- **Neon arcade aesthetic** -- pure black background with cyan, magenta, and yellow neon glow, scanlines, and grid overlays

## How It Works

1. **Calibrate** -- The app records a short physiological baseline
2. **Play** -- Hit targets as fast as you can while biometrics modulate difficulty
3. **Review** -- Post-session breakdown of reaction times correlated with stress and neural data

The core training loop: you're not just practicing reaction speed, you're practicing composure. Over time, you learn to maintain calm under escalating pressure. Your scores reflect that.

## Tech Stack

- **React 19** + **TypeScript** (strict mode) -- component-based UI
- **Phaser 3** -- 2D game engine for target rendering and physics
- **Vite 6** -- fast dev server with WASM and top-level await support
- **Zustand** -- lightweight state management for game and neuro state
- **Howler.js** -- Web Audio playback for sound effects
- **Recharts** -- data visualization for post-session analysis
- **Tailwind CSS 4** -- utility-first responsive styling
- **Vitest** + **jsdom** -- unit tests
- **Biome** -- formatting and linting
- **Elata SDK** -- `@elata-biosciences/eeg-web`, `eeg-web-ble`, `rppg-web`

## Quick Start

```bash
pnpm install
pnpm dev          # dev server on http://localhost:5173
pnpm build        # tsc + vite build -> dist/
pnpm preview      # serve production build
pnpm test         # vitest (watch mode)
pnpm typecheck    # tsc --noEmit
pnpm lint         # biome check (read-only)
pnpm format       # biome format --write
```

## Neurotech Devices

| Device | Protocol | Browser Support |
|--------|----------|----------------|
| Webcam (rPPG heart rate) | getUserMedia | All modern browsers |
| Muse S headband (EEG) | Web Bluetooth | Chrome, Edge, Brave |

Connect devices before starting, or skip to play without sensors. The game works as a standard reaction tester without any hardware. Add biometrics to unlock the stress-reactive experience.

## Repository Structure

```
src/
├── pages/
│   ├── HomePage.tsx         # Landing screen with neon arcade aesthetic
│   ├── CalibratePage.tsx    # Baseline physiological measurement
│   ├── PlayPage.tsx         # Active game with Phaser + live biometrics
│   ├── ResultsPage.tsx      # Post-session charts and statistics
│   └── SettingsPage.tsx     # Device and game configuration
├── components/
│   ├── DeviceConnect.tsx    # Webcam + EEG connection UI
│   ├── NeuroPanel.tsx       # Live neuro metrics display
│   └── SignalQuality.tsx    # Signal strength indicator
├── lib/
│   └── gameStore.ts         # Zustand store for game state + neuro data
├── neuro/                   # EEG + rPPG provider integration
└── test/                    # Test setup and mocks
```

## Deployment

Pushes to `main` trigger the CI/CD pipeline which runs lint, typecheck, and tests, then deploys to GitHub Pages.

## App store listing assets

Marketing copy and image exports for store listings (icon, banner, desktop/mobile previews, expansion art) live in [`docs/store-assets/`](docs/store-assets/). Start with `listing.json`. The same icon is served as the site favicon at [`public/favicon.png`](public/favicon.png).

## Related Projects

Reaction Trainer is part of the [Elata Biosciences](https://elata.bio) neurotech app ecosystem. Other apps in the series:

- **[Monkey Mind: Inner Invaders](https://github.com/wkyleg/monkey-mind)** -- Brain-reactive arcade game with 140+ levels and EEG-driven gameplay
- **[Neuro Chess](https://github.com/wkyleg/neuro-chess)** -- Chess vs Stockfish with real-time neural composure tracking
- **[NeuroFlight](https://github.com/wkyleg/neuroflight)** -- 3D flight sim with AI dogfighting and EEG/rPPG biofeedback
- **[Breathwork Trainer](https://github.com/wkyleg/breathwork-trainer)** -- Guided breathing with live EEG and heart rate biofeedback

All apps use the [Elata Bio SDK](https://github.com/Elata-Biosciences/elata-bio-sdk) for EEG and rPPG integration.

## License

[ISC](LICENSE) -- Copyright (c) 2024-2026 Elata Biosciences
