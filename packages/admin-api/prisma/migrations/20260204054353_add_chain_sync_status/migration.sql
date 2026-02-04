-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('SYNCING', 'SYNCED', 'ERROR', 'STOPPED');

-- CreateTable
CREATE TABLE "chain_sync_status" (
    "id" SERIAL NOT NULL,
    "chain_id" INTEGER NOT NULL,
    "latest_block_number" BIGINT NOT NULL,
    "sync_status" "SyncStatus" NOT NULL DEFAULT 'SYNCING',
    "last_synced_at" TIMESTAMP(3),
    "last_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chain_sync_status_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "chain_sync_status_chain_id_key" ON "chain_sync_status"("chain_id");

-- AddForeignKey
ALTER TABLE "chain_sync_status" ADD CONSTRAINT "chain_sync_status_chain_id_fkey" FOREIGN KEY ("chain_id") REFERENCES "chains"("id") ON DELETE CASCADE ON UPDATE CASCADE;
