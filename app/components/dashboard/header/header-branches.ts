/** Placeholder branches until API / session wiring. Main branch is the default. */

export type BranchOption = {
  id: string;
  label: string;
};

export const DEFAULT_BRANCH_ID = "main";

export const DEFAULT_BRANCH_OPTIONS: BranchOption[] = [
  { id: "main", label: "Main branch" },
  { id: "east-legon", label: "East Legon" },
  { id: "kumasi", label: "Kumasi kiosk" },
];
