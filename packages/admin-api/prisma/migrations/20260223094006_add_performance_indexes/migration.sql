-- CreateIndex
CREATE INDEX "event_subscriptions_status_idx" ON "event_subscriptions"("status");

-- CreateIndex
CREATE INDEX "programs_status_idx" ON "programs"("status");

-- CreateIndex
CREATE INDEX "webhook_logs_webhook_id_created_at_idx" ON "webhook_logs"("webhook_id", "created_at");

-- CreateIndex
CREATE INDEX "webhook_logs_webhook_id_status_created_at_idx" ON "webhook_logs"("webhook_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "webhooks_status_idx" ON "webhooks"("status");
