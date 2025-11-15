/*
  Warnings:

  - The values [COMPLETED] on the enum `ExecutionStatus` will be removed. If these variants are still used in the database, this will fail.
  - Made the column `workflowId` on table `execution` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ExecutionStatus_new" AS ENUM ('RUNNING', 'SUCCESS', 'FAILED');
ALTER TABLE "public"."execution" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "execution" ALTER COLUMN "status" TYPE "ExecutionStatus_new" USING ("status"::text::"ExecutionStatus_new");
ALTER TYPE "ExecutionStatus" RENAME TO "ExecutionStatus_old";
ALTER TYPE "ExecutionStatus_new" RENAME TO "ExecutionStatus";
DROP TYPE "public"."ExecutionStatus_old";
ALTER TABLE "execution" ALTER COLUMN "status" SET DEFAULT 'RUNNING';
COMMIT;

-- AlterTable
ALTER TABLE "execution" ALTER COLUMN "workflowId" SET NOT NULL;
