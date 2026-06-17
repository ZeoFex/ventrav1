CREATE TYPE "platform_notification_type" AS ENUM (
    'shop_created',
    'shop_onboarded',
    'subscription_past_due',
    'subscription_expiring',
    'product_added',
    'products_bulk_added'
);

CREATE TABLE "platform_notifications" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "type" "platform_notification_type" NOT NULL,
    "title" varchar(255) NOT NULL,
    "body" text NOT NULL,
    "business_id" uuid REFERENCES "businesses"("id") ON DELETE SET NULL,
    "product_id" uuid,
    "metadata" jsonb,
    "is_read" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX "platform_notifications_created_at_idx" ON "platform_notifications" ("created_at" DESC);
CREATE INDEX "platform_notifications_is_read_idx" ON "platform_notifications" ("is_read");
CREATE INDEX "platform_notifications_business_id_idx" ON "platform_notifications" ("business_id");
CREATE INDEX "platform_notifications_type_business_idx" ON "platform_notifications" ("type", "business_id");
