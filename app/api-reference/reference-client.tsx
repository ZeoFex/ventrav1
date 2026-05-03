"use client";

import { ApiReferenceReact } from "@scalar/api-reference-react";
import "@scalar/api-reference-react/style.css";

/**
 * OpenAPI 3.1 served from `public/openapi.json`. Regenerate: `pnpm openapi:generate`; request bodies in `scripts/openapi-request-bodies.mjs`.
 */
export function ReferenceClient() {
  return <ApiReferenceReact configuration={{ url: "/openapi.json" }} />;
}
