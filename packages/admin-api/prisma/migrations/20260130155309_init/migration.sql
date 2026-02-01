-- CreateEnum
CREATE TYPE "Status" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'PAUSED');

-- CreateEnum
CREATE TYPE "WebhookLogStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "applications" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "status" "Status" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_keys" (
    "id" UUID NOT NULL,
    "application_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "key_hash" VARCHAR(64) NOT NULL,
    "key_prefix" VARCHAR(8) NOT NULL,
    "expires_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "last_used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chains" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "chain_id" INTEGER NOT NULL,
    "rpc_url" VARCHAR(500) NOT NULL,
    "block_time" INTEGER NOT NULL DEFAULT 12,
    "status" "Status" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chains_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "programs" (
    "id" UUID NOT NULL,
    "application_id" UUID NOT NULL,
    "chain_id" INTEGER NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "contract_address" VARCHAR(42) NOT NULL,
    "abi" JSONB NOT NULL,
    "status" "Status" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "programs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" UUID NOT NULL,
    "program_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "signature" VARCHAR(66) NOT NULL,
    "parameters" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhooks" (
    "id" UUID NOT NULL,
    "application_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "url" VARCHAR(2048) NOT NULL,
    "secret" VARCHAR(64) NOT NULL,
    "headers" JSONB,
    "retry_policy" JSONB NOT NULL DEFAULT '{"maxRetries": 5, "retryInterval": 1000, "backoffMultiplier": 2}',
    "status" "Status" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "webhooks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_subscriptions" (
    "id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "webhook_id" UUID NOT NULL,
    "filter_conditions" JSONB,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_logs" (
    "id" UUID NOT NULL,
    "webhook_id" UUID NOT NULL,
    "event_subscription_id" UUID NOT NULL,
    "event_payload" JSONB NOT NULL,
    "request_payload" JSONB NOT NULL,
    "response_status" INTEGER,
    "response_body" TEXT,
    "response_time_ms" INTEGER,
    "attempt_count" INTEGER NOT NULL DEFAULT 1,
    "status" "WebhookLogStatus" NOT NULL DEFAULT 'PENDING',
    "error_message" TEXT,
    "succeeded_at" TIMESTAMP(3),
    "failed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "applications_user_id_idx" ON "applications"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "api_keys_key_hash_key" ON "api_keys"("key_hash");

-- CreateIndex
CREATE INDEX "api_keys_application_id_idx" ON "api_keys"("application_id");

-- CreateIndex
CREATE INDEX "api_keys_key_hash_idx" ON "api_keys"("key_hash");

-- CreateIndex
CREATE UNIQUE INDEX "chains_name_key" ON "chains"("name");

-- CreateIndex
CREATE UNIQUE INDEX "chains_chain_id_key" ON "chains"("chain_id");

-- CreateIndex
CREATE INDEX "programs_application_id_idx" ON "programs"("application_id");

-- CreateIndex
CREATE INDEX "programs_chain_id_idx" ON "programs"("chain_id");

-- CreateIndex
CREATE UNIQUE INDEX "programs_chain_id_contract_address_key" ON "programs"("chain_id", "contract_address");

-- CreateIndex
CREATE INDEX "events_program_id_idx" ON "events"("program_id");

-- CreateIndex
CREATE INDEX "events_signature_idx" ON "events"("signature");

-- CreateIndex
CREATE UNIQUE INDEX "events_program_id_signature_key" ON "events"("program_id", "signature");

-- CreateIndex
CREATE INDEX "webhooks_application_id_idx" ON "webhooks"("application_id");

-- CreateIndex
CREATE INDEX "event_subscriptions_event_id_idx" ON "event_subscriptions"("event_id");

-- CreateIndex
CREATE INDEX "event_subscriptions_webhook_id_idx" ON "event_subscriptions"("webhook_id");

-- CreateIndex
CREATE UNIQUE INDEX "event_subscriptions_event_id_webhook_id_key" ON "event_subscriptions"("event_id", "webhook_id");

-- CreateIndex
CREATE INDEX "webhook_logs_webhook_id_idx" ON "webhook_logs"("webhook_id");

-- CreateIndex
CREATE INDEX "webhook_logs_event_subscription_id_idx" ON "webhook_logs"("event_subscription_id");

-- CreateIndex
CREATE INDEX "webhook_logs_created_at_idx" ON "webhook_logs"("created_at");

-- CreateIndex
CREATE INDEX "webhook_logs_status_idx" ON "webhook_logs"("status");

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programs" ADD CONSTRAINT "programs_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programs" ADD CONSTRAINT "programs_chain_id_fkey" FOREIGN KEY ("chain_id") REFERENCES "chains"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhooks" ADD CONSTRAINT "webhooks_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_subscriptions" ADD CONSTRAINT "event_subscriptions_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_subscriptions" ADD CONSTRAINT "event_subscriptions_webhook_id_fkey" FOREIGN KEY ("webhook_id") REFERENCES "webhooks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_logs" ADD CONSTRAINT "webhook_logs_webhook_id_fkey" FOREIGN KEY ("webhook_id") REFERENCES "webhooks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_logs" ADD CONSTRAINT "webhook_logs_event_subscription_id_fkey" FOREIGN KEY ("event_subscription_id") REFERENCES "event_subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
