import Image from "next/image";
import Link from "next/link";

export function AuthSplitVisual({
  lightSrc,
  darkSrc,
  alt,
  subtitle,
}: {
  lightSrc: string;
  darkSrc: string;
  alt: string;
  subtitle: string;
}) {
  return (
    <aside className="relative hidden flex-shrink-0 flex-col bg-surface-elevated dark:bg-black lg:flex lg:min-h-screen lg:w-[46%] lg:max-w-[560px]">
      <div className="flex flex-1 flex-col px-8 pb-10 pt-10 lg:px-12 lg:pb-14 lg:pt-14">
        <Link
          href="/"
          className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight text-foreground dark:text-white"
        >
          VentraPOS
        </Link>
        <p className="mt-3 max-w-[14rem] text-[13px] leading-snug text-muted-foreground dark:text-white/45">
          {subtitle}
        </p>

        <div className="flex min-h-0 flex-1 flex-col items-center justify-center py-10 lg:py-16">
          <div className="relative mx-auto w-full max-w-[15rem] sm:max-w-[17rem] lg:max-w-[18.5rem]">
            <Image
              src={lightSrc}
              alt={alt}
              width={900}
              height={700}
              priority
              sizes="(max-width: 640px) 60vw, (max-width: 1024px) 240px, 296px"
              className="h-auto w-full select-none object-contain dark:hidden"
              style={{
                filter:
                  "drop-shadow(0 28px 56px rgba(0,0,0,0.12)) drop-shadow(0 12px 24px rgba(0,0,0,0.06))",
              }}
            />
            <Image
              src={darkSrc}
              alt={alt}
              width={900}
              height={700}
              priority
              sizes="(max-width: 640px) 60vw, (max-width: 1024px) 240px, 296px"
              className="hidden h-auto w-full select-none object-contain dark:block"
              style={{
                filter:
                  "drop-shadow(0 32px 64px rgba(0,0,0,0.45)) drop-shadow(0 16px 32px rgba(0,0,0,0.25))",
              }}
            />
          </div>
        </div>
      </div>
    </aside>
  );
}
