-- CreateEnum
CREATE TYPE "AppRole" AS ENUM ('OWNER', 'MEMBER', 'GUEST');

-- CreateEnum
CREATE TYPE "InviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "is_root" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "application_members" (
    "id" UUID NOT NULL,
    "application_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "AppRole" NOT NULL DEFAULT 'MEMBER',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "application_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_invites" (
    "id" UUID NOT NULL,
    "application_id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "role" "AppRole" NOT NULL DEFAULT 'MEMBER',
    "status" "InviteStatus" NOT NULL DEFAULT 'PENDING',
    "invited_by" UUID NOT NULL,
    "token" VARCHAR(64) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "application_invites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "application_members_application_id_idx" ON "application_members"("application_id");

-- CreateIndex
CREATE INDEX "application_members_user_id_idx" ON "application_members"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "application_members_application_id_user_id_key" ON "application_members"("application_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "application_invites_token_key" ON "application_invites"("token");

-- CreateIndex
CREATE INDEX "application_invites_application_id_idx" ON "application_invites"("application_id");

-- CreateIndex
CREATE INDEX "application_invites_email_idx" ON "application_invites"("email");

-- CreateIndex
CREATE INDEX "application_invites_token_idx" ON "application_invites"("token");

-- AddForeignKey
ALTER TABLE "application_members" ADD CONSTRAINT "application_members_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_members" ADD CONSTRAINT "application_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_invites" ADD CONSTRAINT "application_invites_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_invites" ADD CONSTRAINT "application_invites_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
