CREATE TYPE "public"."superadmin_status" AS ENUM('active', 'suspended');

CREATE TABLE "superadmins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(320) NOT NULL,
	"email_normalized" varchar(320) NOT NULL,
	"password_hash" text NOT NULL,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100),
	"status" "superadmin_status" DEFAULT 'active' NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "superadmins_email_unique" UNIQUE("email"),
	CONSTRAINT "superadmins_email_normalized_unique" UNIQUE("email_normalized")
);

CREATE INDEX IF NOT EXISTS "superadmins_email_normalized_idx" ON "superadmins" ("email_normalized");

CREATE TABLE "superadmin_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"superadmin_id" uuid REFERENCES "superadmins"("id") ON DELETE SET NULL,
	"action" varchar(100) NOT NULL,
	"resource" varchar(100),
	"resource_id" varchar(255),
	"metadata" jsonb,
	"ip_address" varchar(45),
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "superadmin_audit_logs_superadmin_id_idx" ON "superadmin_audit_logs" ("superadmin_id");
CREATE INDEX IF NOT EXISTS "superadmin_audit_logs_action_idx" ON "superadmin_audit_logs" ("action");
CREATE INDEX IF NOT EXISTS "superadmin_audit_logs_created_at_idx" ON "superadmin_audit_logs" ("created_at");
