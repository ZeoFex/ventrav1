"use client";

import { ApiReferenceReact } from "@scalar/api-reference-react";
import "@scalar/api-reference-react/style.css";

/**
 * OpenAPI 3.1 served from `public/openapi.json`. Regenerate: `node scripts/generate-openapi.mjs`
 */
export function ReferenceClient() {
  return <ApiReferenceReact configuration={{ url: "/openapi.json" }} />;
}
