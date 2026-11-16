/** Drop a stale prefix when the next key arrives after the cashier has paused. */
export const WEDGE_IDLE_RESET_MS = 500;

export function shouldStartNewWedgeBuffer(
  lastKeyAt: number | null,
  now: number,
  idleMs = WEDGE_IDLE_RESET_MS,
): boolean {
  if (lastKeyAt === null) return false;
  return now - lastKeyAt > idleMs;
}
