import { SiteHeader } from "@/app/components/landing/site-header";
import { SiteFooter } from "@/app/components/landing/site-footer";
import { cookies } from "next/headers";
import { verifyAccessToken } from "@/server/auth/token-service";
import { Metadata } from "next";
import { DownloadMatrix, DownloadPageContent } from "./download-page-content";

export const metadata: Metadata = {
  title: "Download",
  description:
    "Download VentraPOS for Windows, macOS, or Linux — desktop app for your store.",
};

function buildDownloadMatrix(): DownloadMatrix {
  const winX64 =
    process.env.NEXT_PUBLIC_DESKTOP_INSTALLER_URL?.trim() ||
    process.env.NEXT_PUBLIC_WINDOWS_DESKTOP_DOWNLOAD_URL?.trim() ||
    null;
  return {
    windows: {
      x64: winX64,
      x86: process.env.NEXT_PUBLIC_WINDOWS_32_DESKTOP_DOWNLOAD_URL?.trim() || null,
    },
    macos: {
      arm64: process.env.NEXT_PUBLIC_MACOS_ARM64_DESKTOP_DOWNLOAD_URL?.trim() || null,
      intel: process.env.NEXT_PUBLIC_MACOS_X64_DESKTOP_DOWNLOAD_URL?.trim() || null,
    },
    linux: {
      x64: process.env.NEXT_PUBLIC_LINUX_DESKTOP_DOWNLOAD_URL?.trim() || null,
    },
  };
}

export default async function DownloadPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("__ventra_at")?.value;

  let userFirstName = "";
  let isAuthenticated = false;

  if (token) {
    try {
      const payload = await verifyAccessToken(token);
      userFirstName = payload.name;
      isAuthenticated = true;
    } catch {
      // invalid token
    }
  }

  const downloadMatrix = buildDownloadMatrix();

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <SiteHeader isAuthenticated={isAuthenticated} displayName={userFirstName} />
      <main className="flex-1 pt-20">
        <DownloadPageContent downloadMatrix={downloadMatrix} />
      </main>
      <SiteFooter />
    </div>
  );
}
