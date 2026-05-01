import { SiteHeader } from "@/app/components/landing/site-header";
import { SiteFooter } from "@/app/components/landing/site-footer";

export default function HelpLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex min-h-screen flex-col bg-background text-foreground">
            <SiteHeader />
            <div className="flex-1">{children}</div>
            <SiteFooter />
        </div>
    );
}
