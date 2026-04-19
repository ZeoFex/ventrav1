import type { ToolRisk } from "./types";

/** Metadata for registry / policy (parallelism uses risk tier). */
export type DefinedToolMeta = {
  name: string;
  risk: ToolRisk;
  /** When true, execute is not run until /api/copilot/resume confirms (see registry wrapper). */
  requiresConfirmation?: boolean;
};
