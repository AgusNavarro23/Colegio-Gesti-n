-- CreateEnum
CREATE TYPE "TipoRegla" AS ENUM ('INDIVIDUAL', 'COMBINADO', 'EXENTO');

-- CreateTable
CREATE TABLE "ArancelRegla" (
    "id" TEXT NOT NULL,
    "tipo" "TipoRegla" NOT NULL,
    "minimo" DOUBLE PRECISION NOT NULL,
    "maximo" DOUBLE PRECISION NOT NULL,
    "porcentaje1" DOUBLE PRECISION NOT NULL,
    "porcentaje2" DOUBLE PRECISION NOT NULL,
    "porcentaje3" DOUBLE PRECISION NOT NULL,
    "adicional" DOUBLE PRECISION NOT NULL,
    "observaciones" TEXT,
    "arancelId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArancelRegla_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ArancelRegla_arancelId_idx" ON "ArancelRegla"("arancelId");

-- AddForeignKey
ALTER TABLE "ArancelRegla" ADD CONSTRAINT "ArancelRegla_arancelId_fkey" FOREIGN KEY ("arancelId") REFERENCES "Arancel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
