function greetingForHour(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function HomeGreeting({
  compact = false,
  name,
}: {
  compact?: boolean;
  name?: string | null;
}) {
  const now = new Date();
  const greeting = greetingForHour(now.getHours());
  const dateLabel = new Intl.DateTimeFormat("en-GH", {
    weekday: compact ? "short" : "long",
    day: "numeric",
    month: compact ? "short" : "long",
  }).format(now);
  const title = name ? `${greeting}, ${name}` : greeting;

  return (
    <div className="flex min-w-0 items-end justify-between gap-3">
      <div className="min-w-0">
        <h1
          className={`font-[family-name:var(--font-display)] font-semibold leading-tight tracking-tight text-[#14261e] dark:text-white ${
            compact ? "text-[1.15rem]" : "text-[1.35rem] sm:text-2xl"
          }`}
        >
          {title}
        </h1>
        <p
          className={`mt-0.5 font-medium tracking-wide text-[#7a8c84] dark:text-muted-foreground ${
            compact ? "text-[11px]" : "text-[12px] sm:text-[14px]"
          }`}
        >
          {dateLabel}
        </p>
      </div>
      {compact ? null : (
        <p className="hidden text-right text-[12px] text-muted-foreground lg:block">
          VentraPOS shop
        </p>
      )}
    </div>
  );
}
