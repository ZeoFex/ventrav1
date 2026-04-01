import { db } from "../server/db";
import { notifications } from "../server/db/schema/notifications";
import { businesses } from "../server/db/schema/businesses";

async function main() {
    // Get the first business
    const businessList = await db.select().from(businesses).limit(1);
    if (!businessList.length) {
        console.log("No business found to attach notification to.");
        process.exit(1);
    }

    const bid = businessList[0].id;

    console.log("Creating test notifications for business:", bid);

    await db.insert(notifications).values([
        {
            businessId: bid,
            title: "Welcome to VentraPOS!",
            body: "Your notifications system is now live and database-backed.",
            icon: "info",
            isRead: false,
        },
        {
            businessId: bid,
            title: "System Update",
            body: "Real-time updates are functioning properly via SWR polling.",
            icon: "settings",
            isRead: false,
        }
    ]);

    console.log("Test notifications created successfully.");
    process.exit(0);
}

main().catch(console.error);
