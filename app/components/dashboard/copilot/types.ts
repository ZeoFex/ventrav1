export type ChatTurn = {
  role: "user" | "assistant";
  content: string;
};

export type ToolRowState = {
  id: string;
  name: string;
  status: "running" | "done" | "error";
  summary?: string;
  errorText?: string;
};
