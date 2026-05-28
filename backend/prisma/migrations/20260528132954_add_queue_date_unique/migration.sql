/*
  Warnings:

  - A unique constraint covering the columns `[doctorId,queueDate,tokenNumber]` on the table `QueueToken` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `queueDate` to the `QueueToken` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "QueueToken" ADD COLUMN     "queueDate" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "QueueToken_doctorId_queueDate_tokenNumber_key" ON "QueueToken"("doctorId", "queueDate", "tokenNumber");
