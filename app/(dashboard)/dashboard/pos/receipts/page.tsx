import type { Metadata } from "next";
import { PosReprintReceiptsClient } from "@/app/components/dashboard/pos/pos-reprint-receipts-client";

export const metadata: Metadata = {
  title: "Reprint receipts | VentraPOS",
};

export default function PosReprintReceiptsPage() {
  return <PosReprintReceiptsClient />;
}
