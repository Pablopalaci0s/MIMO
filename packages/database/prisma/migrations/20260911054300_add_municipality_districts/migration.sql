-- AlterTable
ALTER TABLE "municipalities" ADD COLUMN     "districts" TEXT[] DEFAULT ARRAY[]::TEXT[];
