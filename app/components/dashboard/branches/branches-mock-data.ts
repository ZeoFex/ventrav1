import { GHANA_REGIONS } from "@/app/components/onboarding/constants";

export type BranchStatus = "active" | "inactive" | "maintenance";

export type BranchData = {
    id: string;
    name: string;
    region: string;
    managerNote: string;
    status: BranchStatus;
    isMain: boolean;
    totalDevices: number;
};

// Creating mock data based directly off the allowed regions from onboarding
export const MOCK_BRANCHES: BranchData[] = [
    {
        id: "br-001",
        name: "East Legon Flagship",
        region: "Greater Accra",
        managerNote: "Kwame (Manager)",
        status: "active",
        isMain: true,
        totalDevices: 4,
    },
    {
        id: "br-002",
        name: "Kumasi Kejetia Kiosk",
        region: "Ashanti",
        managerNote: "Ama - 0244123456",
        status: "active",
        isMain: false,
        totalDevices: 2,
    },
    {
        id: "br-003",
        name: "Takoradi Market Circle",
        region: "Western",
        managerNote: "Kofi Mensah",
        status: "inactive",
        isMain: false,
        totalDevices: 1,
    },
    {
        id: "br-004",
        name: "Tamale Central",
        region: "Northern",
        managerNote: "",
        status: "active",
        isMain: false,
        totalDevices: 3,
    },
];
