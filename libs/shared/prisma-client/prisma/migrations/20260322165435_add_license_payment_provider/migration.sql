-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('STRIPE', 'HELLOASSO');

-- AlterTable
ALTER TABLE "LicenseType" ADD COLUMN "paymentProvider" "PaymentProvider" NOT NULL,
ADD COLUMN "deletedAt" TIMESTAMP(3);
