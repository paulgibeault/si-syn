# Silicon Syndicate

**Program microcontrollers. Route signals. Hack the system.**

Silicon Syndicate is a logic puzzle game inspired by Shenzhen I/O. Write tiny assembly programs, wire components together on a circuit board, and match the target signal to advance.

```
 SENSOR ──┤MCU├── LIGHT
           │
      mov sensor acc
      add acc
      mov acc p0
```

---

### [>>> Press Play <<<](https://paulgibeault.github.io/si-syn/)

---

## What You'll Do

- Write assembly programs using `mov`, `add`, `tgt`, `slp`, `jmp` and more
- Wire sensors, MCUs, and outputs on an interactive circuit board
- Match target waveforms within a set number of cycles
- Progress from basic signals through conditionals, timing, and multi-component routing

## How It Works

Each level gives you a broken circuit. Tap an MCU to open its code editor, fill in the missing instructions, and hit **Run**. The waveform monitor shows whether your output matches the target. Green bars mean you're winning.

No install. No backend. Just your browser.

---

*Built with vanilla JS. Runs entirely client-side.*
