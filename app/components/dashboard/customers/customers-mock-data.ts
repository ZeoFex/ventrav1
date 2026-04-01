export type CustomerStatus = "active" | "inactive"

export type CustomerRow = {
    id: string;
    name: string;
    phone: string;
    email?: string;
    status: CustomerStatus;
    createdAt: string;

}

export const MOCK_CUSTOMERS: CustomerRow[] = [
    {
        id: "Cus-1",
        name: "Felix Owusu",
        phone: "0242975483",
        email: "felixo6996@gmail.com",
        status: "active",
        createdAt: "2026-03-13",
    },
    {
        id: "Cus-2",
        name: "Nana Qwarme",
        phone: "0242975483",
        email: "owusu6996@gmail.com",
        status: "active",
        createdAt: "2026-03-13",
    },
    {
        id: "Cus-3",
        name: "owusu qwarme",
        phone: "0242975483",
        email: "felixo6996@gmail.com",
        status: "inactive",
        createdAt: "2026-03-13",
    },
    {
        id: "Cus-4",
        name: "Samuel Mireku",
        phone: "0594589661",
        email: "felixo6996@gmail.com",
        status: "active",
        createdAt: "2026-03-13",
    },
    {
        id: "Cus-5",
        name: "Nambu Judah",
        phone: "0543546383",
        email: "felixo6996@gmail.com",
        status: "active",
        createdAt: "2026-03-13",
    },
];

export function getCustomerById(id: string): CustomerRow | undefined {
    return MOCK_CUSTOMERS.find((c) => c.id === id)
}