# ⚡ Silicon Syndicate

<div align="center">
  <a href="https://paulgibeault.github.io/si-syn/">
    <img src="https://img.shields.io/badge/▶_PLAY_NOW-Take_the_Challenge-blue?style=for-the-badge&labelColor=1a1a2e&color=e94560" alt="Play Now" height="50" />
  </a>
</div>

> **Program microcontrollers. Route signals. Hack the system.**

A browser-based logic puzzle game inspired by Shenzhen I/O. Write tiny assembly programs, wire components together on an interactive circuit board, and match the target waveform to advance.

```
 SENSOR ──┤MCU├── LIGHT
           │
      mov sensor acc
      add acc
      mov acc p0
```

No install. No backend. Runs entirely in your browser.

---

## What You'll Do

- ✍️ Write assembly programs using `mov`, `add`, `tgt`, `slp`, `jmp`, and more
- 🔌 Wire sensors, MCUs, and outputs on an interactive circuit board
- 📊 Match target waveforms within a set number of cycles
- 🧠 Progress from basic signals through conditionals, timing, and multi-component routing

## How It Works

Each level gives you a broken circuit. Tap an MCU to open its code editor, write the missing instructions, and hit **Run**. The waveform monitor shows whether your output matches the target. Green bars mean you're winning.

### Instruction Set

| Instruction | Description |
|-------------|-------------|
| `mov src dst` | Copy value from source to destination |
| `add val` | Add value to accumulator |
| `sub val` | Subtract value from accumulator |
| `tgt a b` | Test if `a > b` (sets condition flag) |
| `slp cycles` | Sleep for N cycles |
| `jmp label` | Unconditional jump |
| `teq a b` | Test if `a == b` |

### Components

| Component | Role |
|-----------|------|
| **MCU** | Programmable microcontroller (2–4 Simple pins, 2 XBus pins) |
| **Sensor** | Input source providing signal values each cycle |
| **Output** | Target receiver — match it to win |
| **Register** | `acc` (accumulator) and `dat` (data) per MCU |

---

## Tech Stack

- **Vanilla JavaScript** (ES Modules) — no framework
- **Vite** — build tooling and dev server
- **Vitest** — test runner
- Deployed via **GitHub Pages**

## Development

```bash
# Install deps
npm install

# Start dev server
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

## Status

🚧 **Early development** — core engine and puzzle format complete. More levels and polish in progress.

---

*Built by Paul Gibeault — because programming puzzles are better when the computer is a 4-pin microcontroller.*
