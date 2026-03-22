-- CreateTable
CREATE TABLE "Invitation" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invitation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Invitation_token_key" ON "Invitation"("token");

-- CreateIndex
CREATE INDEX "Invitation_token_idx" ON "Invitation"("token");

-- CreateIndex
CREATE INDEX "Invitation_clubId_idx" ON "Invitation"("clubId");

-- CreateIndex
CREATE UNIQUE INDEX "Invitation_clubId_email_key" ON "Invitation"("clubId", "email");

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;
