import { SupportView } from "@/app/components/dashboard/support/support-view";
import { getKbCategories, getPopularFaqItems } from "@/server/knowledge-base";

export default async function SupportPage() {
    const faqItems = getPopularFaqItems();
    const categories = getKbCategories();

    return <SupportView faqItems={faqItems} categories={categories} />;
}
