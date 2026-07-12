CREATE TABLE "checkout_quotes" (
  "id" uuid PRIMARY KEY NOT NULL,
  "store_id" uuid NOT NULL,
  "subject_id" text NOT NULL,
  "snapshot" jsonb NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "status" text DEFAULT 'OPEN' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sale_idempotency" (
  "id" uuid PRIMARY KEY NOT NULL,
  "store_id" uuid NOT NULL,
  "idempotency_key" text NOT NULL,
  "request_fingerprint" text NOT NULL,
  "status" text NOT NULL,
  "sale_id" uuid,
  "failure_code" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "checkout_quotes" ADD CONSTRAINT "checkout_quotes_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "sale_idempotency" ADD CONSTRAINT "sale_idempotency_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "sale_idempotency" ADD CONSTRAINT "sale_idempotency_sale_id_sales_id_fk" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "sale_idempotency_store_key_unique" ON "sale_idempotency" USING btree ("store_id","idempotency_key");
