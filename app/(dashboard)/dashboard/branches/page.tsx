import { BranchesView } from "@/app/components/dashboard/branches/branches-view";

export const metadata = {
    title: "Branches | VentraPOS",
};

export default function BranchesPage() {
    return (
        <main className="mx-auto flex w-full max-w-[1600px] flex-col px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            <BranchesView />
        </main>
    );
}
