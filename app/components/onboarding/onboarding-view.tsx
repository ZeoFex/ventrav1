"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ONBOARDING_PREFILL_KEY } from "@/app/lib/onboarding-prefill";
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

export function OnboardingView() {
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);
  const [data, setData] = useState<OnboardingData>(defaultOnboardingData);
  const prevStructureRef = useRef(data.structure);

  // Auth context from signup → prefill handoff
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const steps = useMemo(
    () => buildOnboardingSteps(data.structure, data.plan),
    [data.structure, data.plan],
  );

  const currentStepId = steps[stepIndex];

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(ONBOARDING_PREFILL_KEY);
      if (!raw) return;
      sessionStorage.removeItem(ONBOARDING_PREFILL_KEY);
      const p = JSON.parse(raw) as {
        businessId?: string;
        userId?: string;
        email?: string;
        storeName?: string;
        legalName?: string;
        plan?: string;
        cycle?: string;
      };
      if (p.businessId) setBusinessId(p.businessId);
      if (p.userId) setUserId(p.userId);
      setData((d) => ({
        ...d,
        ...(typeof p.email === "string" && p.email ? { email: p.email } : {}),
        ...(typeof p.storeName === "string" && p.storeName
          ? { storeName: p.storeName }
          : {}),
        ...(typeof p.legalName === "string" && p.legalName
          ? { legalName: p.legalName }
          : {}),
        ...(typeof p.plan === "string" && p.plan
          ? { plan: p.plan, billingComplete: p.plan === "starter" } // Auto-complete for free starter plan
          : {}),
        ...(typeof p.cycle === "string" && p.cycle
          ? { cycle: p.cycle }
          : {}),
      }));
    } catch {
      /* ignore */
    }
  }, []);

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
  }, [data.structure]);

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

  const isCompleteStep = currentStepId === "complete";
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

      // Cleanup prefill only on success
      sessionStorage.removeItem(ONBOARDING_PREFILL_KEY);
      router.push("/dashboard");
    } catch {
      setSaveError("Network error. Please check your connection.");
    } finally {
      setIsSaving(false);
    }
  }, [data, router]);

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

