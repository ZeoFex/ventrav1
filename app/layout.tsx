import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans, Geist } from "next/font/google";
import { ThemeProvider } from "./components/theme-provider";
import NextTopLoader from "nextjs-toploader";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Analytics } from "@vercel/analytics/next"
import { SpeedInsights } from "@vercel/speed-insights/next"
import { PwaInstallBanner } from "./components/pwa-install-banner";
import { Toaster } from "sonner";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  /** Android Chrome: resize layout viewport when the virtual keyboard opens (reduces overlap) */
  interactiveWidget: "resizes-content",
};

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' });

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
});

const SITE_URL = "https://ventrapos.com";
const ADMIN_URL = "https://admin.ventrapos.com";
const OG_IMAGE = "/landing/ventra.jpg";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),

  // ── Core ──
  title: {
    default: "VentraPOS — Run your store from one place",
    template: "%s | VentraPOS",
  },
  description:
    "Cloud POS and business operations for supermarkets, pharmacies, restaurants, and growing retailers. Manage sales, inventory, staff, and analytics — anywhere, on any device.",
  keywords: [
    "POS",
    "point of sale",
    "cloud POS",
    "retail POS",
    "inventory management",
    "sales analytics",
    "Ghana POS",
    "VentraPOS",
    "business operations",
    "restaurant POS",
    "pharmacy POS",
    "supermarket POS",
  ],
  authors: [{ name: "VentraPOS", url: SITE_URL }],
  creator: "VentraPOS",
  publisher: "VentraPOS",

  // ── Open Graph ──
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: "VentraPOS",
    title: "VentraPOS — Run your store from one place",
    description:
      "Cloud POS and business operations for supermarkets, pharmacies, restaurants, and growing retailers.",
    images: [
      {
        url: OG_IMAGE,
        width: 1556,
        height: 750,
        alt: "VentraPOS dashboard — products, cart, and real-time inventory",
        type: "image/png",
      },
    ],
  },

  // ── Twitter ──
  twitter: {
    card: "summary_large_image",
    title: "VentraPOS — Run your store from one place",
    description:
      "Cloud POS for supermarkets, pharmacies, restaurants, and growing retailers.",
    images: [OG_IMAGE],
    creator: "@ventrapos",
  },

  // ── Robots ──
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },

  // ── Icons ──
  icons: {
    icon: [{ url: "/logo.jpg", type: "image/jpeg" }],
    shortcut: [{ url: "/logo.jpg", type: "image/jpeg" }],
    apple: [{ url: "/logo.jpg", type: "image/jpeg" }],
  },

  // ── Verification (placeholders — fill when ready) ──
  // verification: {
  //   google: "your-google-verification-code",
  // },

  // ── App ──
  applicationName: "VentraPOS",
  category: "Business",
  manifest: "/manifest.webmanifest",

  // ── Other ──
  other: {
    "theme-color": "#003527",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
    "platform-admin-url": ADMIN_URL,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("h-full", "antialiased", plusJakarta.variable, inter.variable, "font-sans", geist.variable)}
    >
      <body className="min-h-full flex flex-col bg-background font-[family-name:var(--font-body)] text-foreground transition-colors">
        <NextTopLoader
          color="#006c49"
          initialPosition={0.08}
          crawlSpeed={200}
          height={3}
          crawl={true}
          showSpinner={false}
          easing="ease"
          speed={200}
          shadow="0 0 10px rgba(0,108,73,0.5),0 0 5px rgba(0,108,73,0.5)"
        />
        <ThemeProvider>{children}</ThemeProvider>
        <PwaInstallBanner />
        <Analytics />
        <SpeedInsights />
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
