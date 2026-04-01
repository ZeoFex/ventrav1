import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/dashboard/", "/api/", "/onboarding/"],
      },
    ],
    sitemap: "https://ventrapos.vercel.app/sitemap.xml",
  };
}
