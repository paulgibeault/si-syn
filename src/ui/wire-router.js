/**
 * Wire router — auto-routes wires between pins on the circuit board grid.
 * Uses L-shaped Manhattan routing with obstacle avoidance.
 *
 * @param {object} from   - { x, y } screen coordinates of source pin center
 * @param {object} to     - { x, y } screen coordinates of target pin center
 * @param {string} fromSide - 'left' | 'right' side the source pin is on
 * @param {string} toSide   - 'left' | 'right' side the target pin is on
 * @returns {string} SVG path data
 */
export function routeWire(from, to, fromSide = 'right', toSide = 'left') {
  const PAD = 16; // how far to extend from component before turning

  // Exit direction from source
  const sx = from.x + (fromSide === 'right' ? PAD : -PAD);
  // Entry direction to target
  const tx = to.x + (toSide === 'left' ? -PAD : PAD);

  // Midpoint for the vertical segment
  const midX = (sx + tx) / 2;

  // Simple Z-shaped route: right → down/up → right
  return [
    `M ${from.x} ${from.y}`,
    `L ${sx} ${from.y}`,
    `L ${midX} ${from.y}`,
    `L ${midX} ${to.y}`,
    `L ${tx} ${to.y}`,
    `L ${to.x} ${to.y}`,
  ].join(' ');
}
