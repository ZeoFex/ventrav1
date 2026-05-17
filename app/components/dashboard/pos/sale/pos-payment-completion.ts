import type { GhanaPaymentMethodId } from "./pos-payment-methods";

/** Result from the POS payment step (single tender or multiple allocations). */
export type PosPaymentCompletion =
    | {
          kind: "single";
          methodId: GhanaPaymentMethodId;
          amountTenderedGhs: number;
          changeGhs: number;
      }
    | {
          kind: "multi";
          lines: { methodId: GhanaPaymentMethodId; amountGhs: number }[];
      }
    /** Layaway: reserve stock with no payment captured yet. */
    | {
          kind: "reserve_only";
      };
