function greetingForHour(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function HomeGreeting() {
  const now = new Date();
  const greeting = greetingForHour(now.getHours());
  const dateLabel = new Intl.DateTimeFormat("en-GH", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(now);

  return (
    <div className="flex items-end justify-between gap-3">
      <div className="space-y-0.5">
        <h1 className="font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          {greeting}
        </h1>
        <p className="text-[12px] text-muted-foreground sm:text-[14px]">{dateLabel}</p>
      </div>
      <p className="hidden text-right text-[12px] text-muted-foreground lg:block">
        VentraPOS shop
      </p>
    </div>
  );
}
