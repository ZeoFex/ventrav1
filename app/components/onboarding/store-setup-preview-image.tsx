import Image from "next/image";

const ALT =
  "Store setup overview in VentraPOS: profile, categories, tax, mobile money, and staff";

/** Bare PNG — no frame or background; theme picks light vs dark asset. */
export function StoreSetupPreviewImage() {
  return (
    <figure className="m-0 mx-auto w-full max-w-[15rem] sm:max-w-[17rem] lg:max-w-[18.5rem]">
      <Image
        src="/onboarding/store-setup-light.png"
        alt={ALT}
        width={720}
        height={900}
        className="h-auto w-full select-none dark:hidden"
        sizes="(max-width: 640px) 60vw, (max-width: 1024px) 240px, 296px"
        priority
      />
      <Image
        src="/onboarding/store-setup-dark.png"
        alt={ALT}
        width={720}
        height={900}
        className="hidden h-auto w-full select-none dark:block"
        sizes="(max-width: 640px) 60vw, (max-width: 1024px) 240px, 296px"
        priority
      />
    </figure>
  );
}
