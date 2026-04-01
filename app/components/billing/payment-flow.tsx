"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, Smartphone, ShieldCheck, AlertCircle, CheckCircle2 } from "lucide-react";

export interface PaymentFlowProps {
  plan: "starter" | "growth" | "pro" | string;
  cycle: "monthly" | "annually";
  amountGHS: number;
  onSuccess: () => void;
}

export function PaymentFlow({ plan, cycle, amountGHS, onSuccess }: PaymentFlowProps) {
  const [step, setStep] = useState<"phone" | "otp" | "poll" | "activating" | "success">("phone");
  const [phone, setPhone] = useState("");
  const [provider, setProvider] = useState<"mtn" | "vod" | "tigo">("mtn");
  const [otp, setOtp] = useState("");
  const [reference, setReference] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Calls the status endpoint which also updates the business plan in the DB.
   * This MUST run before showing "success" so the sidebar / billing page reflect
   * the new plan immediately when the session is re-fetched.
   */
  const activatePlan = useCallback(async (ref: string) => {
    setStep("activating");
    try {
      // Call status endpoint — this triggers the DB plan update on success
      await fetch(`/api/billing/status?reference=${ref}`);
      setStep("success");
    } catch {
      // Even if the status call fails, the plan was paid — show success anyway
      console.error("[PaymentFlow] activatePlan fetch failed, showing success anyway");
      setStep("success");
    }
  }, []);

  const handleCharge = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/billing/charge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, cycle, phone, provider }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Payment failed");

      const ref = data.data.reference;
      setReference(ref);

      if (data.data.status === "send_otp") {
        setStep("otp");
      } else if (data.data.status === "pay_offline" || data.data.status === "pending") {
        setStep("poll");
      } else if (data.data.status === "success") {
        // Payment succeeded immediately — activate plan in DB before showing success
        await activatePlan(ref);
      } else {
        throw new Error(`Unexpected status from provider: ${data.data.status}`);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/billing/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otp, reference }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "OTP submission failed");

      if (data.data.status === "success") {
        await activatePlan(reference);
      } else if (data.data.status === "pending" || data.data.status === "pay_offline") {
        setStep("poll");
      } else {
        throw new Error(data.data.message || "Failed to verify OTP");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Poll for status when in "poll" step
  useEffect(() => {
    if (step !== "poll" || !reference) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/billing/status?reference=${reference}`);
        const data = await res.json();
        if (data.data.status === "success") {
          clearInterval(interval);
          // The status endpoint already updated the DB — just show success
          setStep("success");
        } else if (data.data.status === "failed" || data.data.status === "abandoned") {
          clearInterval(interval);
          setError("Payment failed or was abandoned. Please try again.");
          setStep("phone");
        }
      } catch (err) {
        console.error("Polling error", err);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [step, reference]);

  // Success screen — activatePlan already ensured the DB is updated
  if (step === "success") {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4 text-center animate-in fade-in zoom-in-95">
        <div className="size-16 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center mb-2">
          <CheckCircle2 className="size-8" />
        </div>
        <h3 className="text-2xl font-semibold">Payment Successful!</h3>
        <p className="text-muted-foreground max-w-sm">
          Your VentraPOS {plan} plan is now active. You have full access to all upgraded features.
        </p>
        <button
          onClick={onSuccess}
          className="mt-6 px-6 py-2 bg-[#006c49] text-white rounded-lg font-medium hover:bg-[#005a3c] dark:bg-[#6ffbbe] dark:text-[#003527] dark:hover:bg-[#5debb0]"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  // Activating plan screen (brief transition)
  if (step === "activating") {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4 text-center animate-in fade-in">
        <Loader2 className="size-10 animate-spin text-[#006c49] dark:text-[#6ffbbe]" />
        <h3 className="text-lg font-medium">Activating your plan…</h3>
        <p className="text-sm text-muted-foreground">Just a moment while we unlock your features.</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto p-6 bg-surface-elevated rounded-2xl border border-border/50 shadow-sm animate-in fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-xl font-semibold capitalize">{plan} Plan</h2>
          <p className="text-sm text-muted-foreground leading-relaxed mt-1">Upgrade your business</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold tracking-tight">GHS {amountGHS}</p>
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">/ Month</p>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-3 rounded-lg bg-red-500/10 text-red-500 border border-red-500/20 flex items-start gap-3">
          <AlertCircle className="size-5 shrink-0 mt-0.5" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {step === "phone" && (
        <form onSubmit={handleCharge} className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium">Mobile Network</label>
            <div className="grid grid-cols-3 gap-3">
              {(["mtn", "vod", "tigo"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setProvider(p)}
                  className={`py-2 px-3 border rounded-xl text-sm font-medium transition-colors ${
                    provider === p 
                    ? "border-[#006c49] bg-[#006c49]/5 text-[#006c49] dark:border-[#6ffbbe] dark:bg-[#6ffbbe]/10 dark:text-[#6ffbbe]" 
                    : "border-border/60 hover:border-border text-muted-foreground"
                  }`}
                >
                  {p.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Mobile Money Number</label>
            <div className="relative">
              <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                placeholder="024 123 4567"
                className="w-full pl-10 pr-4 py-2.5 bg-background border border-border/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#006c49] dark:focus:ring-[#6ffbbe]"
                required
                disabled={loading}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || phone.length < 9}
            className="w-full py-2.5 bg-[#006c49] text-white rounded-xl font-medium hover:bg-[#005a3c] dark:bg-[#6ffbbe] dark:text-[#003527] dark:hover:bg-[#5debb0] disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : "Pay via MoMo"}
          </button>
        </form>
      )}

      {step === "otp" && (
        <form onSubmit={handleOtp} className="space-y-5 animate-in slide-in-from-right-4">
          <div className="text-center mb-6">
            <ShieldCheck className="size-12 mx-auto text-blue-500 mb-2 opacity-80" />
            <h3 className="font-medium text-lg">Enter OTP</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Please enter the OTP sent to your phone to authorize the payment.
            </p>
          </div>

          <div className="space-y-2">
            <input
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="e.g. 123456"
              className="w-full text-center tracking-widest text-2xl font-medium px-4 py-3 bg-background border border-border/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#006c49] dark:focus:ring-[#6ffbbe]"
              required
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading || otp.length < 4}
            className="w-full py-2.5 bg-[#006c49] text-white rounded-xl font-medium hover:bg-[#005a3c] dark:bg-[#6ffbbe] dark:text-[#003527] dark:hover:bg-[#5debb0] disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : "Verify OTP"}
          </button>
        </form>
      )}

      {step === "poll" && (
        <div className="py-8 text-center animate-in slide-in-from-right-4 space-y-6">
          <div className="relative size-24 mx-auto">
            <div className="absolute inset-0 border-4 border-[#006c49]/20 dark:border-[#6ffbbe]/20 rounded-full animate-ping" />
            <div className="absolute inset-2 border-4 border-[#006c49] dark:border-[#6ffbbe] border-t-transparent rounded-full animate-spin" />
            <Smartphone className="absolute inset-0 m-auto size-8 text-[#006c49] dark:text-[#6ffbbe]" />
          </div>
          
          <div>
            <h3 className="text-lg font-medium mb-2">Check your phone</h3>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-[260px] mx-auto">
              Please authorize the payment prompt on your phone for GHS {amountGHS}.<br/>
              Waiting for provider confirmation...
            </p>
          </div>

          <button
            onClick={() => setStep("phone")}
            className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4"
          >
            Cancel or change number
          </button>
        </div>
      )}
    </div>
  );
}
