import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "VentraPOS — Run your store from one place",
    short_name: "VentraPOS",
    description:
      "Cloud POS and business operations for supermarkets, pharmacies, restaurants, and growing retailers.",
    // Public landing page — stable 200 HTML for every visitor. Using `/dashboard`
    // here breaks install because logged-out users are redirected to `/login`, which
    // confuses Workbox “dynamic start URL” handling during the SW install phase.
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#003527",
    icons: [
      {
        src: "/logo.jpg",
        sizes: "192x192",
        type: "image/jpeg",
        purpose: "any",
      },
      {
        src: "/logo.jpg",
        sizes: "512x512",
        type: "image/jpeg",
        purpose: "maskable",
      },
    ],
  };
}
