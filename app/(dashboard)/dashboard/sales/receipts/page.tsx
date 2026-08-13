import { redirect } from "next/navigation";

/** Legacy Sales route — reprint receipts now lives under POS. */
export default function SalesReceiptsRedirectPage() {
  redirect("/dashboard/pos/receipts");
}
