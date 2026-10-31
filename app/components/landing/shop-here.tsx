import Link from "next/link";

export function ShopHere() {
  return (
    <section className="bg-background px-4 pb-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 rounded-3xl bg-gradient-to-br from-[#003527] via-[#004d38] to-[#006c49] px-6 py-8 text-white sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#6ffbbe]">
            Shop here
          </p>
          <h2 className="mt-1 font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight sm:text-3xl">
            Everything you need is here
          </h2>
          <p className="mt-2 max-w-xl text-[14px] text-white/80">
            Categories from shops on VentraPOS, with the shop name and the region each one is in.
          </p>
        </div>
        <Link
          href="/shop"
          className="inline-flex shrink-0 items-center justify-center rounded-full bg-white px-5 py-2.5 text-[14px] font-semibold text-[#003527]"
        >
          Open the shop
        </Link>
      </div>
    </section>
  );
}
