export type SatffStatus = "active" | "inactive";

export type staffRole = string;


export type BranchRow = {
  id: string;
  name: string;
  location?: string;
  staffCount: number


}

export const MOCK_BRANCHES: BranchRow[] = [
  { id: "br-kasoa-main", name: "Kasoa Main", location: "Kasoa", staffCount: 4 },
  { id: "br-accra", name: "Accra Central", location: "Accra", staffCount: 2 },
  { id: "br-kumasi", name: "Kumasi Branch", location: "Kumasi", staffCount: 1 },
]

export type StaffRow = {
  id: string;
  name: string;
  initials: string;
  branchId: string;
  role: staffRole;
  phone: string;
  status: SatffStatus;
  imageSrc?: string;



}


export const MOCK_STAFF: StaffRow[] = [
  {
    id: "st-1",
    name: "Abena Boateng",
    initials: "AB",
    branchId: "br-kasoa-main",
    role: "Cashier",
    phone: "+233 24 567 8901",
    status: "active",
    imageSrc:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&h=200&fit=crop&q=80",
  },
  {
    id: "st-2",
    name: "Kofi Asante",
    initials: "KA",
    branchId: "br-kasoa-main",
    role: "Stock Officer",
    phone: "+233 20 234 5678",
    status: "active",
    imageSrc:
      "https://images.unsplash.com/photo-1502767089025-6572583495b0?w=200&h=200&fit=crop&q=80",
  },
  {
    id: "st-3",
    name: "Ama Sarpong",
    initials: "AS",
    branchId: "br-kasoa-main",
    role: "Branch Manager",
    phone: "+233 27 890 1234",
    status: "active",
    imageSrc:
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=200&h=200&fit=crop&q=80",
  },
  {
    id: "st-4",
    name: "Yaw Darko",
    initials: "YD",
    branchId: "br-kasoa-main",
    role: "Finance Officer",
    phone: "+233 54 321 9876",
    status: "inactive",
    imageSrc:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop&q=80",
  },
  {
    id: "st-5",
    name: "owusu ansah",
    initials: "YD",
    branchId: "br-kasoa-main",
    role: "Finance Officer",
    phone: "+233 54 321 9876",
    status: "inactive",
    imageSrc:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop&q=80",
  },

];


export function getStaffById(id: string): StaffRow | undefined {
  return MOCK_STAFF.find((s) => s.id == id)
}

export function branchNameById(id: string): string {
  return MOCK_BRANCHES.find((d) => d.id == id)?.name ?? "-"
}