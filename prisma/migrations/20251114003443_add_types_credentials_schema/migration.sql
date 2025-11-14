/*
  Warnings:

  - Added the required column `type` to the `credential` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "credential" ADD COLUMN     "type" "CredentialType" NOT NULL;
