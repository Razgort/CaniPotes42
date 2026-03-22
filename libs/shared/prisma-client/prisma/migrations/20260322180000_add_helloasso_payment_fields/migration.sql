-- AlterTable: add helloAssoCheckoutIntentId and paymentDate to Payment
ALTER TABLE "Payment"
  ADD COLUMN "helloAssoCheckoutIntentId" TEXT,
  ADD COLUMN "paymentDate" TIMESTAMP(3);

-- CreateIndex: unique constraint on helloAssoCheckoutIntentId
CREATE UNIQUE INDEX "Payment_helloAssoCheckoutIntentId_key" ON "Payment"("helloAssoCheckoutIntentId");
