"use client";

import type { OnboardingData } from "./types";
import {
  BUSINESS_TYPES,
  getFormStepLabel,
  GHANA_REGIONS,
  isBranchStepId,
} from "./constants";
import { MultiBranchStepContent } from "./onboarding-branch-steps";
import { field, fieldSelect } from "./onboarding-input-classes";
import { ReceiptThermalPreview } from "./receipt-thermal-preview";
import { StoreSetupPreviewImage } from "./store-setup-preview-image";
import { UploadButton } from "@/app/utils/uploadthing";
import { PaymentFlow } from "@/app/components/billing/payment-flow";
import { PLANS } from "@/config/plans";

type SetData = React.Dispatch<React.SetStateAction<OnboardingData>>;

export function OnboardingStepContent({
  stepId,
  stepIndex,
  steps,
  data,
  setData,
}: {
  stepId: string | undefined;
  stepIndex: number;
  steps: string[];
  data: OnboardingData;
  setData: SetData;
}) {
  if (!stepId || stepId === "complete") return null;

  const formStepLabel = getFormStepLabel(steps, stepIndex);
  const label = "text-[13px] font-medium text-muted-foreground";

  switch (stepId) {
    case "welcome":
      return (
        <div className="grid gap-10 lg:min-h-[min(calc(100vh-10.5rem),640px)] lg:grid-cols-2 lg:items-center lg:gap-12 xl:gap-16">
          <div className="flex flex-col justify-center space-y-5 text-center sm:text-left lg:-translate-y-1">
            <p className="font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight sm:text-2xl">
              <span className="text-foreground">Ventra</span>
              <span className="bg-gradient-to-r from-[#003527] via-[#006c49] to-[#064e3b] bg-clip-text text-transparent dark:from-[#6ffbbe] dark:via-[#4ade80] dark:to-[#059669]">
                POS
              </span>
            </p>
            <div className="max-w-xl lg:max-w-none">
              <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight text-foreground sm:text-3xl lg:text-[1.75rem] xl:text-3xl">
                Set up your store
              </h1>
              <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
                A few quick steps tailored for businesses in{" "}
                <span className="text-foreground">Ghana</span>—currency in{" "}
                <span className="font-medium text-foreground">cedis (GHS)</span>,
                local addressing, and receipts your customers understand.
              </p>
            </div>
            <ul className="mx-auto max-w-xl space-y-3 text-left text-[14px] text-muted-foreground sm:mx-0 lg:max-w-none">
              <li className="flex gap-3">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[#006c49] dark:bg-[#6ffbbe]" />
                Business profile &amp; contact
              </li>
              <li className="flex gap-3">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[#006c49] dark:bg-[#6ffbbe]" />
                Money, tax &amp; branding
              </li>
              <li className="flex gap-3">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[#006c49] dark:bg-[#6ffbbe]" />
                Hours &amp; how you operate
              </li>
            </ul>
          </div>
          <div className="flex min-w-0 items-center justify-center lg:justify-end">
            <div className="w-full max-w-md lg:max-w-none">
              <StoreSetupPreviewImage />
            </div>
          </div>
        </div>
      );

    case "business-type":
      return (
        <div className="space-y-6">
          <div>
            {formStepLabel ? (
              <p className={label}>{formStepLabel}</p>
            ) : null}
            <h2 className="mt-1 font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              What kind of business is this?
            </h2>
            <p className="mt-2 text-[15px] text-muted-foreground">
              We use this to suggest defaults for tax and receipts.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {BUSINESS_TYPES.map((t) => {
              const selected = data.businessType === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() =>
                    setData((d) => ({ ...d, businessType: t.id }))
                  }
                  className={`rounded-xl px-4 py-3.5 text-left transition-colors ${selected
                    ? "bg-[#003527]/10 ring-2 ring-[#006c49] dark:bg-[#6ffbbe]/10 dark:ring-[#6ffbbe]"
                    : "bg-surface-card hover:bg-surface-elevated dark:bg-[#141414] dark:hover:bg-[#1a1a1a]"
                    }`}
                >
                  <span className="font-medium text-foreground">
                    {t.label}
                  </span>
                  <span className="mt-0.5 block text-[13px] text-muted-foreground">
                    {t.hint}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      );

    case "store-name":
      return (
        <div className="space-y-6">
          <div>
            {formStepLabel ? (
              <p className={label}>{formStepLabel}</p>
            ) : null}
            <h2 className="mt-1 font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              Store name
            </h2>
            <p className="mt-2 text-[15px] text-muted-foreground">
              Shown on receipts and the POS. You can change it later.
            </p>
          </div>
          <div>
            <label htmlFor="store-name" className="sr-only">
              Store name
            </label>
            <input
              id="store-name"
              value={data.storeName}
              onChange={(e) =>
                setData((d) => ({ ...d, storeName: e.target.value }))
              }
              placeholder="e.g. Adenta Mini Mart"
              className={field}
              autoComplete="organization"
            />
          </div>
        </div>
      );

    case "profile":
      return (
        <div className="space-y-5">
          <div>
            {formStepLabel ? (
              <p className={label}>{formStepLabel}</p>
            ) : null}
            <h2 className="mt-1 font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              Business profile
            </h2>
            <p className="mt-2 text-[15px] text-muted-foreground">
              Legal or registered name as it should appear on invoices.
            </p>
          </div>
          <div className="space-y-3">
            <div>
              <label
                htmlFor="legal-name"
                className="mb-1.5 block text-[13px] font-medium text-muted-foreground"
              >
                Legal / trading name
              </label>
              <input
                id="legal-name"
                value={data.legalName}
                onChange={(e) =>
                  setData((d) => ({ ...d, legalName: e.target.value }))
                }
                placeholder="Registered business name"
                className={field}
              />
            </div>
            <div>
              <label
                htmlFor="reg-id"
                className="mb-1.5 block text-[13px] font-medium text-muted-foreground"
              >
                TIN / registration number{" "}
                <span className="font-normal text-muted-foreground/80">
                  (optional)
                </span>
              </label>
              <input
                id="reg-id"
                value={data.registrationId}
                onChange={(e) =>
                  setData((d) => ({ ...d, registrationId: e.target.value }))
                }
                placeholder="e.g. Ghana Revenue Authority TIN"
                className={field}
              />
            </div>
          </div>
        </div>
      );

    case "contact":
      return (
        <div className="space-y-5">
          <div>
            {formStepLabel ? (
              <p className={label}>{formStepLabel}</p>
            ) : null}
            <h2 className="mt-1 font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              Contact details
            </h2>
            <p className="mt-2 text-[15px] text-muted-foreground">
              For receipts and account notifications. Use a number you
              regularly answer.
            </p>
          </div>
          <div className="space-y-3">
            <div>
              <label
                htmlFor="phone"
                className="mb-1.5 block text-[13px] font-medium text-muted-foreground"
              >
                Mobile number
              </label>
              <input
                id="phone"
                type="tel"
                inputMode="tel"
                value={data.phone}
                onChange={(e) =>
                  setData((d) => ({ ...d, phone: e.target.value }))
                }
                placeholder="+233 24 XXX XXXX"
                className={field}
                autoComplete="tel"
              />
            </div>
            <div>
              <label
                htmlFor="biz-email"
                className="mb-1.5 block text-[13px] font-medium text-muted-foreground"
              >
                Business email
              </label>
              <input
                id="biz-email"
                type="email"
                value={data.email}
                onChange={(e) =>
                  setData((d) => ({ ...d, email: e.target.value }))
                }
                placeholder="you@business.com"
                className={field}
                autoComplete="email"
              />
            </div>
          </div>
        </div>
      );

    case "address":
      return (
        <div className="space-y-5">
          <div>
            {formStepLabel ? (
              <p className={label}>{formStepLabel}</p>
            ) : null}
            <h2 className="mt-1 font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              Business address
            </h2>
            <p className="mt-2 text-[15px] text-muted-foreground">
              Street and city—no map pin for now. We can add GPS later.
            </p>
          </div>
          <div className="space-y-3">
            <div>
              <label
                htmlFor="addr-line"
                className="mb-1.5 block text-[13px] font-medium text-muted-foreground"
              >
                Street / landmark
              </label>
              <input
                id="addr-line"
                value={data.addressLine}
                onChange={(e) =>
                  setData((d) => ({ ...d, addressLine: e.target.value }))
                }
                placeholder="House number, street, area"
                className={field}
              />
            </div>
            <div>
              <label
                htmlFor="city"
                className="mb-1.5 block text-[13px] font-medium text-muted-foreground"
              >
                City / town
              </label>
              <input
                id="city"
                value={data.city}
                onChange={(e) =>
                  setData((d) => ({ ...d, city: e.target.value }))
                }
                placeholder="e.g. Accra, Kumasi"
                className={field}
              />
            </div>
            <div>
              <label
                htmlFor="region"
                className="mb-1.5 block text-[13px] font-medium text-muted-foreground"
              >
                Region
              </label>
              <select
                id="region"
                value={data.region}
                onChange={(e) =>
                  setData((d) => ({ ...d, region: e.target.value }))
                }
                className={fieldSelect}
              >
                <option value="">Select region</option>
                {GHANA_REGIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      );

    case "money":
      return (
        <div className="space-y-5">
          <div>
            {formStepLabel ? (
              <p className={label}>{formStepLabel}</p>
            ) : null}
            <h2 className="mt-1 font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              Money &amp; tax
            </h2>
            <p className="mt-2 text-[15px] text-muted-foreground">
              Ghana defaults: Ghana Cedi (GHS) and English (Ghana). Adjust if
              needed.
            </p>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="currency"
                  className="mb-1.5 block text-[13px] font-medium text-muted-foreground"
                >
                  Currency
                </label>
                <select
                  id="currency"
                  value={data.currency}
                  onChange={(e) =>
                    setData((d) => ({ ...d, currency: e.target.value }))
                  }
                  className={fieldSelect}
                >
                  <option value="GHS">GHS — Ghana Cedi</option>
                  <option value="USD" disabled>
                    USD (coming soon)
                  </option>
                </select>
              </div>
              <div>
                <label
                  htmlFor="locale"
                  className="mb-1.5 block text-[13px] font-medium text-muted-foreground"
                >
                  Locale
                </label>
                <select
                  id="locale"
                  value={data.locale}
                  onChange={(e) =>
                    setData((d) => ({ ...d, locale: e.target.value }))
                  }
                  className={fieldSelect}
                >
                  <option value="en-GH">English (Ghana)</option>
                  <option value="en">English (generic)</option>
                </select>
              </div>
            </div>

            <div className="pt-2 border-t border-[#bfc9c3]/20 dark:border-white/10 space-y-4">
              <label
                htmlFor="tax-reg"
                className="mb-1 block text-[14px] font-semibold text-foreground"
              >
                Tax Profile
              </label>
              <select
                id="tax-type"
                value={data.taxType}
                onChange={(e) => {
                  const val = e.target.value as any;
                  setData((d) => {
                    let rate = "0";
                    if (val === "standard_21_9") rate = "21.9";
                    else if (val === "flat_4") rate = "4.0";
                    else if (val === "flat_3") rate = "3.0";

                    return { ...d, taxType: val, taxRegistered: val !== "none", taxRate: rate };
                  });
                }}
                className={fieldSelect}
              >
                <option value="none">No Tax — Unregistered</option>
                <option value="standard_21_9">Standard GRA VAT (21.9%)</option>
                <option value="flat_4">Flat Rate VAT (4%)</option>
                <option value="flat_3">Flat Rate scheme (3%)</option>
                <option value="custom">Custom Tax Rate...</option>
              </select>

              {data.taxRegistered && (
                <div className="animate-in fade-in slide-in-from-top-1">
                  <label
                    htmlFor="tax-rate"
                    className="mb-1.5 block text-[13px] font-medium text-muted-foreground"
                  >
                    Combined Tax Rate (%)
                  </label>
                  <input
                    id="tax-rate"
                    inputMode="decimal"
                    value={data.taxRate}
                    onChange={(e) =>
                      setData((d) => ({ ...d, taxRate: e.target.value, taxType: "custom" }))
                    }
                    placeholder="e.g. 21.9"
                    className={field}
                  />
                  {data.taxType === "standard_21_9" && (
                    <p className="mt-2 text-[12px] text-muted-foreground bg-amber-500/10 text-amber-600 dark:text-amber-500/80 p-2.5 rounded-lg border border-amber-500/20">
                      Standard GRA combined rate (VAT 15%, NHIL 2.5%, GETFund 2.5%, Covid-19 1%) totals exactly <strong>21.9%</strong>.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      );

    case "brand": {
      return (
        <div className="space-y-5">
          <div>
            {formStepLabel ? (
              <p className={label}>{formStepLabel}</p>
            ) : null}
            <h2 className="mt-1 font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              Logo &amp; receipt text
            </h2>
            <p className="mt-2 text-[15px] text-muted-foreground">
              Optional for now—defaults work until you add artwork. Preview
              updates as you type (thermal-style, ~58mm).
            </p>
          </div>
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr,auto] lg:items-start lg:gap-10">
            <div className="min-w-0 space-y-4">
              <div>
                <label className="mb-2 block text-[13px] font-medium text-muted-foreground">
                  Logo
                </label>
                <div className="flex flex-col items-start gap-3">
                  {data.logoDataUrl ? (
                    <div className="relative group overflow-hidden rounded-xl border border-[#bfc9c3]/35 dark:border-white/[0.12]">
                      <img
                        src={data.logoDataUrl}
                        alt="Logo preview"
                        className="h-20 w-auto object-contain bg-white dark:bg-transparent"
                      />
                      <button
                        type="button"
                        onClick={() => setData((d) => ({ ...d, logoDataUrl: null }))}
                        className="absolute inset-0 flex items-center justify-center bg-black/50 text-white opacity-0 transition-opacity group-hover:opacity-100 text-[13px] font-medium"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <UploadButton
                      endpoint="storeLogo"
                      onClientUploadComplete={(res) => {
                        const url = res?.[0]?.url;
                        if (url) setData((d) => ({ ...d, logoDataUrl: url }));
                      }}
                      onUploadError={(error: Error) => {
                        console.error("Upload error:", error);
                      }}
                      appearance={{
                        button: "ut-ready:bg-[#003527] ut-uploading:cursor-not-allowed bg-[#006c49] text-white rounded-full px-6 py-2 text-[14px] font-medium transition-all hover:opacity-90 dark:bg-[#6ffbbe] dark:text-[#003527]",
                        allowedContent: "text-muted-foreground text-[12px] mt-2",
                      }}
                    />
                  )}
                </div>
              </div>
              <div>
                <label
                  htmlFor="rh"
                  className="mb-1.5 block text-[13px] font-medium text-muted-foreground"
                >
                  Receipt header
                </label>
                <textarea
                  id="rh"
                  rows={2}
                  value={data.receiptHeader}
                  onChange={(e) =>
                    setData((d) => ({ ...d, receiptHeader: e.target.value }))
                  }
                  placeholder="Line 1: store name or tagline"
                  className={`${field} min-h-[4rem] resize-y`}
                />
              </div>
              <div>
                <label
                  htmlFor="rf"
                  className="mb-1.5 block text-[13px] font-medium text-muted-foreground"
                >
                  Receipt footer
                </label>
                <textarea
                  id="rf"
                  rows={2}
                  value={data.receiptFooter}
                  onChange={(e) =>
                    setData((d) => ({ ...d, receiptFooter: e.target.value }))
                  }
                  placeholder="Thank you, return policy, socials…"
                  className={`${field} min-h-[4rem] resize-y`}
                />
              </div>
            </div>
            <div className="flex justify-center lg:sticky lg:top-24 lg:justify-end lg:self-start">
              <ReceiptThermalPreview data={data} />
            </div>
          </div>
        </div>
      );
    }

    case "hours": {
      const days = [
        { key: "monday", label: "Monday" },
        { key: "tuesday", label: "Tuesday" },
        { key: "wednesday", label: "Wednesday" },
        { key: "thursday", label: "Thursday" },
        { key: "friday", label: "Friday" },
        { key: "saturday", label: "Saturday" },
        { key: "sunday", label: "Sunday" },
      ] as const;

      return (
        <div className="space-y-5 max-w-2xl">
          <div>
            {formStepLabel ? (
              <p className={label}>{formStepLabel}</p>
            ) : null}
            <h2 className="mt-1 font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              Weekly schedule
            </h2>
            <p className="mt-2 text-[15px] text-muted-foreground">
              Define your regular operating hours. Set days to closed if you don't operate.
            </p>
          </div>
          <div className="space-y-3">
            {days.map(({ key, label }) => {
              const dayData = data.schedule[key];
              return (
                <div key={key} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-[#eef0f2] bg-white p-4 dark:border-white/[0.08] dark:bg-[#111]">
                  <div className="flex items-center gap-3 sm:w-40">
                    <label className="relative inline-flex cursor-pointer items-center shrink-0">
                      <input
                        type="checkbox"
                        checked={dayData.isOpen}
                        onChange={(e) => setData(d => ({ ...d, schedule: { ...d.schedule, [key]: { ...d.schedule[key], isOpen: e.target.checked } } }))}
                        className="peer sr-only"
                      />
                      <div className="peer h-5 w-9 rounded-full bg-muted/30 after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-[#006c49] peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none dark:border-gray-600 dark:bg-zinc-700 dark:peer-checked:bg-[#6ffbbe]"></div>
                    </label>
                    <span className={`text-[14px] font-medium leading-none ${dayData.isOpen ? 'text-foreground' : 'text-muted-foreground'}`}>{label}</span>
                  </div>

                  <div className={`flex items-center gap-3 transition-opacity ${dayData.isOpen ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}>
                    <input
                      type="time"
                      value={dayData.openTime}
                      onChange={(e) => setData(d => ({ ...d, schedule: { ...d.schedule, [key]: { ...d.schedule[key], openTime: e.target.value } } }))}
                      className="w-[110px] rounded-lg border border-[#eef0f2] bg-transparent px-3 py-2 text-[14px] font-medium text-foreground outline-none focus:border-[#006c49] dark:border-white/[0.12] dark:focus:border-[#6ffbbe]"
                    />
                    <span className="text-muted-foreground text-[13px] font-medium">to</span>
                    <input
                      type="time"
                      value={dayData.closeTime}
                      onChange={(e) => setData(d => ({ ...d, schedule: { ...d.schedule, [key]: { ...d.schedule[key], closeTime: e.target.value } } }))}
                      className="w-[110px] rounded-lg border border-[#eef0f2] bg-transparent px-3 py-2 text-[14px] font-medium text-foreground outline-none focus:border-[#006c49] dark:border-white/[0.12] dark:focus:border-[#6ffbbe]"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    case "structure":
      return (
        <div className="space-y-6">
          <div>
            {formStepLabel ? (
              <p className={label}>{formStepLabel}</p>
            ) : null}
            <h2 className="mt-1 font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              How do you operate?
            </h2>
            <p className="mt-2 text-[15px] text-muted-foreground">
              One shop today, or several branches—you can add branches next.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {(
              [
                {
                  id: "single" as const,
                  title: "Single location",
                  desc: "One store, one POS.",
                },
                {
                  id: "multi" as const,
                  title: "Multiple branches",
                  desc: "Head office + outlets.",
                },
              ] as const
            ).map((opt) => {
              const selected = data.structure === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() =>
                    setData((d) => ({ ...d, structure: opt.id }))
                  }
                  className={`rounded-xl px-4 py-4 text-left transition-colors ${selected
                    ? "bg-[#003527]/10 ring-2 ring-[#006c49] dark:bg-[#6ffbbe]/10 dark:ring-[#6ffbbe]"
                    : "bg-surface-card hover:bg-surface-elevated dark:bg-[#141414] dark:hover:bg-[#1a1a1a]"
                    }`}
                >
                  <span className="font-medium text-foreground">
                    {opt.title}
                  </span>
                  <span className="mt-1 block text-[13px] text-muted-foreground">
                    {opt.desc}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      );

    case "branches":
      return (
        <MultiBranchStepContent
          formStepLabel={formStepLabel}
          data={data}
          setData={setData}
        />
      );

    case "billing": {
      // If starter, they shouldn't even see this step (it skips via canProceed logic), 
      // but just in case, show a simple message
      if (data.plan === "starter") {
        return (
          <div className="space-y-6 text-center py-12">
            <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight">
              Starter Plan Selected
            </h2>
            <p className="text-muted-foreground">Your free plan is active. You can proceed.</p>
            <button
              onClick={() => setData(d => ({ ...d, billingComplete: true }))}
              className="mt-4 px-6 py-2 bg-[#006c49] text-white rounded-lg font-medium hover:bg-[#005a3c]"
            >
              Continue Validation
            </button>
          </div>
        );
      }

      const planDetails = PLANS.find(p => p.id === data.plan);
      const amount = data.cycle === "monthly" 
        ? planDetails?.priceMonthly ?? 0
        : planDetails?.priceAnnually ?? 0;

      return (
        <div className="space-y-6 max-w-lg mx-auto">
          <div className="text-center mb-8">
            {formStepLabel ? (
              <p className="text-sm font-medium text-muted-foreground mb-2">{formStepLabel}</p>
            ) : null}
            <h2 className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
              Complete your subscription
            </h2>
            <p className="mt-2 text-base text-muted-foreground">
              You selected the {data.plan} plan ({data.cycle}). Please complete your payment to unlock these features.
            </p>
          </div>
          
          <PaymentFlow
            plan={data.plan as "growth" | "pro"}
            cycle={data.cycle}
            amountGHS={amount}
            onSuccess={() => {
              setData(d => ({ ...d, billingComplete: true }));
            }}
          />
        </div>
      );
    }

    case "checklist": {
      const row = (done: boolean, title: string, hint: string) => (
        <div className="flex gap-3 rounded-xl border border-[#bfc9c3]/15 bg-surface-card px-4 py-3 dark:border-white/[0.08] dark:bg-[#141414]">
          <span
            className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold ${done
              ? "bg-[#003527]/15 text-[#006c49] dark:bg-[#6ffbbe]/15 dark:text-[#6ffbbe]"
              : "bg-muted text-muted-foreground"
              }`}
            aria-hidden
          >
            {done ? "✓" : "·"}
          </span>
          <div>
            <p className="font-medium text-foreground">{title}</p>
            <p className="mt-0.5 text-[13px] text-muted-foreground">{hint}</p>
          </div>
        </div>
      );
      return (
        <div className="space-y-6">
          <div>
            {formStepLabel ? (
              <p className={label}>{formStepLabel}</p>
            ) : null}
            <h2 className="mt-1 font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              Setup checklist
            </h2>
            <p className="mt-2 text-[15px] text-muted-foreground">
              You&apos;ve covered the essentials. Here&apos;s what&apos;s in
              place before you open the dashboard.
            </p>
          </div>
          <div className="space-y-2">
            {row(true, "Business profile & contact", "Legal name, phone, email")}
            {row(true, "Address & region", "Street, city, Ghana region")}
            {row(true, "Money & tax", "GHS and optional VAT / NHIL rate")}
            {row(
              !!(data.logoDataUrl || data.receiptHeader || data.receiptFooter),
              "Receipt branding",
              "Logo or header/footer text (optional)",
            )}
            {row(true, "Weekly schedule", "Mon-Sun operating hours configured")}
            {row(
              data.structure != null,
              "Structure",
              data.structure === "multi"
                ? `Multi-branch — ${data.branches.length} outlet(s)`
                : "Single location",
            )}
          </div>
        </div>
      );
    }

    case "guided":
      return (
        <div className="space-y-6">
          <div>
            {formStepLabel ? (
              <p className={label}>{formStepLabel}</p>
            ) : null}
            <h2 className="mt-1 font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              What&apos;s next
            </h2>
            <p className="mt-2 text-[15px] text-muted-foreground">
              Short intros to the areas you&apos;ll use most after setup. You
              can dive in from the home dashboard—no need to finish everything
              today.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {(
              [
                {
                  t: "Products",
                  d: "Catalogue items, prices, and stock so the POS can ring sales.",
                },
                {
                  t: "Staff",
                  d: "Invite cashiers and managers with the right access.",
                },
                {
                  t: "Finance",
                  d: "Daily totals, tax lines, and payouts—aligned with GHS receipts.",
                },
                {
                  t: "POS",
                  d: "Fast checkout, Mobile Money, and printed or digital receipts.",
                },
              ] as const
            ).map((x) => (
              <div
                key={x.t}
                className="rounded-xl border border-[#bfc9c3]/15 bg-surface-card px-4 py-4 dark:border-white/[0.08] dark:bg-[#141414]"
              >
                <p className="font-medium text-foreground">{x.t}</p>
                <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
                  {x.d}
                </p>
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-dashed border-[#bfc9c3]/35 bg-surface-elevated/50 px-4 py-3 text-[13px] text-muted-foreground dark:border-white/[0.12]">
            <span className="font-medium text-foreground">First sale: </span>
            add at least one product and open the POS when you&apos;re ready—your
            receipt template is already tuned for Ghana.
          </div>
        </div>
      );

    default:
      return null;
  }
}

export function OnboardingCompletePanel({
  data,
}: {
  data: OnboardingData;
}) {
  const multi = data.structure === "multi";
  return (
    <div className="space-y-8 text-center">
      <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-[#003527]/10 text-[#006c49] dark:bg-[#6ffbbe]/10 dark:text-[#6ffbbe]">
        <svg
          className="size-8"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M5 13l4 4L19 7"
          />
        </svg>
      </div>
      <div className="space-y-3">
        <p className="text-[13px] font-medium uppercase tracking-wide text-muted-foreground">
          Setup complete
        </p>
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Welcome to VentraPOS
        </h2>
        <p className="mx-auto max-w-md text-[15px] leading-relaxed text-muted-foreground">
          <span className="font-medium text-foreground">
            {data.storeName || "Your store"}
          </span>{" "}
          is configured for{" "}
          <span className="text-foreground">Ghana (GHS)</span> with local
          addressing and receipt defaults. Head to home to add inventory,
          invite staff, and start selling.
        </p>
      </div>
      {multi ? (
        <div className="mx-auto max-w-md rounded-xl border border-[#bfc9c3]/15 bg-surface-card px-4 py-4 text-left text-[14px] dark:border-white/[0.08] dark:bg-[#141414]">
          <p className="text-[12px] font-medium uppercase tracking-wide text-muted-foreground">
            Branches
          </p>
          <ul className="mt-2 space-y-1.5 text-foreground leading-snug">
            {data.branches.map((b, i) => (
              <li key={b.id}>
                <span className="font-medium text-foreground">{b.isMain ? "Main: " : `Outlet ${i + 1}: `}</span>
                {b.name || "Unnamed"}
                {b.region ? ` · ${b.region}` : ""}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[13px] text-muted-foreground">
            Add or manage outlets anytime under branch settings.
          </p>
        </div>
      ) : null}
      <p className="mx-auto max-w-sm text-[13px] text-muted-foreground">
        Tip: keep your receipt header short on thermal paper; you can tweak
        branding and tax lines under settings.
      </p>
    </div>
  );
}
