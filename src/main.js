/**
 * Main entry point — wires the UI to the simulation engine.
 */

import { createMCU } from './engine/mcu.js';
import { runLevel } from './engine/verifier.js';
import { level01 } from './levels/level01.js';
import { level02 } from './levels/level02.js';
import { level03 } from './levels/level03.js';

// ---------------------------------------------------------------------------
// Level registry
// ---------------------------------------------------------------------------

const LEVELS = [level01, level02, level03];

// ---------------------------------------------------------------------------
// DOM refs
// ---------------------------------------------------------------------------

const levelSelect = document.getElementById('level-select');
const levelName = document.getElementById('level-name');
const levelDesc = document.getElementById('level-desc');
const codeEditor = document.getElementById('code-editor');
const hint = document.getElementById('hint');
const btnRun = document.getElementById('btn-run');
const btnStep = document.getElementById('btn-step');
const btnReset = document.getElementById('btn-reset');
const cycleDisplay = document.getElementById('cycle-display');
const waveformEl = document.getElementById('waveform');
const resultBanner = document.getElementById('result-banner');

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let currentLevel = null;
let sim = null;          // { scheduler, verifier, board }
let running = false;
let runTimer = null;

// Per-level saved code
const savedCode = {};

// ---------------------------------------------------------------------------
// Level loading
// ---------------------------------------------------------------------------

function populateLevelSelect() {
  for (const level of LEVELS) {
    const opt = document.createElement('option');
    opt.value = level.id;
    opt.textContent = `${level.id}: ${level.name}`;
    levelSelect.appendChild(opt);
  }
}

function loadLevel(levelId) {
  stopRun();
  currentLevel = LEVELS.find(l => l.id === levelId);
  if (!currentLevel) return;

  levelName.textContent = `Level ${currentLevel.id}: ${currentLevel.name}`;
  levelDesc.textContent = currentLevel.description;
  hint.textContent = currentLevel.hint || '';

  // Restore saved code or start blank
  codeEditor.value = savedCode[levelId] ?? '';

  resetSim();
}

// ---------------------------------------------------------------------------
// Simulation setup
// ---------------------------------------------------------------------------

function buildMCU() {
  const def = currentLevel.playerMCU;
  return createMCU({
    id: def.id,
    source: codeEditor.value,
    simplePins: def.simplePins || [],
    xbusPins: def.xbusPins || [],
  });
}

function resetSim() {
  stopRun();

  // Save current code
  if (currentLevel) savedCode[currentLevel.id] = codeEditor.value;

  const mcu = buildMCU();
  sim = runLevel({ level: currentLevel, mcus: [mcu] });

  cycleDisplay.textContent = 'Cycle: 0';
  resultBanner.className = '';
  resultBanner.style.display = 'none';
  renderWaveform();
}

// ---------------------------------------------------------------------------
// Step / Run
// ---------------------------------------------------------------------------

function stepOnce() {
  if (!sim || sim.verifier.complete) return;

  sim.scheduler.tick();
  cycleDisplay.textContent = `Cycle: ${sim.scheduler.cycle}`;
  renderWaveform();

  if (sim.verifier.complete) {
    showResult();
    stopRun();
  }
}

function startRun() {
  if (running) return;
  resetSim();
  running = true;
  btnRun.textContent = 'Stop';
  btnRun.id = 'btn-stop';

  runTimer = setInterval(() => {
    stepOnce();
    if (!running) clearInterval(runTimer);
  }, 150);
}

function stopRun() {
  running = false;
  if (runTimer) { clearInterval(runTimer); runTimer = null; }
  btnRun.textContent = 'Run';
  btnRun.id = 'btn-run';
}

function showResult() {
  if (sim.verifier.passed) {
    resultBanner.textContent = 'LEVEL PASSED';
    resultBanner.className = 'pass';
  } else {
    resultBanner.textContent = 'OUTPUT MISMATCH — TRY AGAIN';
    resultBanner.className = 'fail';
  }
  resultBanner.style.display = 'block';
}

// ---------------------------------------------------------------------------
// Waveform rendering
// ---------------------------------------------------------------------------

function renderWaveform() {
  waveformEl.innerHTML = '';
  if (!sim) return;

  const summary = sim.verifier.summary;
  const maxVal = 100; // scale bar heights to this max

  for (let cycle = 1; cycle <= currentLevel.testCycles; cycle++) {
    const col = document.createElement('div');
    col.className = 'wave-col';

    const cycleData = summary.find(s => s.cycle === cycle);

    // For each expected output pin, draw expected + actual bars
    for (const pinId of Object.keys(currentLevel.expected)) {
      const expectedVal = currentLevel.expected[pinId](cycle);
      const barHeight = Math.max(2, (Math.abs(expectedVal) / maxVal) * 60);

      if (cycleData && cycleData.pins[pinId]) {
        const { actual, pass } = cycleData.pins[pinId];
        const actualHeight = Math.max(2, (Math.abs(actual) / maxVal) * 60);

        const bar = document.createElement('div');
        bar.className = `wave-bar ${pass ? 'pass' : 'fail'}`;
        bar.style.height = actualHeight + 'px';
        bar.title = `Cycle ${cycle}: actual=${actual}, expected=${expectedVal}`;
        col.appendChild(bar);
      } else {
        // Not yet simulated — show expected as dashed
        const bar = document.createElement('div');
        bar.className = 'wave-bar expected';
        bar.style.height = barHeight + 'px';
        bar.title = `Cycle ${cycle}: expected=${expectedVal}`;
        col.appendChild(bar);
      }
    }

    const label = document.createElement('div');
    label.className = 'wave-label';
    label.textContent = cycle;
    col.appendChild(label);

    waveformEl.appendChild(col);
  }
}

// ---------------------------------------------------------------------------
// Instruction drawer
// ---------------------------------------------------------------------------

document.getElementById('instr-drawer').addEventListener('click', (e) => {
  const btn = e.target.closest('.instr-btn');
  if (!btn) return;
  const text = btn.dataset.instr;
  const start = codeEditor.selectionStart;
  const end = codeEditor.selectionEnd;
  const val = codeEditor.value;
  codeEditor.value = val.slice(0, start) + text + val.slice(end);
  codeEditor.selectionStart = codeEditor.selectionEnd = start + text.length;
  codeEditor.focus();
});

// ---------------------------------------------------------------------------
// Event listeners
// ---------------------------------------------------------------------------

levelSelect.addEventListener('change', () => loadLevel(levelSelect.value));

btnRun.addEventListener('click', () => {
  if (running) stopRun();
  else startRun();
});

btnStep.addEventListener('click', () => {
  if (running) stopRun();
  if (!sim || sim.verifier.complete) resetSim();
  stepOnce();
});

btnReset.addEventListener('click', resetSim);

// Save code on edit
codeEditor.addEventListener('input', () => {
  if (currentLevel) savedCode[currentLevel.id] = codeEditor.value;
});

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------

populateLevelSelect();
loadLevel(LEVELS[0].id);
