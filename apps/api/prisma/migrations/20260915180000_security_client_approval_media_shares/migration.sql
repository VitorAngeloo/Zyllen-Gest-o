-- CreateTable
CREATE TABLE "ClientRegistrationRequest" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "cpf" TEXT,
    "phone" TEXT,
    "city" TEXT,
    "state" TEXT,
    "position" TEXT,
    "companyId" TEXT,
    "projectId" TEXT,
    "companyName" TEXT,
    "companyCnpj" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "approvedUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientRegistrationRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaShareLink" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "attachmentId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MediaShareLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ClientRegistrationRequest_email_key" ON "ClientRegistrationRequest"("email");

-- CreateIndex
CREATE INDEX "ClientRegistrationRequest_status_createdAt_idx" ON "ClientRegistrationRequest"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "MediaShareLink_tokenHash_key" ON "MediaShareLink"("tokenHash");

-- CreateIndex
CREATE INDEX "MediaShareLink_kind_attachmentId_idx" ON "MediaShareLink"("kind", "attachmentId");

-- CreateIndex
CREATE INDEX "MediaShareLink_expiresAt_idx" ON "MediaShareLink"("expiresAt");

-- These tables are accessed exclusively through the server-side Prisma connection.
-- No policy grants access to Supabase anonymous/authenticated API roles.
ALTER TABLE "ClientRegistrationRequest" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MediaShareLink" ENABLE ROW LEVEL SECURITY;
