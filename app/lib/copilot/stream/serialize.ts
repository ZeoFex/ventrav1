import type { CopilotStreamEvent } from "./events";

export function encodeCopilotEvent(event: CopilotStreamEvent): string {
  return `${JSON.stringify(event)}\n`;
}
