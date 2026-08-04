-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "orderCode" TEXT NOT NULL,
ADD COLUMN     "rejectReason" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Order_orderCode_key" ON "Order"("orderCode");

