/*
  Warnings:

  - Added the required column `dni` to the `Escribano` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Escribano" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "matricula" TEXT NOT NULL,
    "dni" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'Activo',
    "condicion" TEXT NOT NULL DEFAULT 'Titular',
    "registroId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Escribano_registroId_fkey" FOREIGN KEY ("registroId") REFERENCES "Registro" ("numero") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Escribano" ("condicion", "createdAt", "estado", "id", "matricula", "nombre", "registroId", "updatedAt") SELECT "condicion", "createdAt", "estado", "id", "matricula", "nombre", "registroId", "updatedAt" FROM "Escribano";
DROP TABLE "Escribano";
ALTER TABLE "new_Escribano" RENAME TO "Escribano";
CREATE UNIQUE INDEX "Escribano_matricula_key" ON "Escribano"("matricula");
CREATE UNIQUE INDEX "Escribano_dni_key" ON "Escribano"("dni");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
