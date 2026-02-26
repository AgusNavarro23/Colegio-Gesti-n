/*
  Warnings:

  - You are about to drop the column `titular` on the `Registro` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Escribano" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "matricula" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'Activo',
    "condicion" TEXT NOT NULL DEFAULT 'Titular',
    "registroId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Escribano_registroId_fkey" FOREIGN KEY ("registroId") REFERENCES "Registro" ("numero") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Escribano" ("condicion", "createdAt", "estado", "id", "matricula", "nombre", "updatedAt") SELECT "condicion", "createdAt", "estado", "id", "matricula", "nombre", "updatedAt" FROM "Escribano";
DROP TABLE "Escribano";
ALTER TABLE "new_Escribano" RENAME TO "Escribano";
CREATE UNIQUE INDEX "Escribano_matricula_key" ON "Escribano"("matricula");
CREATE TABLE "new_Registro" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "numero" TEXT NOT NULL,
    "direccion" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'Activo',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Registro" ("createdAt", "direccion", "estado", "id", "numero", "updatedAt") SELECT "createdAt", "direccion", "estado", "id", "numero", "updatedAt" FROM "Registro";
DROP TABLE "Registro";
ALTER TABLE "new_Registro" RENAME TO "Registro";
CREATE UNIQUE INDEX "Registro_numero_key" ON "Registro"("numero");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
