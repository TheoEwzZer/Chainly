/*
  Warnings:

  - You are about to drop the column `nodeName` on the `execution_step` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `node` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "execution_step_nodeId_idx";

-- AlterTable
ALTER TABLE "execution_step" DROP COLUMN "nodeName";

-- AlterTable
ALTER TABLE "node" DROP COLUMN "name";
