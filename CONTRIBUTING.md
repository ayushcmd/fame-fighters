# Contributing to Fame Fighters

Thank you for your interest in contributing to **Fame Fighters (Sansad Showdown)**! We welcome contributions ranging from bug fixes and gameplay improvements to new stages, moves, and visual effects.

---

## Code of Conduct

All contributors are expected to uphold the [Code of Conduct](CODE_OF_CONDUCT.md). Please report unacceptable behavior to [ayush_24a12res897@iitp.ac.in](mailto:ayush_24a12res897@iitp.ac.in).

---

## How Can I Contribute?

- **Reporting Bugs**: Check existing issues first. If reporting a new bug, include browser version, OS, reproduction steps, and console logs/screenshots.
- **Suggesting Features**: Open an issue describing the proposed feature, why it adds value, and potential implementation approaches.
- **Pull Requests**: We welcome PRs for documentation improvements, bug fixes, performance optimizations, and new features.

---

## Development Setup

1. **Prerequisites**:
   - [Node.js](https://nodejs.org/) (v18+ recommended)
   - [npm](https://www.npmjs.com/) or `pnpm`

2. **Clone the repository**:
   ```bash
   git clone https://github.com/ayushcmd/fame-fighters.git
   cd fame-fighters
   ```

3. **Install dependencies**:
   ```bash
   npm install
   ```

4. **Start the local development server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173` in your browser.

5. **Typecheck & Production Build**:
   ```bash
   npm run typecheck
   npm run build
   ```

---

## Code Style & Architecture

- **TypeScript**: Strict typechecking is enabled. Ensure `npm run typecheck` passes with zero errors before submitting PRs.
- **Three.js**: Rendering is organized cleanly under `src/render/` (custom procedural rigs, animations, shaders, post-processing, and particle pools). Avoid referencing external unbundled assets without fallback.
- **Audio**: Web Audio API procedural synthesis is located in `src/audio/sound.ts`.
- **Combat & State**: Frame-fixed game logic (`1/60`s delta) is located under `src/combat/` and `src/battle/`.

---

## Pull Request Guidelines

1. Fork the repo and create a new feature branch (`git checkout -b feature/awesome-feature`).
2. Keep commits descriptive and atomic (`git commit -m "feat: add sound effect for super attack"`).
3. Verify that `npm run typecheck` and `npm run build` pass cleanly.
4. Push your branch to GitHub (`git push origin feature/awesome-feature`).
5. Open a Pull Request against the `main` branch with a clear description of changes.

---

## Questions?

Reach out via GitHub Issues or contact **[ayush_24a12res897@iitp.ac.in](mailto:ayush_24a12res897@iitp.ac.in)**.
