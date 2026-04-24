export type BusinessTypeId =
  | "retail"
  | "restaurant"
  | "pharmacy"
  | "supermarket"
  | "mini_mart"
  | "boutique"
  | "electronics"
  | "cold_store"
  | "other";

export type StoreStructure = "single" | "multi" | null;

export type DaySchedule = {
  isOpen: boolean;
  openTime: string;
  closeTime: string;
};

export type WeeklySchedule = {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
};

export type TaxType = "standard_21_9" | "flat_4" | "flat_3" | "custom" | "none";

export type BranchData = {
  id: string; // unique internal id for the form
  name: string;
  region: string;
  isMain: boolean;
};

export type OnboardingData = {
  businessType: BusinessTypeId | null;
  storeName: string;
  legalName: string;
  registrationId: string;
  phone: string;
  email: string;
  addressLine: string;
  city: string;
  region: string;
  currency: string;
  locale: string;
  taxRegistered: boolean;
  taxType: TaxType;
  taxRate: string;
  logoDataUrl: string | null;
  receiptHeader: string;
  receiptFooter: string;
  schedule: WeeklySchedule;
  structure: StoreStructure;
  plan: "starter" | "growth" | "pro";
  cycle: "monthly" | "annually";
  billingComplete: boolean;
  /** Multi-branch flow: Array of branches. */
  branches: BranchData[];
};

export const defaultOnboardingData = (): OnboardingData => ({
  businessType: null,
  storeName: "",
  legalName: "",
  registrationId: "",
  phone: "",
  email: "",
  addressLine: "",
  city: "",
  region: "",
  currency: "GHS",
  locale: "en-GH",
  taxRegistered: false,
  taxType: "none",
  taxRate: "0",
  logoDataUrl: null,
  receiptHeader: "",
  receiptFooter: "",
  schedule: {
    monday: { isOpen: true, openTime: "09:00", closeTime: "18:00" },
    tuesday: { isOpen: true, openTime: "09:00", closeTime: "18:00" },
    wednesday: { isOpen: true, openTime: "09:00", closeTime: "18:00" },
    thursday: { isOpen: true, openTime: "09:00", closeTime: "18:00" },
    friday: { isOpen: true, openTime: "09:00", closeTime: "18:00" },
    saturday: { isOpen: true, openTime: "09:00", closeTime: "18:00" },
    sunday: { isOpen: false, openTime: "09:00", closeTime: "18:00" },
  },
  structure: null,
  plan: "starter",
  cycle: "annually",
  billingComplete: false,
  branches: [
    { id: "main-1", name: "", region: "", isMain: true }
  ],
});
