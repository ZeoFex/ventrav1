"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ONBOARDING_PREFILL_KEY,
  consumeOnboardingPrefill,
  type OnboardingPrefillPayload,
} from "@/app/lib/onboarding-prefill";
import { ThemeToggle } from "@/app/components/theme-toggle";
import {
  BRANCH_STEP_IDS,
  buildOnboardingSteps,
  canProceedStep,
} from "./constants";
import {
  OnboardingCompletePanel,
  OnboardingStepContent,
} from "./onboarding-step-content";
import { defaultOnboardingData, type OnboardingData } from "./types";

const branchIdSet = new Set<string>(BRANCH_STEP_IDS);

/** Per-device cache so a user's half-filled wizard survives a browser crash
 *  even if the server save didn't complete. Cleared on success. */
const LOCAL_PROGRESS_KEY = "ventrapos.onboarding.progress";

/** How long to wait after the last edit before syncing to the server. */
const SERVER_SAVE_DEBOUNCE_MS = 1_000;

type StoredProgress = {
  stepIndex?: number;
  data?: Partial<OnboardingData>;
  updatedAt?: string;
};

function readLocalProgress(): StoredProgress | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LOCAL_PROGRESS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as StoredProgress) : null;
  } catch {
    return null;
  }
}

function writeLocalProgress(snap: StoredProgress): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LOCAL_PROGRESS_KEY, JSON.stringify(snap));
  } catch {
    /* quota / private mode — ignore */
  }
}

function clearLocalProgress(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(LOCAL_PROGRESS_KEY);
  } catch {
    /* ignore */
  }
}

/** Merge a saved snapshot over the defaults, tolerating missing/extra keys. */
function mergeProgress(
  base: OnboardingData,
  stored: Partial<OnboardingData> | undefined,
): OnboardingData {
  if (!stored || typeof stored !== "object") return base;
  return { ...base, ...stored };
}

/** Apply signup-handoff prefill to a partially-filled snapshot, only
 *  filling blanks so we never clobber what the user typed after signup. */
function applyPrefill(
  snapshot: OnboardingData,
  prefill: OnboardingPrefillPayload | null,
): OnboardingData {
  if (!prefill) return snapshot;
  const next: OnboardingData = { ...snapshot };
  if (prefill.email && !next.email) next.email = prefill.email;
  if (prefill.storeName && !next.storeName) next.storeName = prefill.storeName;
  if (prefill.legalName && !next.legalName) next.legalName = prefill.legalName;
  if (prefill.plan) {
    next.plan = prefill.plan as OnboardingData["plan"];
    next.billingComplete = next.billingComplete || !!prefill.paid;
  }
  if (prefill.cycle) next.cycle = prefill.cycle as OnboardingData["cycle"];
  return next;
}

export function OnboardingView() {
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);
  const [data, setData] = useState<OnboardingData>(defaultOnboardingData);
  const prevStructureRef = useRef(data.structure);

  const [isHydrated, setIsHydrated] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const steps = useMemo(
    () => buildOnboardingSteps(data.structure, data.plan),
    [data.structure, data.plan],
  );

  const currentStepId = steps[stepIndex];
  const isCompleteStep = currentStepId === "complete";

  // ─── Hydrate: server → local cache → signup prefill ────────────
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const prefill = consumeOnboardingPrefill();
      let hydrated = false;

      try {
        const res = await fetch("/api/onboarding/progress", {
          cache: "no-store",
          credentials: "same-origin",
        });
        if (res.ok) {
          const json = (await res.json()) as {
            onboardingCompleted: boolean;
            progress: StoredProgress | null;
          };
          if (cancelled) return;

          // Already finished — no reason to be on the wizard.
          if (json.onboardingCompleted) {
            clearLocalProgress();
            router.replace("/dashboard");
            return;
          }

          if (json.progress) {
            const saved = json.progress;
            setData((d) => applyPrefill(mergeProgress(d, saved.data), prefill));
            if (typeof saved.stepIndex === "number") {
              setStepIndex(Math.max(0, saved.stepIndex));
            }
            hydrated = true;
          }
        }
      } catch {
        /* offline or server error — fall back to local cache */
      }

      if (!hydrated) {
        const local = readLocalProgress();
        if (local) {
          setData((d) => applyPrefill(mergeProgress(d, local.data), prefill));
          if (typeof local.stepIndex === "number") {
            setStepIndex(Math.max(0, local.stepIndex));
          }
          hydrated = true;
        }
      }

      if (!hydrated && prefill) {
        setData((d) => applyPrefill(d, prefill));
      }

      if (!cancelled) setIsHydrated(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  // ─── Persist on every edit (localStorage instantly, server debounced) ──
  useEffect(() => {
    if (!isHydrated) return;
    if (isCompleteStep) return; // don't over-write the server after finish

    const snap: StoredProgress = {
      stepIndex,
      data,
      updatedAt: new Date().toISOString(),
    };
    writeLocalProgress(snap);

    const timeout = window.setTimeout(() => {
      void fetch("/api/onboarding/progress", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(snap),
        credentials: "same-origin",
        keepalive: true,
      }).catch(() => {
        /* swallow — local cache is still authoritative for recovery */
      });
    }, SERVER_SAVE_DEBOUNCE_MS);

    return () => window.clearTimeout(timeout);
  }, [isHydrated, isCompleteStep, stepIndex, data]);

  // ─── Structure change resets branch-only steps back to a sane index ────
  useEffect(() => {
    const prev = prevStructureRef.current;
    prevStructureRef.current = data.structure;
    if (prev === "multi" && data.structure === "single") {
      setStepIndex((i) => {
        const multiSteps = buildOnboardingSteps("multi", data.plan);
        const idAt = multiSteps[i];
        if (idAt && branchIdSet.has(idAt)) {
          return buildOnboardingSteps("single", data.plan).indexOf("checklist");
        }
        const nextSteps = buildOnboardingSteps("single", data.plan);
        return Math.min(i, nextSteps.length - 1);
      });
    }
  }, [data.structure, data.plan]);

  useEffect(() => {
    setStepIndex((i) => Math.min(i, Math.max(0, steps.length - 1)));
  }, [steps.length]);

  useEffect(() => {
    if (currentStepId !== "branches") return;
    setData((d) => {
      let changed = false;
      const newBranches = d.branches.map((b) => {
        if (b.isMain) {
          const nextB = { ...b };
          if (!nextB.name.trim() && d.storeName.trim()) {
            nextB.name = d.storeName;
            changed = true;
          }
          if (!nextB.region && d.region) {
            nextB.region = d.region;
            changed = true;
          }
          return nextB;
        }
        return b;
      });
      return changed ? { ...d, branches: newBranches } : d;
    });
  }, [currentStepId]);

  const contentMax =
    stepIndex === 0 && !isCompleteStep ? "max-w-6xl" : "max-w-2xl";

  const lastProgressIndex = Math.max(0, steps.length - 2);

  const progress = useMemo(() => {
    if (isCompleteStep) return 100;
    return Math.round((stepIndex / lastProgressIndex) * 100);
  }, [stepIndex, isCompleteStep, lastProgressIndex]);

  const nextDisabled = !canProceedStep(currentStepId, data);

  const goNext = useCallback(() => {
    if (nextDisabled) return;
    setStepIndex((i) => Math.min(i + 1, steps.length - 1));
  }, [nextDisabled, steps.length]);

  const goBack = useCallback(() => {
    if (stepIndex <= 0) return;
    setStepIndex((i) => i - 1);
  }, [stepIndex]);

  const handleComplete = useCallback(async () => {
    setIsSaving(true);
    setSaveError(null);

    try {
      const res = await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessType: data.businessType,
          storeName: data.storeName,
          legalName: data.legalName,
          registrationId: data.registrationId,
          phone: data.phone,
          email: data.email,
          addressLine: data.addressLine,
          city: data.city,
          region: data.region,
          currency: data.currency,
          locale: data.locale,
          taxRegistered: data.taxRegistered,
          taxType: data.taxType,
          taxRate: data.taxRate,
          logoUrl: data.logoDataUrl,
          receiptHeader: data.receiptHeader,
          receiptFooter: data.receiptFooter,
          schedule: data.schedule,
          structure: data.structure,
          branches: data.structure === "multi"
            ? data.branches.map((b) => ({
              name: b.name,
              region: b.region,
              isMain: b.isMain,
            }))
            : [],
          plan: data.plan,
          cycle: data.cycle,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const details = err.details
          ? " -> " + Object.entries(err.details).map(([k, v]) => `${k}: ${v}`).join("; ")
          : "";
        setSaveError((err.error || "Failed to save") + details);
        return;
      }

      clearLocalProgress();
      sessionStorage.removeItem(ONBOARDING_PREFILL_KEY);
      router.push("/dashboard");
    } catch {
      setSaveError("Network error. Please check your connection.");
    } finally {
      setIsSaving(false);
    }
  }, [data, router]);

  if (!isHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div
          className="flex items-center gap-3 text-sm text-muted-foreground"
          role="status"
          aria-live="polite"
        >
          <svg
            className="size-5 animate-spin text-[#006c49]"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          Picking up where you left off…
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b border-[#bfc9c3]/15 bg-background/90 backdrop-blur-md dark:border-white/[0.06]">
        <div
          className={`mx-auto flex items-center justify-between gap-4 px-4 py-3 sm:px-6 ${contentMax}`}
        >
          <Link
            href="/"
            className="font-[family-name:var(--font-display)] text-sm font-semibold tracking-tight text-foreground"
          >
            VentraPOS
          </Link>
          <div className="flex flex-1 items-center justify-center px-4">
            <div
              className="h-1 w-full max-w-[200px] overflow-hidden rounded-full bg-surface-elevated dark:bg-[#262626]"
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#003527] to-[#064e3b] transition-[width] duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main
        className={`mx-auto px-4 pb-28 pt-10 sm:px-6 sm:pt-14 ${contentMax}`}
      >
        <div key={stepIndex} className="transition-opacity duration-300">
          {isCompleteStep ? (
            <OnboardingCompletePanel data={data} />
          ) : (
            <OnboardingStepContent
              stepId={currentStepId}
              stepIndex={stepIndex}
              steps={steps}
              data={data}
              setData={setData}
            />
          )}
        </div>
      </main>

      <footer className="fixed bottom-0 left-0 right-0 z-20 border-t border-[#bfc9c3]/15 bg-background/95 backdrop-blur-md dark:border-white/[0.06]">
        <div
          className={`mx-auto flex flex-col items-center gap-2 px-4 py-4 sm:px-6 ${contentMax}`}
        >
          {saveError && (
            <p className="w-full text-center text-[13px] font-medium text-red-500">
              {saveError}
            </p>
          )}
          <div className="flex w-full items-center justify-between gap-3">
            <button
              type="button"
              onClick={goBack}
              disabled={stepIndex === 0}
              className="min-h-[44px] rounded-full px-4 text-[15px] font-medium text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
            >
              Back
            </button>
            {isCompleteStep ? (
              <button
                type="button"
                onClick={handleComplete}
                disabled={isSaving}
                className="min-h-[44px] min-w-[140px] rounded-full bg-gradient-to-br from-[#003527] to-[#064e3b] px-6 text-[15px] font-semibold text-white shadow-[0_12px_32px_-12px_rgba(0,53,39,0.35)] transition-[filter] hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60 dark:shadow-[0_12px_32px_-12px_rgba(0,0,0,0.5)]"
              >
                {isSaving ? (
                  <span className="flex items-center gap-2">
                    <svg className="size-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                    Saving…
                  </span>
                ) : (
                  "Go to dashboard"
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={goNext}
                disabled={nextDisabled}
                className="min-h-[44px] min-w-[140px] rounded-full bg-gradient-to-br from-[#003527] to-[#064e3b] px-6 text-[15px] font-semibold text-white shadow-[0_12px_32px_-12px_rgba(0,53,39,0.35)] transition-[filter] hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-45 dark:shadow-[0_12px_32px_-12px_rgba(0,0,0,0.5)]"
              >
                {stepIndex === 0 ? "Continue" : "Next"}
              </button>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
