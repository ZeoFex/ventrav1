import type { LucideIcon } from "lucide-react";
import { Banknote, CreditCard, Smartphone } from "lucide-react";

export type GhanaPaymentMethodId =
  | "cash"
  | "mtn_momo"
  | "vodafone_cash"
  | "airteltigo_money"
  | "card";

export type GhanaPaymentMethod = {
  id: GhanaPaymentMethodId;
  label: string;
  shortLabel: string;
  hint: string;
  icon: LucideIcon;
  /** If true, show "amount received" and change (cash-style). */
  usesTenderAndChange: boolean;
};

export const GHANA_PAYMENT_METHODS: GhanaPaymentMethod[] = [
  {
    id: "cash",
    label: "Cash (GHS)",
    shortLabel: "Cash",
    hint: "Count notes & coins",
    icon: Banknote,
    usesTenderAndChange: true,
  },
  {
    id: "mtn_momo",
    label: "MTN Mobile Money",
    shortLabel: "MTN MoMo",
    hint: "Customer pays from MTN wallet",
    icon: Smartphone,
    usesTenderAndChange: false,
  },
  {
    id: "vodafone_cash",
    label: "Telecel Cash",
    shortLabel: "Telecel Cash",
    hint: "Former Vodafone Cash",
    icon: Smartphone,
    usesTenderAndChange: false,
  },
  {
    id: "airteltigo_money",
    label: "AirtelTigo Money",
    shortLabel: "AT Money",
    hint: "AirtelTigo mobile money",
    icon: Smartphone,
    usesTenderAndChange: false,
  },
  {
    id: "card",
    label: "Card",
    shortLabel: "Card",
    hint: "Debit / credit on terminal",
    icon: CreditCard,
    usesTenderAndChange: false,
  },
];

export function getPaymentMethod(
  id: GhanaPaymentMethodId,
): GhanaPaymentMethod | undefined {
  return GHANA_PAYMENT_METHODS.find((m) => m.id === id);
}
