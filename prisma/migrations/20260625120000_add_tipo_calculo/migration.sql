-- CreateEnum
CREATE TYPE "TipoCalculo" AS ENUM ('NORMAL', 'PORCENTAJE_SOBRE_TOTAL');

-- AlterTable: Add tipo_calculo to Arancel
ALTER TABLE "Arancel" ADD COLUMN "tipoCalculo" "TipoCalculo" NOT NULL DEFAULT 'NORMAL';

-- AlterTable: Add tipo_calculo to ArancelRegla
ALTER TABLE "ArancelRegla" ADD COLUMN "tipoCalculo" "TipoCalculo" NOT NULL DEFAULT 'NORMAL';
