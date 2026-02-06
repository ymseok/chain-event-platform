/*
  Warnings:

  - You are about to drop the column `status` on the `chains` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "chains" DROP COLUMN "status",
ADD COLUMN     "enabled" BOOLEAN NOT NULL DEFAULT true;
