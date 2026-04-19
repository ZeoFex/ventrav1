"use client";

import { CopilotToolInvocation } from "./copilot-tool-invocation";
import type { ToolRowState } from "../types";

export function CopilotToolTimeline({ tools }: { tools: ToolRowState[] }) {
  if (tools.length === 0) return null;
  return (
    <div className="space-y-2">
      {tools.map((t) => (
        <CopilotToolInvocation key={t.id} tool={t} />
      ))}
    </div>
  );
}
