import type { Metadata } from "next";
import { ReferenceClient } from "./reference-client";

export const metadata: Metadata = {
  title: "API reference",
  description: "VentraPOS HTTP API (OpenAPI 3.1)",
  robots: { index: false, follow: false },
};

export default function ApiReferencePage() {
  return (
    <div className="h-dvh w-full min-h-0">
      <ReferenceClient />
    </div>
  );
}
