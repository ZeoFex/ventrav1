/** NDJSON line protocol for the Zuri panel (one JSON object per line). */
export type CopilotStreamEvent =
  | { type: "text-delta"; delta: string }
  | { type: "tool-start"; id: string; name: string }
  | {
      type: "tool-done";
      id: string;
      ok: boolean;
      summary?: string;
      errorText?: string;
    }
  | { type: "pause"; resumeToken: string; preview: string; toolName: string }
  | {
      type: "done";
      finishReason?: string;
      usage?: unknown;
    }
  | { type: "error"; message: string };
