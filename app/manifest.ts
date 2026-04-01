import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "VentraPOS — Run your store from one place",
    short_name: "VentraPOS",
    description:
      "Cloud POS and business operations for supermarkets, pharmacies, restaurants, and growing retailers.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#003527",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
      {
        src: "/landing/ventra.png",
        sizes: "1556x750",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
