import type { ReactNode } from "react";

export function ProductsPageShell({
  title,
  description,
  children,
  actions,
  fill,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  actions?: ReactNode;
  /** Fill the dashboard pane so inner lists can scroll under a sticky toolbar. */
  fill?: boolean;
}) {
  return (
    <main
      className={
        fill
          ? "mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col overflow-hidden px-4 py-2 sm:px-6 sm:py-3 lg:py-4"
          : "mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-10"
      }
    >
      <div
        className={
          fill
            ? "mb-2 flex shrink-0 items-center justify-between gap-2 sm:mb-3 sm:items-start"
            : "mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
        }
      >
        <div className="min-w-0">
          <h1
            className={`font-[family-name:var(--font-display)] font-semibold tracking-tight text-foreground ${
              fill ? "text-xl sm:text-2xl" : "text-2xl"
            }`}
          >
            {title}
          </h1>
          {description ? (
            <p
              className={`mt-1.5 max-w-2xl text-[15px] text-muted-foreground ${
                fill ? "hidden sm:block" : ""
              }`}
            >
              {description}
            </p>
          ) : null}
        </div>
        {actions ? (
          <div
            className={
              fill
                ? "flex min-w-0 shrink-0 items-center gap-2 overflow-x-auto scrollbar-hide"
                : "flex w-full min-w-0 shrink-0 items-center gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1 sm:w-auto sm:flex-wrap sm:pb-0 sm:overflow-visible"
            }
          >
            {actions}
          </div>
        ) : null}
      </div>
      {fill ? (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
      ) : (
        children
      )}
    </main>
  );
}
