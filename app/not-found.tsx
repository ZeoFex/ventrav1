import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function NotFound() {
  return (
    <main
      className="relative flex min-h-[100dvh] w-full items-center justify-center overflow-hidden"
      style={{
        background: "linear-gradient(to bottom, #d1fae5 0%, #ffffff 100%)",
      }}
    >
      {/* ───── Subtle Noise Texture Overlay ───── */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.03]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>

      {/* ───── Massive "404" background watermark ───── */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 flex select-none items-center justify-center -translate-y-[15%]"
      >
        <span
          className="font-[family-name:var(--font-display)] font-black tracking-tighter"
          style={{
            fontSize: "clamp(280px, 45vw, 750px)",
            lineHeight: 0.8,
            color: "rgba(255, 255, 255, 0.95)",
            filter: "blur(0.4px)",
          }}
        >
          404
        </span>
      </div>

      {/* ───── Content container ───── */}
      <div className="relative z-10 mx-auto flex w-full max-w-[1100px] flex-col items-center gap-12 px-6 py-16 md:flex-row md:items-center md:justify-between md:px-12">

        {/* ── Left: Mascot image ── */}
        <div className="relative flex w-full max-w-[240px] shrink-0 translate-y-[10%] items-end justify-center sm:max-w-[280px] md:max-w-[340px] lg:max-w-[380px]">
          <Image
            src="/404/404.png"
            alt="VentraPOS mascot"
            width={600}
            height={600}
            priority
            className="h-auto w-full object-contain"
            style={{
              filter: "drop-shadow(0 32px 64px rgba(5, 46, 22, 0.12))",
            }}
          />
          {/* Subtle Shadow Ellipse under mascot */}
          <div className="absolute -bottom-4 left-1/2 h-4 w-32 -translate-x-1/2 rounded-[100%] bg-black/5 blur-xl"></div>
        </div>

        {/* ── Right: Text & CTA ── */}
        <div className="flex flex-1 flex-col items-center text-center md:items-end md:text-right lg:pl-12">
          <div className="mb-3 inline-flex items-center rounded-full bg-[#22c55e]/10 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-[#16a34a]">
            Error Code: 404
          </div>

          <h1
            className="font-[family-name:var(--font-display)] text-[32px] font-black leading-[1.1] tracking-tight sm:text-[40px] md:text-[44px] lg:text-[52px]"
            style={{ color: "#052e16" }}
          >
            Page Not Found.
          </h1>

          <p
            className="mt-5 max-w-[380px] text-[15px] font-medium leading-[1.6] sm:text-base"
            style={{ color: "#3f6b54" }}
          >
            We couldn&#39;t process this request. The page you are looking for is out of stock or has been moved to a new shelf.
          </p>

          <Link
            href="/"
            className="group mt-9 inline-flex items-center gap-3 rounded-full bg-[#22c55e] px-8 py-4 text-[15px] font-bold text-white shadow-[0_10px_25px_-5px_rgba(34,197,94,0.4)] transition-all duration-300 hover:-translate-y-1 hover:bg-[#16a34a] hover:shadow-[0_15px_35px_-5px_rgba(34,197,94,0.5)] active:scale-95"
          >
            Return Home
            <ArrowRight
              className="size-[18px] transition-transform duration-300 group-hover:translate-x-1"
              strokeWidth={3}
            />
          </Link>
        </div>
      </div>
    </main>
  );
}
