/**
 * Guide — contextual hint overlay for tutorial levels.
 *
 * Shows a floating tooltip that points to a target element,
 * with a message telling the player what to do next.
 * Advances when the player performs the expected action.
 */

/**
 * @param {object} opts
 * @param {HTMLElement} opts.container - Parent element for the overlay
 * @returns {Guide}
 */
export function createGuide({ container }) {
  let overlayEl = null;
  let tooltipEl = null;
  let spotlightEl = null;
  let currentStep = null;
  let dismissCb = null;

  function show({ target, text, position = 'below', onDismiss }) {
    hide();

    currentStep = { target, text, position };
    dismissCb = onDismiss;

    // Overlay (dims everything except the target)
    overlayEl = document.createElement('div');
    overlayEl.className = 'guide-overlay';

    // Spotlight cutout around target
    if (target) {
      const rect = target.getBoundingClientRect();
      spotlightEl = document.createElement('div');
      spotlightEl.className = 'guide-spotlight';
      spotlightEl.style.position = 'fixed';
      spotlightEl.style.top = (rect.top - 4) + 'px';
      spotlightEl.style.left = (rect.left - 4) + 'px';
      spotlightEl.style.width = (rect.width + 8) + 'px';
      spotlightEl.style.height = (rect.height + 8) + 'px';
      overlayEl.appendChild(spotlightEl);
    }

    // Tooltip
    tooltipEl = document.createElement('div');
    tooltipEl.className = 'guide-tooltip';
    tooltipEl.innerHTML = `
      <div class="guide-text">${text}</div>
      <button class="guide-dismiss">Got it</button>
    `;
    overlayEl.appendChild(tooltipEl);

    // Position tooltip relative to target, centered horizontally, clamped to viewport
    container.appendChild(overlayEl);

    if (target) {
      const rect = target.getBoundingClientRect();
      const vh = window.innerHeight;
      const vw = window.innerWidth;
      const tooltipW = tooltipEl.offsetWidth || 280;
      const tooltipH = tooltipEl.offsetHeight || 120;
      const margin = 16;
      const gap = 14;

      // Center tooltip horizontally on the target
      let left = rect.left + rect.width / 2 - tooltipW / 2;
      // Clamp to viewport edges
      left = Math.max(margin, Math.min(left, vw - tooltipW - margin));

      let top;
      if (position === 'above') {
        top = rect.top - tooltipH - gap;
      } else {
        // default: below
        top = rect.bottom + gap;
      }

      // If tooltip would go off the bottom, flip to above
      if (top + tooltipH > vh - margin) {
        top = rect.top - tooltipH - gap;
      }
      // If still off the top, center vertically
      if (top < margin) {
        top = Math.max(margin, (vh - tooltipH) / 2);
      }

      tooltipEl.style.position = 'fixed';
      tooltipEl.style.top = top + 'px';
      tooltipEl.style.left = left + 'px';
    } else {
      // No target — center in viewport, add dim background to overlay
      overlayEl.style.background = 'rgba(0,0,0,0.65)';
      tooltipEl.style.position = 'fixed';
      tooltipEl.style.top = '50%';
      tooltipEl.style.left = '50%';
      tooltipEl.style.transform = 'translate(-50%, -50%)';
    }

    // Dismiss handlers
    const dismissBtn = tooltipEl.querySelector('.guide-dismiss');
    dismissBtn.addEventListener('click', () => {
      hide();
      dismissCb?.();
    });

    // Also dismiss on overlay click
    overlayEl.addEventListener('click', (e) => {
      if (e.target === overlayEl) {
        hide();
        dismissCb?.();
      }
    });
  }

  function hide() {
    if (overlayEl) { overlayEl.remove(); overlayEl = null; }
    tooltipEl = null;
    spotlightEl = null;
    currentStep = null;
  }

  return { show, hide };
}

/**
 * Run a sequence of guide steps for a tutorial level.
 * Each step shows a tooltip, waits for dismissal, then shows the next.
 *
 * @param {Guide} guide
 * @param {object[]} steps - Array of { target, text, position, delay }
 * @returns {Promise} resolves when all steps are done
 */
export function runGuideSequence(guide, steps) {
  return new Promise((resolve) => {
    let idx = 0;

    function showNext() {
      if (idx >= steps.length) { resolve(); return; }
      const step = steps[idx];
      const target = typeof step.target === 'string'
        ? document.querySelector(step.target)
        : step.target;

      setTimeout(() => {
        guide.show({
          target,
          text: step.text,
          position: step.position || 'below',
          onDismiss: () => { idx++; showNext(); },
        });
      }, step.delay || 300);
    }

    showNext();
  });
}
